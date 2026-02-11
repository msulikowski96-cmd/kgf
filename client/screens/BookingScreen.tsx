import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const VEHICLE_TYPES = [
  { id: "standard", name: "KGF Standard", price: "25-30 zł", icon: "car", eta: "4 min" },
  { id: "vip", name: "KGF VIP", price: "45-55 zł", icon: "shield", eta: "6 min" },
  { id: "business", name: "Biznes", price: "35-40 zł", icon: "briefcase", eta: "5 min" },
];

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const handleSubmit = async () => {
    if (!pickupLocation || !destination) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Uzupełnij dane", "Proszę podać miejsce odbioru i cel.");
      return;
    }

    setIsSubmitting(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const handleNewBooking = () => {
    setIsSubmitted(false);
    setPickupLocation("");
    setDestination("");
    setDate(new Date());
  };

  if (isSubmitted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.successContainer, { paddingTop: headerHeight + Spacing["3xl"] }]}>
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={[styles.successIcon, { backgroundColor: "#000" }]}
          >
            <Feather name="check" size={48} color="#fff" />
          </Animated.View>

          <ThemedText type="h2" style={styles.successTitle}>Przyjęto zamówienie</ThemedText>
          <ThemedText type="body" style={[styles.successText, { color: theme.textSecondary }]}>
            Kierowca zaakceptuje Twoje zamówienie w ciągu kilku sekund.
          </ThemedText>

          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.summaryRow}>
              <Feather name="map-pin" size={18} color="#000" />
              <ThemedText type="body" style={styles.summaryText}>{pickupLocation}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <Feather name="navigation" size={18} color="#000" />
              <ThemedText type="body" style={styles.summaryText}>{destination}</ThemedText>
            </View>
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: "#000", width: "100%", marginTop: Spacing.xl }]}
            onPress={handleNewBooking}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "700" }}>Gotowe</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.headerSection, { paddingTop: headerHeight + Spacing.lg }]}>
        <View style={styles.locationContainer}>
          <View style={styles.locationVisual}>
            <View style={[styles.pickupDot, { borderColor: "#000" }]} />
            <View style={[styles.locationLine, { backgroundColor: "#000" }]} />
            <View style={[styles.destinationSquare, { backgroundColor: "#000" }]} />
          </View>

          <View style={styles.inputsColumn}>
            <TextInput
              style={[styles.minimalInput, { color: theme.text, backgroundColor: theme.backgroundSecondary }]}
              placeholder="Miejsce odbioru"
              value={pickupLocation}
              onChangeText={setPickupLocation}
              placeholderTextColor={theme.textSecondary}
            />
            <View style={{ height: 10 }} />
            <TextInput
              style={[styles.minimalInput, { color: theme.text, backgroundColor: theme.backgroundSecondary }]}
              placeholder="Dokąd jedziemy?"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        <View style={styles.timeSettings}>
          <Pressable style={[styles.settingBadge, { backgroundColor: theme.backgroundSecondary }]} onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={14} color="#000" />
            <ThemedText type="small" style={styles.badgeText}>{formatDate(date)}</ThemedText>
          </Pressable>
          <Pressable style={[styles.settingBadge, { backgroundColor: theme.backgroundSecondary }]} onPress={() => setShowTimePicker(true)}>
            <Feather name="clock" size={14} color="#000" />
            <ThemedText type="small" style={styles.badgeText}>{formatTime(date)}</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.dragHandle} />
        <ThemedText type="h4" style={styles.sheetTitle}>Wybierz typ przejazdu</ThemedText>

        <View style={styles.vehicleList}>
          {VEHICLE_TYPES.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => setSelectedVehicle(v.id)}
              style={[
                styles.vehicleCard,
                selectedVehicle === v.id && { borderColor: "#000", borderWidth: 2 }
              ]}
            >
              <View style={[styles.vIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name={v.icon as any} size={24} color="#000" />
              </View>
              <View style={styles.vInfo}>
                <ThemedText type="body" style={{ fontWeight: "700" }}>{v.name}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{v.eta}</ThemedText>
              </View>
              <ThemedText type="body" style={{ fontWeight: "700" }}>{v.price}</ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={[styles.paymentRow, { borderTopColor: theme.border }]}>
          <View style={styles.paymentMethod}>
            <View style={[styles.pIcon, { backgroundColor: "#000" }]}>
              <ThemedText lightColor="#fff" darkColor="#fff" style={{ fontSize: 10, fontWeight: "700" }}>VISA</ThemedText>
            </View>
            <ThemedText type="small" style={{ marginLeft: 8, fontWeight: "600" }}>•••• 4242</ThemedText>
            <Feather name="chevron-right" size={16} color={theme.textSecondary} style={{ marginLeft: 4 }} />
          </View>
          <ThemedText type="small" style={{ color: "#276EF1", fontWeight: "700" }}>Promocja</ThemedText>
        </View>

        <AnimatedPressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            { backgroundColor: "#000", opacity: isSubmitting ? 0.7 : 1 },
            buttonAnimatedStyle,
          ]}
        >
          <ThemedText style={styles.submitButtonText} lightColor="#fff" darkColor="#fff">
            {isSubmitting ? "Przetwarzanie..." : `Zamów ${VEHICLE_TYPES.find(v => v.id === selectedVehicle)?.name}`}
          </ThemedText>
        </AnimatedPressable>
      </View>

      {(showDatePicker || showTimePicker) && (
        <DateTimePicker
          value={date}
          mode={showDatePicker ? "date" : "time"}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={showDatePicker ? handleDateChange : handleTimeChange}
          minimumDate={new Date()}
          is24Hour={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationVisual: {
    alignItems: "center",
    marginRight: 16,
    width: 20,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  locationLine: {
    width: 2,
    height: 40,
    marginVertical: 4,
  },
  destinationSquare: {
    width: 8,
    height: 8,
  },
  inputsColumn: {
    flex: 1,
  },
  minimalInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  timeSettings: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  settingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  badgeText: {
    fontWeight: "600",
  },
  bottomSheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    marginBottom: 20,
    textAlign: "center",
  },
  vehicleList: {
    gap: 8,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  vIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  vInfo: {
    flex: 1,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    marginTop: 10,
    borderTopWidth: 1,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
  },
  pIcon: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  submitButton: {
    height: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    textAlign: "center",
    marginBottom: 32,
  },
  summaryCard: {
    width: "100%",
    padding: 20,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryText: {
    marginLeft: 16,
    fontWeight: "500",
  },
});
