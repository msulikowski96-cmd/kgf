import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RIDE_STATUSES, type RideStatus } from "@shared/fleet";

export function StatusBadge({ status }: { status: RideStatus }) {
  const { theme } = useTheme();
  const color: Record<RideStatus, string> = {
    pending: theme.warning,
    confirmed: theme.info,
    in_progress: theme.success,
    completed: theme.textSecondary,
    cancelled: theme.error,
  };

  return (
    <View style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}>
      <View style={[styles.dot, { backgroundColor: color[status] }]} />
      <ThemedText type="caption" style={{ color: color[status] }}>
        {RIDE_STATUSES[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
