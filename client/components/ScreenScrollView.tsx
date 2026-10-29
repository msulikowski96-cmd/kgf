import React from "react";
import { ScrollViewProps, StyleSheet } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

// Scroll container for screens inside the tab bar, padded for the transparent header and tab bar.
export function TabScreenScrollView({
  contentContainerStyle,
  children,
  ...props
}: ScrollViewProps) {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing["2xl"],
        },
        contentContainerStyle,
      ]}
      scrollIndicatorInsets={{ bottom: tabBarHeight }}
      {...props}
    >
      {children}
    </KeyboardAwareScrollViewCompat>
  );
}

// Scroll container for screens outside the tab bar (opaque header).
export function StackScreenScrollView({
  contentContainerStyle,
  children,
  ...props
}: ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Spacing.lg,
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
});
