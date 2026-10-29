import { Alert, Platform } from "react-native";
import * as Haptics from "expo-haptics";

export function tapFeedback() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successFeedback() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

export function errorFeedback() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => {},
  );
}

// Alert.alert does nothing on web, so fall back to the browser dialogs there.
export function showMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAction(options: {
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  if (Platform.OS === "web") {
    if (window.confirm(`${options.title}\n\n${options.message}`))
      options.onConfirm();
    return;
  }
  Alert.alert(options.title, options.message, [
    { text: "Nie", style: "cancel" },
    {
      text: options.confirmText,
      style: options.destructive ? "destructive" : "default",
      onPress: options.onConfirm,
    },
  ]);
}
