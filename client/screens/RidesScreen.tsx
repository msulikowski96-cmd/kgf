import React from "react";
import {
  StyleSheet,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { TabScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { TeslaCar } from "@/components/TeslaCar";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { ACTIVE_STATUSES, getVehicle } from "@shared/fleet";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatRideTime } from "@/lib/format";
import { carColor, carVariant } from "@/lib/vehicleStyle";

function RideCard({ ride, index }: { ride: api.RideDto; index: number }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const vehicle = getVehicle(ride.vehicleModel);

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(400)}
    >
      <Pressable
        onPress={() => navigation.navigate("RideDetails", { id: ride.id })}
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
        testID="ride-card"
      >
        <View style={styles.cardHeader}>
          <ThemedText style={styles.bold}>
            {formatRideTime(ride.scheduledAt)}
          </ThemedText>
          <StatusBadge status={ride.status} />
        </View>
        <View style={styles.route}>
          <View style={styles.routeLine}>
            <View style={[styles.dot, { borderColor: theme.text }]} />
            <View
              style={[styles.line, { backgroundColor: theme.borderStrong }]}
            />
            <View style={[styles.square, { backgroundColor: theme.text }]} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="small" numberOfLines={1}>
              {ride.pickupAddress}
            </ThemedText>
            <ThemedText type="small" numberOfLines={1} style={styles.routeTo}>
              {ride.destinationAddress}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardFooter}>
          {vehicle ? (
            <TeslaCar
              width={56}
              color={carColor(vehicle.id)}
              variant={carVariant(vehicle.id)}
            />
          ) : null}
          <ThemedText type="caption" color="secondary" style={styles.flex}>
            {vehicle?.name} · {ride.passengers}{" "}
            {ride.passengers === 1
              ? "osoba"
              : ride.passengers < 5
                ? "osoby"
                : "osób"}
          </ThemedText>
          <Feather name="chevron-right" size={18} color={theme.textTertiary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function RidesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.rides,
    queryFn: api.getRides,
    // Keeps the status fresh while the dispatcher confirms rides
    refetchInterval: 15_000,
  });

  const active = data?.filter((r) => ACTIVE_STATUSES.includes(r.status)) ?? [];
  const past = data?.filter((r) => !ACTIVE_STATUSES.includes(r.status)) ?? [];

  return (
    <TabScreenScrollView
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.text}
        />
      }
    >
      {isLoading ? (
        <ActivityIndicator color={theme.text} style={styles.loader} />
      ) : error ? (
        <View style={styles.empty}>
          <Feather name="wifi-off" size={32} color={theme.textSecondary} />
          <ThemedText color="secondary" style={styles.center}>
            {error.message}
          </ThemedText>
          <Button
            title="Spróbuj ponownie"
            variant="secondary"
            onPress={() => refetch()}
          />
        </View>
      ) : data && data.length === 0 ? (
        <View style={styles.empty}>
          <TeslaCar width={220} />
          <ThemedText type="h4">Brak przejazdów</ThemedText>
          <ThemedText color="secondary" style={styles.center}>
            Tu zobaczysz swoje zamówienia i ich status.
          </ThemedText>
          <Button
            title="Zamów pierwszy przejazd"
            onPress={() =>
              navigation.navigate("Main", { screen: "BookingTab" })
            }
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <>
          {active.length > 0 ? (
            <>
              <ThemedText
                type="label"
                color="tertiary"
                style={styles.sectionTitle}
              >
                Aktywne
              </ThemedText>
              {active.map((r, i) => (
                <RideCard key={r.id} ride={r} index={i} />
              ))}
            </>
          ) : null}
          {past.length > 0 ? (
            <>
              <ThemedText
                type="label"
                color="tertiary"
                style={styles.sectionTitle}
              >
                Historia
              </ThemedText>
              {past.map((r, i) => (
                <RideCard key={r.id} ride={r} index={active.length + i} />
              ))}
            </>
          ) : null}
        </>
      )}
    </TabScreenScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: "600" },
  center: { textAlign: "center" },
  loader: { marginTop: Spacing["3xl"] },
  sectionTitle: { marginTop: Spacing.md, marginBottom: Spacing.md },
  empty: { alignItems: "center", gap: Spacing.md, marginTop: Spacing["3xl"] },
  emptyButton: { alignSelf: "stretch", marginTop: Spacing.md },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  route: { flexDirection: "row", marginTop: Spacing.md },
  routeLine: {
    alignItems: "center",
    width: 12,
    marginRight: Spacing.md,
    paddingTop: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  line: { width: 1.5, flex: 1, minHeight: 14, marginVertical: 3 },
  square: { width: 8, height: 8, marginBottom: 6 },
  routeTo: { marginTop: Spacing.sm },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
