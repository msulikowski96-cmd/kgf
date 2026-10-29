import { Colors } from "@/constants/theme";

// The app has a single premium dark theme.
export function useTheme() {
  return { theme: Colors.dark, isDark: true };
}
