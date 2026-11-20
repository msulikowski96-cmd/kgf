import React from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { TabScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { PAYMENT_METHODS } from "@shared/fleet";
import { formatPhone } from "@shared/phone";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatDateTime, formatPrice, formatRideTime } from "@/lib/format";
import { confirmAction, showMessage, successFeedback } from "@/lib/feedback";
import { RouteLines, currentRide } from "@/screens/driver/DriverHomeScreen";

function UpcomingCard({
  ride,
  canStart,
}: {
  ride: api.DriverRideDto;
  canStart: boolean;
}) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.driverRides });
    queryClient.invalidateQueries({ queryKey: queryKeys.driverOffers });
  };

  const start = useMutation({
    mutationFn: () => api.updateDriverRideStatus(ride.id, "en_route"),
    onSuccess: () => {
      successFeedback();
      refresh();
      navigation.navigate("DriverMain", { screen: "DriverHomeTab" });
    },
    onError: (err) => showMessage("Nie udało się", err.message),
  });
  const release = useMutation({
    mutationFn: () => api.releaseRide(ride.id),
    onSuccess: refresh,
    onError: (err) => showMessage("Nie udało się", err.message),
  });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
      ]}
      testID="driver-upcoming"
    >
      <View style={styles.header}>
        <ThemedText type="h4">{formatRideTime(ride.scheduledAt)}</ThemedText>
        {ride.estimatedPrice != null ? (
          <ThemedText type="h4">{formatPrice(ride.estimatedPrice)}</ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" color="secondary">
        {ride.contactName}
        {ride.contactPhone ? ` · ${formatPhone(ride.contactPhone)}` : ""} ·{" "}
        {PAYMENT_METHODS[ride.paymentMethod]}
      </ThemedText>
      <RouteLines from={ride.pickupAddress} to={ride.destinationAddress} />
      {ride.notes ? (
        <ThemedText type="caption" color="secondary">
          „{ride.notes}”
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        {ride.contactPhone ? (
          <Button
            title="Zadzwoń"
            icon="phone"
            variant="secondary"
            style={styles.flex}
            onPress={() => Linking.openURL(`tel:${ride.contactPhone}`)}
          />
        ) : null}
        <Button
          title="Jadę po klienta"
          icon="navigation"
          style={styles.flex}
          disabled={!canStart}
          loading={start.isPending}
          onPress={() => start.mutate()}
        />
      </View>
      <Button
        title="Zrezygnuj z rezerwacji"
        variant="ghost"
        loading={release.isPending}
        onPress={() =>
          confirmAction({
            title: "Zrezygnować z rezerwacji?",
            message: "Zlecenie wróci do innych kierowców.",
            confirmText: "Zrezygnuj",
            destructive: true,
            onConfirm: () => release.mutate(),
          })
        }
      />
    </View>
  );
}

function HistoryRow({ ride }: { ride: api.DriverRideDto }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.historyRow, { borderBottomColor: theme.border }]}>
      <View style={styles.flex}>
        <ThemedText type="small" numberOfLines={1}>
          {ride.pickupAddress} → {ride.destinationAddress}
        </ThemedText>
        <ThemedText type="caption" color="tertiary">
          {formatDateTime(ride.completedAt ?? ride.updatedAt)}
          {ride.rating ? ` · ★ ${ride.rating}` : ""}
        </ThemedText>
      </View>
      {ride.status === "completed" ? (
        <ThemedText style={styles.bold}>
          {formatPrice(ride.estimatedPrice ?? 0)}
        </ThemedText>
      ) : (
        <StatusBadge status={ride.status} />
      )}
    </View>
  );
}

export default function DriverRidesScreen() {
  const { theme } = useTheme();
  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: queryKeys.driverRides,
    queryFn: api.getDriverRides,
    refetchInterval: 15_000,
  });

  const upcoming = (data ?? [])
    .filter((r) => r.status === "confirmed")
    .sort(
      (a, b) =>
        new Date(a.scheduledAt ?? 0).getTime() -
        new Date(b.scheduledAt ?? 0).getTime(),
    );
  const history = (data ?? []).filter(
    (r) => r.status === "completed" || r.status === "cancelled",
  );
  const busy = !!currentRide(data);
  const earned = history
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + (r.estimatedPrice ?? 0), 0);

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
        <ThemedText color="secondary">{error.message}</ThemedText>
      ) : (
        <>
          <ThemedText type="label" color="tertiary" style={styles.section}>
            Rezerwacje
          </ThemedText>
          {upcoming.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather name="calendar" size={24} color={theme.textSecondary} />
              <ThemedText color="secondary" style={styles.emptyText}>
                Nie masz zaplanowanych kursów. Rezerwacje przyjmujesz z listy
                zleceń na ekranie Jazda.
              </ThemedText>
            </View>
          ) : (
            upcoming.map((r) => (
              <UpcomingCard key={r.id} ride={r} canStart={!busy} />
            ))
          )}

          <View style={styles.historyHeader}>
            <ThemedText type="label" color="tertiary">
              Historia
            </ThemedText>
            <ThemedText type="small" color="secondary">
              Razem: {formatPrice(earned)}
            </ThemedText>
          </View>
          {history.length === 0 ? (
            <ThemedText color="secondary">Brak zakończonych kursów.</ThemedText>
          ) : (
            history.map((r) => <HistoryRow key={r.id} ride={r} />)
          )}
        </>
      )}
    </TabScreenScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: "600" },
  loader: { marginTop: Spacing["3xl"] },
  section: { marginBottom: Spacing.md },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  empty: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  emptyText: { textAlign: "center", marginTop: Spacing.sm },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.sm,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
