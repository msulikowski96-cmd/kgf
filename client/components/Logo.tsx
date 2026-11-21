import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

// Wordmark: "TWÓJ PRYWATNY" over "SZOFER" with a red accent bar
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const { theme } = useTheme();
  const big = size === "lg";

  return (
    <View
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel="Twój Prywatny Szofer"
    >
      <View
        style={[
          styles.bar,
          { backgroundColor: theme.accent },
          big && styles.barLarge,
        ]}
      />
      <View>
        <ThemedText
          color="secondary"
          style={[styles.small, big && styles.smallLarge]}
        >
          TWÓJ PRYWATNY
        </ThemedText>
        <ThemedText style={[styles.main, big && styles.mainLarge]}>
          SZOFER
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  bar: { width: 3, height: 30, marginRight: 10, borderRadius: 2 },
  barLarge: { width: 4, height: 48, marginRight: 14 },
  small: { fontSize: 9, lineHeight: 11, fontWeight: "600", letterSpacing: 2.5 },
  smallLarge: { fontSize: 13, lineHeight: 16, letterSpacing: 4 },
  main: { fontSize: 19, lineHeight: 21, fontWeight: "800", letterSpacing: 4 },
  mainLarge: { fontSize: 32, lineHeight: 36, letterSpacing: 7 },
});
