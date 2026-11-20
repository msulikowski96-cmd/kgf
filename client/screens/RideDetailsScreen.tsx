import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
} from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { StatusBadge } from "@/components/StatusBadge";
import { TeslaCar } from "@/components/TeslaCar";
import { RideMap } from "@/components/map/RideMap";
import type { MapMarker } from "@/components/map/mapTypes";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { COMPANY } from "@/constants/company";
import {
  ACTIVE_STATUSES,
  CANCELLABLE_STATUSES,
  PAYMENT_METHODS,
  getVehicle,
  type LatLng,
} from "@shared/fleet";
import { formatPhone } from "@shared/phone";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatPrice,
  formatRideTime,
  plural,
  rideHeadline,
} from "@/lib/format";
import { carColor, carVariant } from "@/lib/vehicleStyle";
import {
  confirmAction,
  showMessage,
  successFeedback,
  tapFeedback,
} from "@/lib/feedback";
import type { RootStackParamList } from "@/navigation/types";

function subline(ride: api.RideDto): string {
  switch (ride.status) {
    case "pending":
      return ride.scheduledAt
        ? `Rezerwacja na ${formatRideTime(ride.scheduledAt).toLowerCase()}. Damy znać, gdy kierowca ją przyjmie.`
        : "Wysłaliśmy zlecenie do kierowców w pobliżu. Zwykle trwa to chwilę.";
    case "confirmed":
      return `Odbiór ${formatRideTime(ride.scheduledAt).toLowerCase()}. Kierowca wyruszy tak, by być na czas.`;
    case "en_route":
      return "Śledź auto na mapie. Kierowca zadzwoni, jeśli nie będzie mógł Cię znaleźć.";
    case "arrived":
      return "Wyjdź do auta – sprawdź numer rejestracyjny.";
    case "in_progress":
      return "Miłej podróży!";
    case "completed":
      return "Dziękujemy za wspólną podróż.";
    default:
      return "Ten przejazd został anulowany.";
  }
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Feather
        name={icon}
        size={16}
        color={theme.textSecondary}
        style={styles.rowIcon}
      />
      <View style={styles.flex}>
        <ThemedText type="caption" color="tertiary">
          {label}
        </ThemedText>
        <ThemedText>{value}</ThemedText>
      </View>
    </View>
  );
}

