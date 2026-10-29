import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const { theme } = useTheme();
  const big = size === "lg";

  return (
    <View
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel="KGF Premium"
    >
      <ThemedText style={[styles.kgf, big && styles.kgfLarge]}>KGF</ThemedText>
      <View
        style={[
          styles.bar,
          { backgroundColor: theme.accent },
          big && styles.barLarge,
        ]}
      />
      <ThemedText
        color="secondary"
        style={[styles.premium, big && styles.premiumLarge]}
      >
        PREMIUM
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  kgf: { fontSize: 20, fontWeight: "800", letterSpacing: 5 },
  kgfLarge: { fontSize: 32, letterSpacing: 8 },
  bar: { width: 2, height: 16, marginHorizontal: 10 },
  barLarge: { height: 24, marginHorizontal: 14 },
  premium: { fontSize: 12, fontWeight: "600", letterSpacing: 4 },
  premiumLarge: { fontSize: 15, letterSpacing: 6 },
});
