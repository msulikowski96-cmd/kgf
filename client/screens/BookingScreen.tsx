import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { TabScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { TeslaCar } from "@/components/TeslaCar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  FLEET,
  PAYMENT_METHODS,
  getVehicle,
  type PaymentMethod,
  type VehicleId,
} from "@shared/fleet";
import { isValidPhone, formatPhone } from "@shared/phone";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatPrice, formatRideTime, priceSummary } from "@/lib/format";
import { carColor, carVariant } from "@/lib/vehicleStyle";
import { errorFeedback, successFeedback, tapFeedback } from "@/lib/feedback";
import type { BookingStackParamList } from "@/navigation/types";

const SLOT_MINUTES = 15;
const MIN_LEAD_MINUTES = 30;
const DAYS_AHEAD = 7;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// 15-minute pickup slots for a day, at least 30 minutes from now
function slotsForDay(day: Date): Date[] {
  const earliest = Date.now() + MIN_LEAD_MINUTES * 60_000;
  const slots: Date[] = [];
  for (let m = 0; m < 24 * 60; m += SLOT_MINUTES) {
    const slot = new Date(day.getTime() + m * 60_000);
    if (slot.getTime() >= earliest) slots.push(slot);
  }
  return slots;
}

function buildDays(): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  }).filter((d) => slotsForDay(d).length > 0);
}

