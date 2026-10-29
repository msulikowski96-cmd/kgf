import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: keyof typeof Typography;
  color?: "primary" | "secondary" | "tertiary" | "accent";
};

export function ThemedText({
  style,
  darkColor,
  type = "body",
  color = "primary",
  ...rest
}: ThemedTextProps) {
  const { theme } = useTheme();
  const colorMap = {
    primary: theme.text,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    accent: theme.accent,
  };

  return (
    <Text
      style={[{ color: darkColor ?? colorMap[color] }, Typography[type], style]}
      {...rest}
    />
  );
}
