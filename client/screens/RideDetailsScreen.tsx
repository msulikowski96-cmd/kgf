import React from "react";
import { StyleSheet, View, ActivityIndicator, Linking } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { StackScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { TeslaCar } from "@/components/TeslaCar";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { COMPANY } from "@/constants/company";
import {
  CANCELLABLE_STATUSES,
  PAYMENT_METHODS,
  getVehicle,
} from "@shared/fleet";
import { formatPhone } from "@shared/phone";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatDateTime, formatRideTime, priceSummary } from "@/lib/format";
import { carColor, carVariant } from "@/lib/vehicleStyle";
import { confirmAction, showMessage, successFeedback } from "@/lib/feedback";
import type { RootStackParamList } from "@/navigation/types";

const STATUS_INFO: Record<api.RideDto["status"], string> = {
  pending:
    "Dyspozytor sprawdza dostępność Tesli. Potwierdzenie zwykle trwa kilka minut.",
  confirmed: "Przejazd potwierdzony. Kierowca zadzwoni przed przyjazdem.",
  in_progress: "Jesteś w drodze. Miłej podróży!",
  completed: "Dziękujemy za wspólną podróż.",
  cancelled: "Ten przejazd został anulowany.",
};

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

export default function RideDetailsScreen() {
  const { theme } = useTheme();
  const { params } = useRoute<RouteProp<RootStackParamList, "RideDetails">>();
  const queryClient = useQueryClient();

  const {
    data: ride,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.ride(params.id),
    queryFn: () => api.getRide(params.id),
    refetchInterval: 15_000,
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

  return (
    <StackScreenScrollView>
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <StatusBadge status={ride.status} />
        <ThemedText type="h3" style={styles.heroTitle}>
          {formatRideTime(ride.scheduledAt)}
        </ThemedText>
        <ThemedText color="secondary" style={styles.heroInfo}>
          {STATUS_INFO[ride.status]}
        </ThemedText>
        {vehicle ? (
          <View style={styles.car}>
            <TeslaCar
              width={260}
              color={carColor(vehicle.id)}
              variant={carVariant(vehicle.id)}
            />
            <ThemedText type="h4">{vehicle.name}</ThemedText>
            <ThemedText type="small" color="secondary">
              {priceSummary(vehicle)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <Row icon="circle" label="Odbiór" value={ride.pickupAddress} />
        <Row icon="square" label="Cel" value={ride.destinationAddress} />
        <Row icon="users" label="Pasażerowie" value={String(ride.passengers)} />
        <Row
          icon="credit-card"
          label="Płatność"
          value={PAYMENT_METHODS[ride.paymentMethod]}
        />
        <Row
          icon="user"
          label="Kontakt"
          value={`${ride.contactName}, ${formatPhone(ride.contactPhone)}`}
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

      <Button
        title={`Zadzwoń: ${COMPANY.phoneDisplay}`}
        icon="phone"
        variant="secondary"
        onPress={() => Linking.openURL(`tel:${COMPANY.phone}`)}
      />

      {CANCELLABLE_STATUSES.includes(ride.status) ? (
        <Button
          title="Anuluj przejazd"
          variant="danger"
          loading={cancel.isPending}
          style={styles.cancel}
          onPress={() =>
            confirmAction({
              title: "Anulować przejazd?",
              message: "Tej operacji nie można cofnąć.",
              confirmText: "Anuluj przejazd",
              destructive: true,
              onConfirm: () => cancel.mutate(),
            })
          }
          testID="ride-cancel"
        />
      ) : null}
    </StackScreenScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  heroTitle: { marginTop: Spacing.md },
  heroInfo: { marginTop: Spacing.xs },
  car: { alignItems: "center", marginTop: Spacing.lg, gap: 2 },
  card: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  row: { flexDirection: "row", paddingVertical: Spacing.md },
  rowIcon: { marginTop: 3, marginRight: Spacing.md },
  cancel: { marginTop: Spacing.md },
});
