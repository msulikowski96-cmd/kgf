import React from "react";
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { tapFeedback } from "@/lib/feedback";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
  testID,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const inactive = disabled || loading;

  const colors: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.primary, fg: theme.buttonText, border: theme.primary },
    secondary: {
      bg: theme.backgroundSecondary,
      fg: theme.text,
      border: theme.border,
    },
    ghost: { bg: "transparent", fg: theme.text, border: theme.borderStrong },
    danger: { bg: "transparent", fg: theme.error, border: theme.error },
  };
  const c = colors[variant];

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={
        inactive
          ? undefined
          : () => {
              tapFeedback();
              onPress?.();
            }
      }
      onPressIn={() => {
        if (!inactive)
          scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }}
      disabled={inactive}
      style={[
        styles.button,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
          opacity: disabled ? 0.45 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Feather name={icon} size={18} color={c.fg} /> : null}
          <ThemedText type="body" style={[styles.text, { color: c.fg }]}>
            {title}
          </ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
