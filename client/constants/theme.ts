import { Platform } from "react-native";

// Uber-inspired brand colors
const uberBlack = "#000000";
const uberWhite = "#FFFFFF";
const uberBlue = "#276EF1";
const uberGray = "#F6F6F6";

export const Colors = {
  light: {
    text: "#000000",
    textSecondary: "#5E5E5E",
    buttonText: "#FFFFFF",
    tabIconDefault: "#5E5E5E",
    tabIconSelected: "#000000",
    link: uberBlue,
    primary: uberBlack,
    primaryDark: "#1F1F1F",
    backgroundRoot: uberWhite,
    backgroundDefault: uberWhite,
    backgroundSecondary: uberGray,
    backgroundTertiary: "#EEEEEE",
    border: "#EEEEEE",
    success: "#05A357",
    error: "#E11900",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#AFAFAF",
    buttonText: "#000000",
    tabIconDefault: "#AFAFAF",
    tabIconSelected: "#FFFFFF",
    link: uberBlue,
    primary: uberWhite,
    primaryDark: "#F1F1F1",
    backgroundRoot: uberBlack,
    backgroundDefault: "#121212",
    backgroundSecondary: "#1F1F1F",
    backgroundTertiary: "#292929",
    border: "#292929",
    success: "#05A357",
    error: "#FF3B30",
  },
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
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
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