function DriverCard({
  driver,
}: {
  driver: NonNullable<api.RideDto["driver"]>;
}) {
  const { theme } = useTheme();
  const vehicle = getVehicle(driver.vehicleModel);
  return (
    <View
      style={[
        styles.driverCard,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
      testID="driver-card"
    >
      <View style={styles.driverTop}>
        <View
          style={[styles.avatar, { backgroundColor: theme.backgroundTertiary }]}
        >
          <ThemedText type="h4">{driver.firstName.charAt(0)}</ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="h4">{driver.firstName}</ThemedText>
          <View style={styles.ratingRow}>
            <Feather name="star" size={12} color={theme.warning} />
            <ThemedText type="caption" color="secondary">
              {driver.rating != null
                ? `${driver.rating.toFixed(1).replace(".", ",")} · ${plural(driver.ratingCount, "ocena", "oceny", "ocen")}`
                : "Nowy kierowca"}
            </ThemedText>
          </View>
        </View>
        {driver.phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${driver.phone}`)}
            style={[styles.callBtn, { backgroundColor: theme.primary }]}
            accessibilityLabel={`Zadzwoń do kierowcy ${driver.firstName}`}
            testID="driver-call"
          >
            <Feather name="phone" size={18} color={theme.buttonText} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.driverCar}>
        {vehicle ? (
          <TeslaCar
            width={84}
            color={carColor(vehicle.id)}
            variant={carVariant(vehicle.id)}
          />
        ) : null}
        <View style={styles.flex}>
          <ThemedText type="small" style={styles.bold}>
            {vehicle?.name}
          </ThemedText>
          <ThemedText type="caption" color="secondary">
            Kolor: {driver.carColor.toLowerCase()}
          </ThemedText>
        </View>
        <View style={[styles.plate, { borderColor: theme.text }]}>
          <ThemedText style={styles.plateText} testID="driver-plate">
            {driver.plate}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function RateRide({ ride }: { ride: api.RideDto }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const rate = useMutation({
    mutationFn: () =>
      api.rateRide(ride.id, { rating, comment: comment.trim() || undefined }),
    onSuccess: (updated) => {
      successFeedback();
      queryClient.setQueryData(queryKeys.ride(ride.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.rides });
    },
    onError: (err) => showMessage("Nie udało się wysłać oceny", err.message),
  });

  if (ride.rating) {
    return (
      <View style={styles.rated}>
        <ThemedText type="small" color="secondary">
          Twoja ocena
        </ThemedText>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Feather
              key={n}
              name="star"
              size={20}
              color={n <= ride.rating! ? theme.warning : theme.borderStrong}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.rateBox,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
    >
      <ThemedText type="h4">Jak minęła podróż?</ThemedText>
      <ThemedText type="small" color="secondary">
        Oceń kierowcę {ride.driver?.firstName}
      </ThemedText>
      <View style={styles.starsBig}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              tapFeedback();
              setRating(n);
            }}
            hitSlop={6}
            accessibilityLabel={`${n} na 5`}
            testID={`rate-${n}`}
          >
            <Feather
              name="star"
              size={34}
              color={n <= rating ? theme.warning : theme.borderStrong}
            />
          </Pressable>
        ))}
      </View>
      {rating > 0 ? (
        <>
          <TextField
            placeholder="Komentarz (opcjonalnie)"
            value={comment}
            onChangeText={setComment}
            maxLength={300}
          />
          <Button
            title="Wyślij ocenę"
            onPress={() => rate.mutate()}
            loading={rate.isPending}
            testID="rate-submit"
          />
        </>
      ) : null}
    </View>
  );
}

export default function RideDetailsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<RouteProp<RootStackParamList, "RideDetails">>();
  const queryClient = useQueryClient();
  const [sheetHeight, setSheetHeight] = useState(320);

  const {
    data: ride,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.ride(params.id),
    queryFn: () => api.getRide(params.id),
    // Live tracking while the ride is on; nothing changes after it ends
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !status || ACTIVE_STATUSES.includes(status) ? 3000 : false;
    },
  });

  const cancel = useMutation({
    mutationFn: () => api.cancelRide(params.id),
    onSuccess: (updated) => {
      successFeedback();
      queryClient.setQueryData(queryKeys.ride(params.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.rides });
    },
    onError: (err) => showMessage("Nie udało się anulować", err.message),
  });

  const pickup: LatLng | null =
    ride?.pickupLat != null && ride.pickupLng != null
      ? { lat: ride.pickupLat, lng: ride.pickupLng }
      : null;
  const destination: LatLng | null =
    ride?.destinationLat != null && ride.destinationLng != null
      ? { lat: ride.destinationLat, lng: ride.destinationLng }
      : null;
  const car = ride?.driver?.location ?? null;
  const hasCar = !!car;

  const markers = useMemo(() => {
    const list: MapMarker[] = [];
    if (pickup && ride?.status !== "in_progress")
      list.push({ id: "pickup", kind: "pickup", ...pickup });
    if (destination)
      list.push({ id: "destination", kind: "destination", ...destination });
    if (car)
      list.push({
        id: "driver",
        kind: "car",
        lat: car.lat,
        lng: car.lng,
        heading: car.heading,
        highlight: true,
      });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup?.lat,
    pickup?.lng,
    destination?.lat,
    destination?.lng,
    car?.lat,
    car?.lng,
    car?.heading,
    ride?.status,
  ]);

  // Camera: the car and where it is heading; re-fit only when the phase changes
  const { fitPoints, fitKey } = useMemo(() => {
    const status = ride?.status;
    let points: (LatLng | null)[] = [pickup, destination];
    if (car && (status === "en_route" || status === "confirmed"))
      points = [car, pickup];
    else if (car && status === "arrived") points = [pickup];
    else if (car && status === "in_progress") points = [car, destination];
    const pts = points.filter((p): p is LatLng => !!p);
    return {
      fitPoints: pts,
      fitKey: `${status}|${hasCar}|${Math.round(sheetHeight / 40)}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.status, hasCar, sheetHeight, car?.lat, car?.lng]);

  const padding = useMemo(
    () => ({ top: 0, bottom: sheetHeight }),
    [sheetHeight],
  );

  if (isLoading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  if (error || !ride) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ThemedText color="secondary">
          {error?.message ?? "Nie znaleziono przejazdu"}
        </ThemedText>
      </View>
    );
  }

  const vehicle = getVehicle(ride.vehicleModel);
  const active = ACTIVE_STATUSES.includes(ride.status);

  return (
    <View style={[styles.flex, { backgroundColor: theme.backgroundRoot }]}>
      {pickup ? (
        <RideMap
          style={StyleSheet.absoluteFill}
          initialCenter={car ?? pickup}
          initialZoom={14}
          markers={markers}
          route={ride.route}
          fitPoints={fitPoints}
          fitKey={fitKey}
          padding={padding}
          testID="ride-map"
        />
      ) : null}

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            maxHeight: pickup ? "62%" : "100%",
            top: pickup ? undefined : 0,
          },
        ]}
        onLayout={(e) =>
          setSheetHeight(Math.round(e.nativeEvent.layout.height))
        }
      >
        <View
          style={[styles.grabber, { backgroundColor: theme.borderStrong }]}
        />
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusRow}>
            <StatusBadge status={ride.status} />
            {ride.estimatedPrice != null ? (
              <ThemedText type="h4" testID="ride-price">
                {formatPrice(ride.estimatedPrice)}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText type="h3" style={styles.headline} testID="ride-headline">
            {rideHeadline(
              ride.status,
              ride.driver?.etaMin,
              ride.driver?.firstName,
            )}
          </ThemedText>
          <ThemedText color="secondary" style={styles.subline}>
            {subline(ride)}
          </ThemedText>

          {ride.status === "pending" ? (
            <View
              style={[
                styles.searching,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ActivityIndicator color={theme.text} />
              <View style={styles.flex}>
                <ThemedText type="small" style={styles.bold}>
                  {vehicle?.name}
                </ThemedText>
                <ThemedText type="caption" color="secondary">
                  {ride.scheduledAt
                    ? "Czekamy, aż kierowca przyjmie rezerwację"
                    : "Łączymy Cię z najbliższym kierowcą"}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {ride.driver ? <DriverCard driver={ride.driver} /> : null}

          {ride.status === "completed" && ride.driver ? (
            <RateRide ride={ride} />
          ) : null}

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <Row icon="circle" label="Odbiór" value={ride.pickupAddress} />
            <Row icon="square" label="Cel" value={ride.destinationAddress} />
            <Row
              icon="clock"
              label="Termin"
              value={formatRideTime(ride.scheduledAt)}
            />
            {ride.distanceKm != null && ride.durationMin != null ? (
              <Row
                icon="navigation"
                label="Trasa"
                value={`${formatDistance(ride.distanceKm)} · ok. ${formatDuration(ride.durationMin)}`}
              />
            ) : null}
            <Row
              icon="credit-card"
              label="Płatność"
              value={`${PAYMENT_METHODS[ride.paymentMethod]}${ride.estimatedPrice != null ? ` · ${formatPrice(ride.estimatedPrice)}` : ""}`}
            />
            <Row
              icon="user"
              label="Kontakt · pasażerowie"
              value={`${ride.contactName}, ${formatPhone(ride.contactPhone)} · ${ride.passengers}`}
            />
            {ride.notes ? (
              <Row icon="message-square" label="Uwagi" value={ride.notes} />
            ) : null}
            <Row
              icon="calendar"
              label="Złożono"
              value={formatDateTime(ride.createdAt)}
            />
          </View>

          {CANCELLABLE_STATUSES.includes(ride.status) ? (
            <Button
              title="Anuluj przejazd"
              variant="danger"
              loading={cancel.isPending}
              onPress={() =>
                confirmAction({
                  title: "Anulować przejazd?",
                  message: ride.driver
                    ? "Kierowca jest już w drodze. Tej operacji nie można cofnąć."
                    : "Tej operacji nie można cofnąć.",
                  confirmText: "Anuluj przejazd",
                  destructive: true,
                  onConfirm: () => cancel.mutate(),
                })
              }
              testID="ride-cancel"
            />
          ) : null}
          {active || ride.status === "completed" ? (
            <Button
              title={`Biuro: ${COMPANY.phoneDisplay}`}
              icon="phone"
              variant="ghost"
              style={styles.gapTop}
              onPress={() => Linking.openURL(`tel:${COMPANY.phone}`)}
            />
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.sm,
  },
  sheetContent: { padding: Spacing.lg, gap: Spacing.md },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headline: { marginTop: -Spacing.xs },
  subline: { marginTop: -Spacing.sm },
  searching: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  driverCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  driverTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  driverCar: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  plate: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  plateText: { fontWeight: "700", letterSpacing: 1, fontSize: 14 },
  rateBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  starsBig: {
    flexDirection: "row",
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  rated: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  stars: { flexDirection: "row", gap: 4 },
  card: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  row: { flexDirection: "row", paddingVertical: Spacing.sm },
  rowIcon: { marginTop: 3, marginRight: Spacing.md },
  gapTop: { marginTop: Spacing.xs },
});
