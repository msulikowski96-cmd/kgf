import { Platform } from "react-native";

// Premium dark palette: deep black, graphite surfaces, white actions, red accent.
const palette = {
  text: "#F5F5F7",
  textSecondary: "#9A9AA0",
  textTertiary: "#6C6C72",
  buttonText: "#0A0A0B",
  tabIconDefault: "#6C6C72",
  tabIconSelected: "#F5F5F7",
  link: "#F5F5F7",
  primary: "#F5F5F7",
  accent: "#E82127",
  accentSoft: "rgba(232, 33, 39, 0.14)",
  backgroundRoot: "#0A0A0B",
  backgroundDefault: "#141416",
  backgroundSecondary: "#1C1C1F",
  backgroundTertiary: "#26262A",
  border: "#2A2A2E",
  borderStrong: "#3A3A3F",
  success: "#30D158",
  warning: "#FFD60A",
  info: "#64D2FF",
  error: "#FF453A",
};

export type ThemeColors = typeof palette;

// The app uses one dark theme in both system modes.
export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: palette,
  dark: palette,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
  inputHeight: 56,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  h3: { fontSize: 22, lineHeight: 28, fontWeight: "600" as const },
  h4: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" as const },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  link: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
