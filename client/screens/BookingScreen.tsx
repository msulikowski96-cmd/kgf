import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { TabScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { TeslaCar } from "@/components/TeslaCar";
import { RideMap } from "@/components/map/RideMap";
import type { MapMarker } from "@/components/map/mapTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useBookingDraft } from "@/contexts/BookingDraftContext";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  FLEET,
  PAYMENT_METHODS,
  getVehicle,
  type PaymentMethod,
  type Place,
  type VehicleId,
} from "@shared/fleet";
import { isValidPhone, formatPhone } from "@shared/phone";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import {
  formatDistance,
  formatDuration,
  formatPrice,
  priceSummary,
} from "@/lib/format";
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
  const draft = useBookingDraft();
  const { pickup, destination } = draft;
  const { location } = useUserLocation();

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

  const vehicle = getVehicle(vehicleId)!;
  const slots = useMemo(
    () => (days[dayIndex] ? slotsForDay(days[dayIndex]) : []),
    [days, dayIndex],
  );

  // Start from where the user is, like any ride app
  const autoPickupDone = useRef(false);
  useEffect(() => {
    if (!location || pickup || autoPickupDone.current) return;
    autoPickupDone.current = true;
    api
      .reverseGeocode(location)
      .then((place) => draft.setPickup({ ...place, name: place.name }))
      .catch(() => {});
  }, [location, pickup, draft]);

  const estimate = useQuery({
    queryKey: [
      "estimate",
      pickup?.lat,
      pickup?.lng,
      destination?.lat,
      destination?.lng,
    ],
    queryFn: () =>
      api.getEstimate({ pickup: pickup!, destination: destination! }),
    enabled: !!pickup && !!destination,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const price = estimate.data?.prices[vehicleId];

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
      queryClient.setQueryData(queryKeys.ride(ride.id), ride);
      draft.setDestination(null);
      setNotes("");
      setWhen("now");
      mutation.reset();
      navigation.navigate("RideDetails", { id: ride.id });
    },
    onError: () => errorFeedback(),
  });

  const openSearch = (field: "pickup" | "destination") => {
    setErrors((e) => ({ ...e, [field]: undefined }));
    navigation.navigate("PlaceSearch", { field });
  };

  const submit = () => {
    const e: Errors = {};
    if (!pickup) e.pickup = "Wybierz miejsce odbioru";
    if (!destination) e.destination = "Wybierz cel podróży";
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
    if (Object.keys(e).length > 0 || !pickup || !destination) {
      errorFeedback();
      return;
    }

    mutation.mutate({
      pickupAddress: placeLabel(pickup),
      destinationAddress: placeLabel(destination),
      pickup: { lat: pickup.lat, lng: pickup.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      scheduledAt: when === "later" ? slot : null,
      vehicleModel: vehicleId,
      passengers,
      contactName: contactName.trim(),
      contactPhone,
      notes: notes.trim() || undefined,
      paymentMethod: payment,
    });
  };

  const mapMarkers = useMemo(() => {
    const list: MapMarker[] = [];
    if (pickup) list.push({ id: "pickup", kind: "pickup", ...latLng(pickup) });
    if (destination)
      list.push({
        id: "destination",
        kind: "destination",
        ...latLng(destination),
      });
    return list;
  }, [pickup, destination]);
  const fitPoints = useMemo(
    () => [pickup, destination].filter((p): p is Place => !!p),
    [pickup, destination],
  );

  return (
    <TabScreenScrollView>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Section title="Trasa">
          <View
            style={[
              styles.routeCard,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor:
                  errors.pickup || errors.destination
                    ? theme.error
                    : theme.border,
              },
            ]}
          >
            <View style={styles.routeDots}>
              <View style={[styles.dotCircle, { borderColor: theme.text }]} />
              <View
                style={[
                  styles.dotLine,
                  { backgroundColor: theme.borderStrong },
                ]}
              />
              <View
                style={[styles.dotSquare, { backgroundColor: theme.text }]}
              />
            </View>
            <View style={styles.flex}>
              <PlaceButton
                label="Odbiór"
                place={pickup}
                placeholder="Skąd jedziemy?"
                onPress={() => openSearch("pickup")}
                testID="booking-pickup"
              />
              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />
              <PlaceButton
                label="Cel"
                place={destination}
                placeholder="Dokąd jedziemy?"
                onPress={() => openSearch("destination")}
                testID="booking-destination"
              />
            </View>
            <Pressable
              onPress={() => {
                tapFeedback();
                draft.swap();
              }}
              style={[
                styles.swap,
                { backgroundColor: theme.backgroundTertiary },
              ]}
              accessibilityLabel="Zamień odbiór i cel"
              hitSlop={8}
            >
              <Feather name="repeat" size={16} color={theme.text} />
            </Pressable>
          </View>
          {errors.pickup || errors.destination ? (
            <ThemedText type="caption" style={{ color: theme.error }}>
              {errors.pickup ?? errors.destination}
            </ThemedText>
          ) : null}

          {pickup || destination ? (
            <View style={[styles.mapBox, { borderColor: theme.border }]}>
              <RideMap
                style={styles.map}
                initialCenter={pickup ?? destination ?? undefined}
                markers={mapMarkers}
                route={estimate.data?.route}
                fitPoints={fitPoints}
                fitKey={fitPoints.map((p) => `${p.lat},${p.lng}`).join("|")}
                testID="booking-map"
              />
              {estimate.data ? (
                <View
                  style={[
                    styles.routeInfo,
                    { backgroundColor: theme.backgroundRoot },
                  ]}
                >
                  <Feather name="navigation" size={12} color={theme.text} />
                  <ThemedText type="caption" testID="booking-distance">
                    {formatDistance(estimate.data.distanceKm)} · ok.{" "}
                    {formatDuration(estimate.data.durationMin)}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
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
                testID={`booking-when-${mode}`}
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
                  {mode === "now" ? "Teraz" : "Zarezerwuj termin"}
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
              <ThemedText type="small" color="secondary">
                Kierowca przyjmie rezerwację wcześniej i przyjedzie na wybraną
                godzinę.
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" color="secondary" style={styles.hint}>
              Najbliższy wolny kierowca przyjedzie najszybciej, jak to możliwe.
            </ThemedText>
          )}
        </Section>

        <Section title="Wybierz auto">
          {FLEET.map((v) => {
            const selected = v.id === vehicleId;
            const vPrice = estimate.data?.prices[v.id];
            const eta = estimate.data?.pickupEtaMin[v.id];
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
                    numberOfLines={1}
                  >
                    {estimate.data && when === "now"
                      ? eta != null
                        ? `Kierowca za ${eta} min`
                        : "Brak wolnych aut w pobliżu"
                      : v.description}
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
                  {vPrice != null ? (
                    <ThemedText style={styles.bold} testID={`price-${v.id}`}>
                      {formatPrice(vPrice)}
                    </ThemedText>
                  ) : (
                    <>
                      <ThemedText type="small" style={styles.bold}>
                        od {formatPrice(v.minimumFare)}
                      </ThemedText>
                      <ThemedText type="caption" color="tertiary">
                        {formatPrice(v.perKm)}/km
                      </ThemedText>
                    </>
                  )}
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
            hint="Kierowca zadzwoni na ten numer, jeśli nie będzie mógł Cię znaleźć"
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
              {estimate.data
                ? ` · ${formatDistance(estimate.data.distanceKm)}`
                : ""}
            </ThemedText>
            <ThemedText type="h3" testID="booking-total">
              {price != null ? formatPrice(price) : priceSummary(vehicle)}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="caption" color="tertiary" style={styles.priceNote}>
          {price != null
            ? `Cena szacunkowa: opłata startowa ${formatPrice(vehicle.baseFare)} + ${formatPrice(vehicle.perKm)} za km${estimate.data?.exact === false ? " (odległość przybliżona)" : ""}. Płacisz kierowcy po przejeździe.`
            : "Wybierz odbiór i cel, aby zobaczyć cenę przejazdu."}
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
          title={
            when === "later"
              ? `Zarezerwuj${price != null ? ` · ${formatPrice(price)}` : ""}`
              : `Zamów teraz${price != null ? ` · ${formatPrice(price)}` : ""}`
          }
          icon="navigation"
          onPress={submit}
          loading={mutation.isPending}
          testID="booking-submit"
        />
      </Animated.View>
    </TabScreenScrollView>
  );
}

function latLng(p: Place) {
  return { lat: p.lat, lng: p.lng };
}

function placeLabel(p: Place) {
  return p.address && !p.address.startsWith(p.name)
    ? `${p.name}, ${p.address}`
    : p.address || p.name;
}

function PlaceButton({
  label,
  place,
  placeholder,
  onPress,
  testID,
}: {
  label: string;
  place: Place | null;
  placeholder: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={styles.placeButton}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${place?.name ?? placeholder}`}
      testID={testID}
    >
      <ThemedText type="caption" color="tertiary">
        {label}
      </ThemedText>
      <ThemedText
        numberOfLines={1}
        color={place ? "primary" : "secondary"}
        style={place ? styles.bold : undefined}
      >
        {place?.name ?? placeholder}
      </ThemedText>
      {place?.address && place.address !== place.name ? (
        <ThemedText type="caption" color="secondary" numberOfLines={1}>
          {place.address}
        </ThemedText>
      ) : null}
    </Pressable>
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
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    marginBottom: Spacing.sm,
  },
  routeDots: { alignItems: "center", marginRight: Spacing.md },
  dotCircle: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  dotLine: { width: 2, height: 34, marginVertical: 3 },
  dotSquare: { width: 9, height: 9 },
  placeButton: {
    paddingVertical: Spacing.sm,
    minHeight: 52,
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth },
  swap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  mapBox: {
    height: 220,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  map: { flex: 1 },
  routeInfo: {
    position: "absolute",
    left: Spacing.sm,
    top: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
});
