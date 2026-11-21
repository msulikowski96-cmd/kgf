import React, { useMemo, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { Logo } from "@/components/Logo";
import { RideMap } from "@/components/map/RideMap";
import type { MapMarker } from "@/components/map/mapTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useBookingDraft } from "@/contexts/BookingDraftContext";
import { useTheme } from "@/hooks/useTheme";
import { useUserLocation } from "@/hooks/useUserLocation";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  ACTIVE_STATUSES,
  DEFAULT_CENTER,
  POPULAR_PLACES,
  getVehicle,
  type Place,
} from "@shared/fleet";
import { distanceKm } from "@shared/geo";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatRideTime, plural, rideHeadline } from "@/lib/format";
import { tapFeedback } from "@/lib/feedback";

const QUICK_PLACES = POPULAR_PLACES.slice(0, 3);

function greeting() {
  const h = new Date().getHours();
  if (h < 5 || h >= 19) return "Dobry wieczór";
  return "Dzień dobry";
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const focused = useIsFocused();
  const draft = useBookingDraft();
  const { location, refresh } = useUserLocation();
  const [recenter, setRecenter] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(260);

  const center = location ?? DEFAULT_CENTER;

  const { data: rides } = useQuery({
    queryKey: queryKeys.rides,
    queryFn: api.getRides,
    refetchInterval: focused ? 5000 : false,
  });
  const activeRide =
    rides?.find((r) => ACTIVE_STATUSES.includes(r.status) && !r.scheduledAt) ??
    rides?.find((r) => ACTIVE_STATUSES.includes(r.status));

  const { data: cars } = useQuery({
    queryKey: [
      ...queryKeys.nearby,
      center.lat.toFixed(3),
      center.lng.toFixed(3),
    ],
    queryFn: () => api.getNearbyCars(center),
    refetchInterval: focused ? 4000 : false,
  });

  const markers = useMemo(() => {
    const list: MapMarker[] = (cars ?? []).map((c) => ({
      id: c.id,
      kind: "car",
      lat: c.lat,
      lng: c.lng,
      heading: c.heading,
    }));
    if (location)
      list.push({ id: "me", kind: "me", lat: location.lat, lng: location.lng });
    return list;
  }, [cars, location]);

  // Show the user together with the closest free cars, like ride apps do
  const hasCars = (cars?.length ?? 0) > 0;
  const fitPoints = useMemo(() => {
    const nearest = [...(cars ?? [])]
      .sort((a, b) => distanceKm(a, center) - distanceKm(b, center))
      .slice(0, 3);
    return [center, ...nearest];
    // Re-fit only on the triggers in fitKey, not on every car move
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, hasCars, recenter]);
  const padding = useMemo(
    () => ({ top: insets.top + 80, bottom: sheetHeight }),
    [insets.top, sheetHeight],
  );

  const whereTo = () =>
    navigation.navigate("PlaceSearch", {
      field: "destination",
      then: "booking",
    });

  const goTo = (place: Place) => {
    draft.setDestination(place);
    navigation.navigate("Main", {
      screen: "BookingTab",
      params: { screen: "Booking" },
    });
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.backgroundRoot }]}>
      <RideMap
        style={StyleSheet.absoluteFill}
        initialCenter={center}
        initialZoom={14}
        markers={markers}
        fitPoints={fitPoints}
        fitKey={`${location ? "me" : "default"}|${hasCars}|${recenter}|${Math.round(sheetHeight / 40)}`}
        padding={padding}
        testID="home-map"
      />

      <View
        style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.topCard,
            {
              backgroundColor: theme.backgroundRoot + "E6",
              borderColor: theme.border,
            },
          ]}
        >
          <Logo />
        </View>
        <Pressable
          onPress={async () => {
            tapFeedback();
            await refresh();
            setRecenter((n) => n + 1);
          }}
          style={[
            styles.roundBtn,
            {
              backgroundColor: theme.backgroundRoot + "E6",
              borderColor: theme.border,
            },
          ]}
          accessibilityLabel="Pokaż moją lokalizację"
        >
          <Feather name="crosshair" size={18} color={theme.text} />
        </Pressable>
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
        <Animated.View entering={FadeInDown.duration(400)}>
          {activeRide ? (
            <Pressable
              onPress={() =>
                navigation.navigate("RideDetails", { id: activeRide.id })
              }
              style={[
                styles.activeRide,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.borderStrong,
                },
              ]}
              testID="home-active-ride"
            >
              <View style={styles.activeHeader}>
                <StatusBadge status={activeRide.status} />
                <ThemedText type="caption" color="tertiary">
                  {formatRideTime(activeRide.scheduledAt)}
                </ThemedText>
              </View>
              <ThemedText type="h4" style={styles.activeTitle}>
                {rideHeadline(
                  activeRide.status,
                  activeRide.driver?.etaMin,
                  activeRide.driver?.firstName,
                )}
              </ThemedText>
              <View style={styles.activeFooter}>
                <ThemedText
                  type="small"
                  color="secondary"
                  numberOfLines={1}
                  style={styles.flex}
                >
                  {activeRide.driver
                    ? `${getVehicle(activeRide.driver.vehicleModel)?.name} · ${activeRide.driver.plate}`
                    : `→ ${activeRide.destinationAddress}`}
                </ThemedText>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
            </Pressable>
          ) : (
            <>
              <ThemedText type="h3">
                {greeting()}
                {user?.firstName ? `, ${user.firstName}` : ""}
              </ThemedText>
              <ThemedText
                type="small"
                color="secondary"
                style={styles.carsInfo}
                testID="home-cars-count"
              >
                {cars === undefined
                  ? "Szukam aut w pobliżu…"
                  : cars.length > 0
                    ? `${plural(cars.length, "wolne auto", "wolne auta", "wolnych aut")} w pobliżu`
                    : "W tej chwili brak wolnych aut w pobliżu – możesz zarezerwować przejazd na później"}
              </ThemedText>
            </>
          )}

          <Pressable
            onPress={() => {
              tapFeedback();
              whereTo();
            }}
            style={[
              styles.whereTo,
              { backgroundColor: theme.backgroundTertiary },
            ]}
            accessibilityRole="button"
            testID="home-book"
          >
            <Feather name="search" size={20} color={theme.text} />
            <ThemedText type="h4" style={styles.flex}>
              Dokąd jedziemy?
            </ThemedText>
            <Pressable
              onPress={() => {
                tapFeedback();
                navigation.navigate("Main", {
                  screen: "BookingTab",
                  params: { screen: "Booking" },
                });
              }}
              style={[styles.later, { backgroundColor: theme.backgroundRoot }]}
              accessibilityLabel="Zarezerwuj na później"
            >
              <Feather name="calendar" size={14} color={theme.text} />
              <ThemedText type="caption">Później</ThemedText>
            </Pressable>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quick}
          >
            {QUICK_PLACES.map((p) => (
              <Pressable
                key={p.name}
                onPress={() => {
                  tapFeedback();
                  goTo(p);
                }}
                style={[
                  styles.quickItem,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Feather name="map-pin" size={14} color={theme.textSecondary} />
                <ThemedText type="small" numberOfLines={1}>
                  {p.name}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  topCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  carsInfo: { marginTop: 2 },
  whereTo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    height: 60,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  later: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  quick: { gap: Spacing.sm, marginTop: Spacing.md },
  quickItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 240,
  },
  activeRide: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  activeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeTitle: { marginTop: Spacing.sm },
  activeFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
});