function dayLabel(d: Date) {
  const diffDays = Math.round(
    (d.getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Dziś";
  if (diffDays === 1) return "Jutro";
  return d.toLocaleDateString("pl-PL", { weekday: "short" });
}

type Errors = Partial<
  Record<
    "pickup" | "destination" | "contactName" | "contactPhone" | "time",
    string
  >
>;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="label" color="tertiary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Chip({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
        selected && {
          backgroundColor: theme.primary,
          borderColor: theme.primary,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={[styles.chipLabel, selected && { color: theme.buttonText }]}
      >
        {label}
      </ThemedText>
      {sublabel ? (
        <ThemedText
          type="caption"
          color="secondary"
          style={selected && { color: theme.buttonText }}
        >
          {sublabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

export default function BookingScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<BookingStackParamList, "Booking">>();
  const queryClient = useQueryClient();

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [days, setDays] = useState(buildDays);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<VehicleId>(
    route.params?.vehicle ?? "model3",
  );
  const [passengers, setPassengers] = useState(1);
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [errors, setErrors] = useState<Errors>({});
  const [createdRide, setCreatedRide] = useState<api.RideDto | null>(null);

  const vehicle = getVehicle(vehicleId)!;
  const slots = useMemo(
    () => (days[dayIndex] ? slotsForDay(days[dayIndex]) : []),
    [days, dayIndex],
  );

  // Preselect the model chosen on the home screen
  useEffect(() => {
    if (route.params?.vehicle) setVehicleId(route.params.vehicle);
  }, [route.params?.vehicle]);

  // Prefill contact details from the account
  useEffect(() => {
    if (!user) return;
    setContactName(
      (v) => v || [user.firstName, user.lastName].filter(Boolean).join(" "),
    );
    setContactPhone((v) => v || (user.phone ? formatPhone(user.phone) : ""));
  }, [user]);

  // Keep the passenger count within the selected car's capacity
  useEffect(() => {
    setPassengers((p) => Math.min(p, vehicle.seats));
  }, [vehicle.seats]);

  // Pick the first free slot when the day changes or the current slot is gone
  useEffect(() => {
    if (!slots.some((s) => s.toISOString() === slot))
      setSlot(slots[0]?.toISOString() ?? null);
  }, [slots, slot]);

  const mutation = useMutation({
    mutationFn: api.createRide,
    onSuccess: (ride) => {
      successFeedback();
      queryClient.invalidateQueries({ queryKey: queryKeys.rides });
      setCreatedRide(ride);
    },
    onError: () => errorFeedback(),
  });

  const submit = () => {
    const e: Errors = {};
    if (pickup.trim().length < 3) e.pickup = "Podaj miejsce odbioru";
    if (destination.trim().length < 3) e.destination = "Podaj cel podróży";
    if (contactName.trim().length < 2)
      e.contactName = "Podaj imię osoby kontaktowej";
    if (!isValidPhone(contactPhone))
      e.contactPhone = "Podaj poprawny numer telefonu";
    if (when === "later" && (!slot || new Date(slot).getTime() < Date.now())) {
      e.time = "Wybierz godzinę odbioru";
      setDays(buildDays());
      setDayIndex(0);
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      errorFeedback();
      return;
    }

    mutation.mutate({
      pickupAddress: pickup.trim(),
      destinationAddress: destination.trim(),
      scheduledAt: when === "later" ? slot : null,
      vehicleModel: vehicleId,
      passengers,
      contactName: contactName.trim(),
      contactPhone,
      notes: notes.trim() || undefined,
      paymentMethod: payment,
    });
  };

  const reset = () => {
    setCreatedRide(null);
    setPickup("");
    setDestination("");
    setNotes("");
    setWhen("now");
    setDays(buildDays());
    setDayIndex(0);
    mutation.reset();
  };

  if (createdRide) {
    const v = getVehicle(createdRide.vehicleModel)!;
    return (
      <TabScreenScrollView contentContainerStyle={styles.success}>
        <Animated.View
          entering={ZoomIn.duration(400)}
          style={[styles.successIcon, { backgroundColor: theme.success }]}
        >
          <Feather name="check" size={40} color={theme.buttonText} />
        </Animated.View>
        <ThemedText type="h2" style={styles.center}>
          Zamówienie przyjęte
        </ThemedText>
        <ThemedText
          color="secondary"
          style={[styles.center, styles.successText]}
        >
          Dyspozytor potwierdzi przejazd w ciągu kilku minut. Kierowca zadzwoni
          na numer {formatPhone(createdRide.contactPhone)}.
        </ThemedText>

        <View
          style={[
            styles.summary,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <TeslaCar
            width={220}
            color={carColor(v.id)}
            variant={carVariant(v.id)}
          />
          <ThemedText type="h4" style={styles.summaryTitle}>
            {v.name}
          </ThemedText>
          <SummaryRow
            icon="clock"
            text={formatRideTime(createdRide.scheduledAt)}
          />
          <SummaryRow icon="circle" text={createdRide.pickupAddress} />
          <SummaryRow icon="square" text={createdRide.destinationAddress} />
          <SummaryRow
            icon="credit-card"
            text={PAYMENT_METHODS[createdRide.paymentMethod]}
          />
        </View>

        <Button
          title="Zobacz szczegóły"
          onPress={() =>
            navigation.navigate("RideDetails", { id: createdRide.id })
          }
          style={styles.fullWidth}
        />
        <Button
          title="Nowe zamówienie"
          variant="ghost"
          onPress={reset}
          style={[styles.fullWidth, styles.gapTop]}
        />
      </TabScreenScrollView>
    );
  }

  return (
    <TabScreenScrollView>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Section title="Trasa">
          <TextField
            icon="circle"
            placeholder="Miejsce odbioru, np. ul. Półwiejska 2, Poznań"
            value={pickup}
            onChangeText={(t) => {
              setPickup(t);
              setErrors((e) => ({ ...e, pickup: undefined }));
            }}
            error={errors.pickup}
            testID="booking-pickup"
          />
          <TextField
            icon="square"
            placeholder="Dokąd jedziemy? np. Lotnisko Ławica"
            value={destination}
            onChangeText={(t) => {
              setDestination(t);
              setErrors((e) => ({ ...e, destination: undefined }));
            }}
            error={errors.destination}
            testID="booking-destination"
          />
        </Section>

        <Section title="Kiedy">
          <View
            style={[
              styles.segment,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            {(["now", "later"] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => {
                  tapFeedback();
                  setWhen(mode);
                  if (mode === "later") {
                    setDays(buildDays());
                    setDayIndex(0);
                  }
                }}
                style={[
                  styles.segmentItem,
                  when === mode && {
                    backgroundColor: theme.backgroundTertiary,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: when === mode }}
              >
                <Feather
                  name={mode === "now" ? "zap" : "calendar"}
                  size={15}
                  color={when === mode ? theme.text : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  color={when === mode ? "primary" : "secondary"}
                  style={styles.bold}
                >
                  {mode === "now" ? "Teraz" : "Zaplanuj"}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {when === "later" ? (
            <View style={styles.schedule}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {days.map((d, i) => (
                  <Chip
                    key={d.toISOString()}
                    label={dayLabel(d)}
                    sublabel={d.toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short",
                    })}
                    selected={i === dayIndex}
                    onPress={() => setDayIndex(i)}
                  />
                ))}
              </ScrollView>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {slots.map((s) => (
                  <Chip
                    key={s.toISOString()}
                    label={s.toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    selected={s.toISOString() === slot}
                    onPress={() => {
                      setSlot(s.toISOString());
                      setErrors((e) => ({ ...e, time: undefined }));
                    }}
                  />
                ))}
              </ScrollView>
              {errors.time ? (
                <ThemedText type="caption" style={{ color: theme.error }}>
                  {errors.time}
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <ThemedText type="small" color="secondary" style={styles.hint}>
              Najbliższa wolna Tesla przyjedzie najszybciej, jak to możliwe.
            </ThemedText>
          )}
        </Section>

        <Section title="Wybierz Teslę">
          {FLEET.map((v) => {
            const selected = v.id === vehicleId;
            return (
              <Pressable
                key={v.id}
                onPress={() => {
                  tapFeedback();
                  setVehicleId(v.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.vehicle,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                  selected && {
                    borderColor: theme.text,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
                testID={`vehicle-${v.id}`}
              >
                <View style={styles.vehicleCar}>
                  <TeslaCar
                    width={96}
                    color={carColor(v.id)}
                    variant={carVariant(v.id)}
                  />
                </View>
                <View style={styles.vehicleInfo}>
                  <View style={styles.vehicleNameRow}>
                    <ThemedText style={styles.bold}>
                      {v.name.replace("Tesla ", "")}
                    </ThemedText>
                    <ThemedText type="caption" color="accent">
                      {v.tier}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    color="secondary"
                    numberOfLines={2}
                  >
                    {v.description}
                  </ThemedText>
                  <View style={styles.vehicleMeta}>
                    <Feather
                      name="users"
                      size={12}
                      color={theme.textTertiary}
                    />
                    <ThemedText type="caption" color="tertiary">
                      {v.seats}
                    </ThemedText>
                    <Feather
                      name="briefcase"
                      size={12}
                      color={theme.textTertiary}
                      style={styles.metaGap}
                    />
                    <ThemedText type="caption" color="tertiary">
                      {v.luggage}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.vehiclePrice}>
                  <ThemedText type="small" style={styles.bold}>
                    od {formatPrice(v.minimumFare)}
                  </ThemedText>
                  <ThemedText type="caption" color="tertiary">
                    {formatPrice(v.perKm)}/km
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Pasażerowie">
          <View
            style={[
              styles.stepper,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText style={styles.flex}>Liczba osób</ThemedText>
            <Pressable
              onPress={() => setPassengers((p) => Math.max(1, p - 1))}
              disabled={passengers <= 1}
              style={[
                styles.stepButton,
                {
                  backgroundColor: theme.backgroundTertiary,
                  opacity: passengers <= 1 ? 0.4 : 1,
                },
              ]}
              accessibilityLabel="Mniej pasażerów"
            >
              <Feather name="minus" size={18} color={theme.text} />
            </Pressable>
            <ThemedText type="h4" style={styles.stepValue}>
              {passengers}
            </ThemedText>
            <Pressable
              onPress={() =>
                setPassengers((p) => Math.min(vehicle.seats, p + 1))
              }
              disabled={passengers >= vehicle.seats}
              style={[
                styles.stepButton,
                {
                  backgroundColor: theme.backgroundTertiary,
                  opacity: passengers >= vehicle.seats ? 0.4 : 1,
                },
              ]}
              accessibilityLabel="Więcej pasażerów"
            >
              <Feather name="plus" size={18} color={theme.text} />
            </Pressable>
          </View>
          <TextField
            placeholder="Uwagi dla kierowcy (np. fotelik dla dziecka, numer lotu)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            style={styles.notes}
          />
        </Section>

        <Section title="Dane kontaktowe">
          <TextField
            icon="user"
            label="Osoba kontaktowa"
            value={contactName}
            onChangeText={(t) => {
              setContactName(t);
              setErrors((e) => ({ ...e, contactName: undefined }));
            }}
            error={errors.contactName}
          />
          <TextField
            icon="phone"
            label="Telefon"
            value={contactPhone}
            onChangeText={(t) => {
              setContactPhone(t);
              setErrors((e) => ({ ...e, contactPhone: undefined }));
            }}
            keyboardType="phone-pad"
            error={errors.contactPhone}
            hint="Kierowca zadzwoni na ten numer przed przyjazdem"
          />
        </Section>

        <Section title="Płatność">
          <View style={styles.chipsRow}>
            {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => (
              <Chip
                key={m}
                label={PAYMENT_METHODS[m]}
                selected={payment === m}
                onPress={() => setPayment(m)}
              />
            ))}
          </View>
        </Section>

        <View style={[styles.total, { borderColor: theme.border }]}>
          <View style={styles.flex}>
            <ThemedText type="small" color="secondary">
              {vehicle.name}
            </ThemedText>
            <ThemedText type="h4">{priceSummary(vehicle)}</ThemedText>
          </View>
        </View>
        <ThemedText type="caption" color="tertiary" style={styles.priceNote}>
          Opłata startowa {formatPrice(vehicle.baseFare)} +{" "}
          {formatPrice(vehicle.perKm)} za km. Dyspozytor potwierdzi dokładną
          cenę przy potwierdzeniu przejazdu.
        </ThemedText>

        {mutation.error ? (
          <View
            style={[styles.serverError, { backgroundColor: theme.accentSoft }]}
          >
            <Feather name="alert-circle" size={16} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error, flex: 1 }}>
              {mutation.error.message}
            </ThemedText>
          </View>
        ) : null}

        <Button
          title={`Zamów ${vehicle.name.replace("Tesla ", "Teslę ")}`}
          icon="navigation"
          onPress={submit}
          loading={mutation.isPending}
          testID="booking-submit"
        />
      </Animated.View>
    </TabScreenScrollView>
  );
}

function SummaryRow({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Feather name={icon} size={14} color={theme.textSecondary} />
      <ThemedText style={styles.flex}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: "600" },
  center: { textAlign: "center" },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  hint: { marginTop: Spacing.md },
  segment: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  schedule: { marginTop: Spacing.md, gap: Spacing.md },
  chips: { gap: Spacing.sm },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 64,
  },
  chipLabel: { fontWeight: "600" },
  vehicle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  vehicleCar: { width: 96, alignItems: "center" },
  vehicleInfo: { flex: 1, marginHorizontal: Spacing.md, gap: 2 },
  vehicleNameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  vehicleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaGap: { marginLeft: Spacing.sm },
  vehiclePrice: { alignItems: "flex-end" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { width: 40, textAlign: "center" },
  notes: { minHeight: 72 },
  total: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: Spacing.lg,
  },
  priceNote: { marginTop: Spacing.xs, marginBottom: Spacing.lg },
  serverError: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  success: { alignItems: "center" },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  successText: { marginTop: Spacing.sm, marginBottom: Spacing.xl },
  summary: {
    width: "100%",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  summaryTitle: { marginTop: Spacing.md, marginBottom: Spacing.md },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    alignSelf: "stretch",
    paddingVertical: Spacing.xs,
  },
  fullWidth: { alignSelf: "stretch" },
  gapTop: { marginTop: Spacing.md },
});
