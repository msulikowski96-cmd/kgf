import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { RideMap } from "@/components/map/RideMap";
import type { MapMarker } from "@/components/map/mapTypes";
import { useTheme } from "@/hooks/useTheme";
import { useUserLocation } from "@/hooks/useUserLocation";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  DEFAULT_CENTER,
  DRIVER_TRANSITIONS,
  PAYMENT_METHODS,
  getVehicle,
  type LatLng,
  type RideStatus,
} from "@shared/fleet";
import { formatPhone } from "@shared/phone";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import {
  formatDistance,
  formatDuration,
  formatPrice,
  formatRideTime,
  plural,
} from "@/lib/format";
import {
  confirmAction,
  errorFeedback,
  showMessage,
  successFeedback,
} from "@/lib/feedback";

const LOCATION_INTERVAL_MS = 4000;
const HEARTBEAT_MS = 30_000;

const ACTION_LABEL: Partial<Record<RideStatus, string>> = {
  confirmed: "Jadę po klienta",
  en_route: "Jestem na miejscu",
  arrived: "Klient wsiadł – start",
  in_progress: "Zakończ kurs",
};

function point(lat: number | null, lng: number | null): LatLng | null {
  return lat != null && lng != null ? { lat, lng } : null;
}

export function openNavigation(target: LatLng) {
  const dest = `${target.lat},${target.lng}`;
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${dest}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  Linking.openURL(url).catch(() =>
    showMessage("Nie udało się otworzyć nawigacji"),
  );
}

// The ride the driver is working on right now (not a booking for later)
export function currentRide(rides: api.DriverRideDto[] | undefined) {
  return rides?.find((r) =>
    ["en_route", "arrived", "in_progress"].includes(r.status),
  );
}

function OfferCard({
  offer,
  onAccept,
  loading,
}: {
  offer: api.DriverRideDto;
  onAccept: () => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.offer,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
      testID="driver-offer"
    >
      <View style={styles.offerHeader}>
        <View style={styles.flex}>
          <ThemedText
            type="caption"
            color={offer.scheduledAt ? "accent" : "secondary"}
          >
            {offer.scheduledAt
              ? `REZERWACJA · ${formatRideTime(offer.scheduledAt).toUpperCase()}`
              : offer.pickupEtaMin != null
                ? `TERAZ · ${offer.pickupEtaMin} MIN DO KLIENTA`
                : "TERAZ"}
          </ThemedText>
          <ThemedText type="small" color="secondary">
            {offer.contactName} ·{" "}
            {plural(offer.passengers, "osoba", "osoby", "osób")}
            {offer.distanceToPickupKm != null
              ? ` · ${formatDistance(offer.distanceToPickupKm)} od Ciebie`
              : ""}
          </ThemedText>
        </View>
        {offer.estimatedPrice != null ? (
          <ThemedText type="h3">{formatPrice(offer.estimatedPrice)}</ThemedText>
        ) : null}
      </View>
      <RouteLines from={offer.pickupAddress} to={offer.destinationAddress} />
      {offer.distanceKm != null && offer.durationMin != null ? (
        <ThemedText type="caption" color="tertiary">
          Kurs: {formatDistance(offer.distanceKm)} · ok.{" "}
          {formatDuration(offer.durationMin)} ·{" "}
          {PAYMENT_METHODS[offer.paymentMethod]}
        </ThemedText>
      ) : null}
      {offer.notes ? (
        <ThemedText type="caption" color="secondary">
          „{offer.notes}”
        </ThemedText>
      ) : null}
      <Button
        title="Przyjmij zlecenie"
        icon="check"
        onPress={onAccept}
        loading={loading}
        testID="driver-accept"
      />
    </View>
  );
}

export function RouteLines({ from, to }: { from: string; to: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.route}>
      <View style={styles.routeDots}>
        <View style={[styles.dot, { borderColor: theme.text }]} />
        <View style={[styles.line, { backgroundColor: theme.borderStrong }]} />
        <View style={[styles.square, { backgroundColor: theme.text }]} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="small" numberOfLines={2}>
          {from}
        </ThemedText>
        <ThemedText type="small" numberOfLines={2} style={styles.routeTo}>
          {to}
        </ThemedText>
      </View>
    </View>
  );
}

function CurrentRide({ ride }: { ride: api.DriverRideDto }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const next = DRIVER_TRANSITIONS[ride.status];
  const pickup = point(ride.pickupLat, ride.pickupLng);
  const destination = point(ride.destinationLat, ride.destinationLng);
  const target = ride.status === "in_progress" ? destination : pickup;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.driverRides });
    queryClient.invalidateQueries({ queryKey: queryKeys.driverProfile });
    queryClient.invalidateQueries({ queryKey: queryKeys.driverOffers });
  };

  const advance = useMutation({
    mutationFn: () => api.updateDriverRideStatus(ride.id, next!),
    onSuccess: (updated) => {
      successFeedback();
      if (updated.status === "completed")
        showMessage(
          "Kurs zakończony",
          `Pobierz ${formatPrice(updated.estimatedPrice ?? 0)} – ${PAYMENT_METHODS[updated.paymentMethod].toLowerCase()}.`,
        );
      refresh();
    },
    onError: (err) => {
      errorFeedback();
      showMessage("Nie udało się", err.message);
      refresh();
    },
  });

  const release = useMutation({
    mutationFn: () => api.releaseRide(ride.id),
    onSuccess: refresh,
    onError: (err) => showMessage("Nie udało się", err.message),
  });

  return (
    <View testID="driver-current-ride">
      <View style={styles.offerHeader}>
        <StatusBadge status={ride.status} />
        {ride.estimatedPrice != null ? (
          <ThemedText type="h3">{formatPrice(ride.estimatedPrice)}</ThemedText>
        ) : null}
      </View>
      <View style={styles.passenger}>
        <View
          style={[styles.avatar, { backgroundColor: theme.backgroundTertiary }]}
        >
          <Feather name="user" size={20} color={theme.text} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="h4">{ride.contactName}</ThemedText>
          <ThemedText type="caption" color="secondary">
            {plural(ride.passengers, "osoba", "osoby", "osób")} ·{" "}
            {PAYMENT_METHODS[ride.paymentMethod]}
          </ThemedText>
        </View>
        {ride.contactPhone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${ride.contactPhone}`)}
            style={[
              styles.roundAction,
              { backgroundColor: theme.backgroundTertiary },
            ]}
            accessibilityLabel={`Zadzwoń: ${formatPhone(ride.contactPhone)}`}
          >
            <Feather name="phone" size={18} color={theme.text} />
          </Pressable>
        ) : null}
        {target ? (
          <Pressable
            onPress={() => openNavigation(target)}
            style={[styles.roundAction, { backgroundColor: theme.primary }]}
            accessibilityLabel="Nawiguj"
            testID="driver-navigate"
          >
            <Feather name="navigation" size={18} color={theme.buttonText} />
          </Pressable>
        ) : null}
      </View>
      <RouteLines from={ride.pickupAddress} to={ride.destinationAddress} />
      {ride.notes ? (
        <View
          style={[styles.notes, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather
            name="message-square"
            size={14}
            color={theme.textSecondary}
          />
          <ThemedText type="small" style={styles.flex}>
            {ride.notes}
          </ThemedText>
        </View>
      ) : null}
      {next ? (
        <Button
          title={ACTION_LABEL[ride.status] ?? "Dalej"}
          icon={next === "completed" ? "flag" : "arrow-right"}
          onPress={() => advance.mutate()}
          loading={advance.isPending}
          style={styles.gapTop}
          testID="driver-advance"
        />
      ) : null}
      {ride.status === "en_route" || ride.status === "confirmed" ? (
        <Button
          title="Zrezygnuj z kursu"
          variant="danger"
          style={styles.gapTopSm}
          loading={release.isPending}
          onPress={() =>
            confirmAction({
              title: "Zrezygnować z kursu?",
              message: "Zlecenie wróci do innych kierowców.",
              confirmText: "Zrezygnuj",
              destructive: true,
              onConfirm: () => release.mutate(),
            })
          }
        />
      ) : null}
    </View>
  );
}

export default function DriverHomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const focused = useIsFocused();
  const queryClient = useQueryClient();
  const [sheetHeight, setSheetHeight] = useState(300);

  const profile = useQuery({
    queryKey: queryKeys.driverProfile,
    queryFn: api.getDriverProfile,
    refetchInterval: 20_000,
  });
  const approved = profile.data?.status === "approved";
  const online = approved && !!profile.data?.online;

  const rides = useQuery({
    queryKey: queryKeys.driverRides,
    queryFn: api.getDriverRides,
    enabled: approved,
    refetchInterval: focused ? 4000 : 15_000,
  });
  const ride = currentRide(rides.data);

  const offers = useQuery({
    queryKey: queryKeys.driverOffers,
    queryFn: api.getDriverOffers,
    enabled: online && !ride,
    refetchInterval: focused ? 4000 : false,
  });

  // GPS: followed only while online, so the phone is not tracked off duty
  const { location, status: locationStatus } = useUserLocation({
    watch: true,
    enabled: online,
  });
  const latest = useRef(location);
  latest.current = location;
  const lastSent = useRef(0);

  useEffect(() => {
    if (!online || !location) return;
    if (Date.now() - lastSent.current < LOCATION_INTERVAL_MS) return;
    lastSent.current = Date.now();
    api.sendDriverLocation(location).catch(() => {});
  }, [online, location]);

  // Keep the position fresh on the server even when standing still
  useEffect(() => {
    if (!online) return;
    const t = setInterval(() => {
      if (latest.current) {
        lastSent.current = Date.now();
        api.sendDriverLocation(latest.current).catch(() => {});
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [online]);

  const toggleOnline = useMutation({
    mutationFn: (value: boolean) => api.setDriverOnline(value),
    onSuccess: () => {
      successFeedback();
      queryClient.invalidateQueries({ queryKey: queryKeys.driverProfile });
    },
    onError: (err) => showMessage("Nie udało się", err.message),
  });

  const [accepting, setAccepting] = useState<string | null>(null);
  const accept = useMutation({
    mutationFn: (id: string) => {
      setAccepting(id);
      return api.acceptRide(id);
    },
    onSuccess: (r) => {
      successFeedback();
      if (r.scheduledAt)
        showMessage(
          "Rezerwacja przyjęta",
          `Odbiór ${formatRideTime(r.scheduledAt).toLowerCase()}. Znajdziesz ją w zakładce Kursy.`,
        );
      queryClient.invalidateQueries({ queryKey: queryKeys.driverRides });
      queryClient.invalidateQueries({ queryKey: queryKeys.driverOffers });
    },
    onError: (err) => {
      errorFeedback();
      showMessage("Nie udało się przyjąć", err.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.driverOffers });
    },
    onSettled: () => setAccepting(null),
  });

  const me = location ?? profile.data?.location ?? null;
  const pickup = ride ? point(ride.pickupLat, ride.pickupLng) : null;
  const destination = ride
    ? point(ride.destinationLat, ride.destinationLng)
    : null;

  const markers = useMemo(() => {
    const list: MapMarker[] = [];
    if (ride) {
      if (pickup && ride.status !== "in_progress")
        list.push({ id: "pickup", kind: "pickup", ...pickup });
      if (destination)
        list.push({ id: "destination", kind: "destination", ...destination });
    } else {
      for (const o of offers.data ?? []) {
        if (!o.scheduledAt && o.pickupLat != null && o.pickupLng != null)
          list.push({
            id: o.id,
            kind: "pickup",
            lat: o.pickupLat,
            lng: o.pickupLng,
          });
      }
    }
    if (me)
      list.push({
        id: "me",
        kind: "car",
        lat: me.lat,
        lng: me.lng,
        heading: me.heading ?? 0,
        highlight: true,
      });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, ride?.status, offers.data, me?.lat, me?.lng, me?.heading]);

  const target = ride?.status === "in_progress" ? destination : pickup;
  const fitPoints = useMemo(
    () => [me, target].filter((p): p is LatLng => !!p),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ride?.id, ride?.status, !!me, sheetHeight],
  );
  const padding = useMemo(
    () => ({ top: insets.top + 72, bottom: sheetHeight }),
    [insets.top, sheetHeight],
  );

  if (profile.isLoading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  const vehicle = profile.data ? getVehicle(profile.data.vehicleModel) : null;

  let sheet: React.ReactNode;
  if (profile.error || !profile.data) {
    sheet = (
      <ThemedText color="secondary">
        {profile.error?.message ?? "Nie udało się wczytać profilu kierowcy"}
      </ThemedText>
    );
  } else if (profile.data.status !== "approved") {
    sheet = (
      <View style={styles.center}>
        <Feather
          name={profile.data.status === "blocked" ? "slash" : "clock"}
          size={32}
          color={theme.textSecondary}
        />
        <ThemedText type="h4" style={styles.centerText}>
          {profile.data.status === "blocked"
            ? "Konto kierowcy jest zablokowane"
            : "Czekamy na weryfikację"}
        </ThemedText>
        <ThemedText color="secondary" style={styles.centerText}>
          {profile.data.status === "blocked"
            ? "Skontaktuj się z biurem, aby wyjaśnić sprawę."
            : "Dyspozytor sprawdzi Twoje dane i samochód. Po akceptacji zaczniesz przyjmować kursy."}
        </ThemedText>
      </View>
    );
  } else if (ride) {
    sheet = <CurrentRide ride={ride} />;
  } else if (!online) {
    sheet = (
      <View>
        <ThemedText type="h3">Jesteś offline</ThemedText>
        <ThemedText color="secondary" style={styles.gapTopSm}>
          Włącz tryb online, aby klienci widzieli Cię na mapie i aby dostawać
          zlecenia.
        </ThemedText>
        <Button
          title="Rozpocznij pracę"
          icon="power"
          style={styles.gapTop}
          loading={toggleOnline.isPending}
          onPress={() => toggleOnline.mutate(true)}
          testID="driver-go-online"
        />
      </View>
    );
  } else {
    const list = offers.data ?? [];
    sheet = (
      <View>
        <View style={styles.offerHeader}>
          <ThemedText type="h4">
            {list.length > 0
              ? `Zlecenia (${list.length})`
              : "Czekasz na zlecenia"}
          </ThemedText>
          {offers.isFetching ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : null}
        </View>
        {list.length === 0 ? (
          <ThemedText color="secondary" style={styles.gapTopSm}>
            Nowe zamówienia na {vehicle?.name ?? "Twoje auto"} pojawią się tutaj
            automatycznie.
          </ThemedText>
        ) : null}
        {locationStatus === "denied" || locationStatus === "unavailable" ? (
          <View style={[styles.warning, { backgroundColor: theme.accentSoft }]}>
            <Feather name="map-pin" size={14} color={theme.error} />
            <ThemedText
              type="small"
              style={[styles.flex, { color: theme.error }]}
            >
              Brak dostępu do lokalizacji – klienci nie zobaczą Cię na mapie.
              Zezwól na lokalizację w ustawieniach telefonu.
            </ThemedText>
          </View>
        ) : null}
        {list.map((o) => (
          <OfferCard
            key={o.id}
            offer={o}
            loading={accepting === o.id}
            onAccept={() => accept.mutate(o.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.backgroundRoot }]}>
      <RideMap
        style={StyleSheet.absoluteFill}
        initialCenter={me ?? DEFAULT_CENTER}
        initialZoom={14}
        markers={markers}
        route={ride?.route}
        fitPoints={fitPoints}
        fitKey={`${ride?.id ?? "none"}|${ride?.status ?? ""}|${!!me}|${Math.round(sheetHeight / 40)}`}
        padding={padding}
        testID="driver-map"
      />

      <View
        style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}
        pointerEvents="box-none"
      >
        <Pressable
          disabled={!approved || toggleOnline.isPending || !!ride}
          onPress={() => toggleOnline.mutate(!online)}
          style={[
            styles.onlinePill,
            {
              backgroundColor: online
                ? theme.success
                : theme.backgroundRoot + "E6",
              borderColor: online ? theme.success : theme.border,
            },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: online }}
          testID="driver-online-toggle"
        >
          <View
            style={[
              styles.onlineDot,
              {
                backgroundColor: online ? theme.buttonText : theme.textTertiary,
              },
            ]}
          />
          <ThemedText
            style={[styles.bold, online && { color: theme.buttonText }]}
          >
            {online ? "Online" : "Offline"}
          </ThemedText>
        </Pressable>
        {profile.data ? (
          <View
            style={[
              styles.earnings,
              {
                backgroundColor: theme.backgroundRoot + "E6",
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText type="caption" color="tertiary">
              Dziś ·{" "}
              {plural(profile.data.today.rides, "kurs", "kursy", "kursów")}
            </ThemedText>
            <ThemedText style={styles.bold} testID="driver-earnings">
              {formatPrice(profile.data.today.earnings)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.sheet,
          {
            bottom: tabBarHeight,
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
        onLayout={(e) =>
          setSheetHeight(Math.round(e.nativeEvent.layout.height) + tabBarHeight)
        }
      >
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {sheet}
          {online && !ride ? (
            <Button
              title="Zakończ pracę"
              variant="ghost"
              icon="power"
              style={styles.gapTop}
              loading={toggleOnline.isPending}
              onPress={() => toggleOnline.mutate(false)}
              testID="driver-go-offline"
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
  center: { alignItems: "center", paddingVertical: Spacing.md },
  centerText: { textAlign: "center", marginTop: Spacing.sm },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  earnings: {
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    maxHeight: "58%",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  sheetContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  offer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  offerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  route: { flexDirection: "row", marginVertical: Spacing.sm },
  routeDots: { alignItems: "center", marginRight: Spacing.md, paddingTop: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  line: { width: 2, flex: 1, minHeight: 14, marginVertical: 3 },
  square: { width: 9, height: 9, marginBottom: 5 },
  routeTo: { marginTop: Spacing.md },
  passenger: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  roundAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notes: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "flex-start",
  },
  warning: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    alignItems: "flex-start",
  },
  gapTop: { marginTop: Spacing.lg },
  gapTopSm: { marginTop: Spacing.sm },
});
