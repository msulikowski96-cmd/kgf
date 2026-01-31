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
  withSpring,
} from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

const PHONE_NUMBER = "537353052";
const CALENDLY_URL = "https://calendly.com";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface InputFieldProps {
  icon: keyof typeof Feather.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  delay: number;
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  delay,
}: InputFieldProps) {
  const { theme } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
      style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}
    >
      <Feather name={icon} size={20} color={Colors.dark.primary} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
      />
    </Animated.View>
  );
}

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
    if (!pickupLocation || !destination || !name || !phone) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Uzupełnij dane", "Proszę wypełnić wszystkie pola formularza.");
      return;
    }

    setIsSubmitting(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Simulate sending the booking
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1000);
  };

  const handleCallToBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = `Rezerwacja KGF Taxi:\nData: ${formatDate(date)}\nGodzina: ${formatTime(date)}\nOdbiór: ${pickupLocation}\nCel: ${destination}\nImię: ${name}`;
    Linking.openURL(`sms:${PHONE_NUMBER}?body=${encodeURIComponent(message)}`);
  };

  const handleOpenCalendly = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(CALENDLY_URL);
  };

  const handleNewBooking = () => {
    setIsSubmitted(false);
    setPickupLocation("");
    setDestination("");
    setName("");
    setPhone("");
    setDate(new Date());
  };

  if (isSubmitted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.successContainer, { paddingTop: headerHeight + Spacing["3xl"] }]}>
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={[styles.successIcon, { backgroundColor: Colors.dark.primary }]}
          >
            <Feather name="check" size={48} color="#121212" />
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(200).duration(500).springify()}>
            <ThemedText type="h2" style={styles.successTitle}>
              Rezerwacja przyjęta!
            </ThemedText>
          </Animated.View>
          
          <Animated.View entering={FadeInDown.delay(300).duration(500).springify()}>
            <ThemedText
              type="body"
              style={[styles.successText, { color: theme.textSecondary }]}
            >
              Skontaktujemy się z Tobą wkrótce, aby potwierdzić przejazd.
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(400).duration(500).springify()}
            style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.summaryRow}>
              <Feather name="calendar" size={18} color={Colors.dark.primary} />
              <ThemedText type="body" style={styles.summaryText}>
                {formatDate(date)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <Feather name="clock" size={18} color={Colors.dark.primary} />
              <ThemedText type="body" style={styles.summaryText}>
                {formatTime(date)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <Feather name="map-pin" size={18} color={Colors.dark.primary} />
              <ThemedText type="body" style={styles.summaryText}>
                {pickupLocation}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <Feather name="navigation" size={18} color={Colors.dark.primary} />
              <ThemedText type="body" style={styles.summaryText}>
                {destination}
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(500).springify()}>
            <Pressable
              style={[styles.callButton, { backgroundColor: Colors.dark.primary }]}
              onPress={handleCallToBook}
            >
              <Feather name="phone" size={20} color="#121212" />
              <ThemedText style={styles.callButtonText} lightColor="#121212" darkColor="#121212">
                Zadzwoń, aby przyspieszyć
              </ThemedText>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600).duration(500).springify()}>
            <Pressable
              style={[styles.newBookingButton, { borderColor: theme.border }]}
              onPress={handleNewBooking}
            >
              <ThemedText type="body" style={{ color: Colors.dark.primary }}>
                Nowa rezerwacja
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
        <ThemedText type="h2" style={styles.pageTitle}>
          Zarezerwuj przejazd
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.pageSubtitle, { color: theme.textSecondary }]}
        >
          Wypełnij formularz, a my skontaktujemy się z Tobą
        </ThemedText>
      </Animated.View>

      {/* Date Picker */}
      <Animated.View entering={FadeInDown.delay(200).duration(500).springify()}>
        <Pressable
          style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={20} color={Colors.dark.primary} style={styles.inputIcon} />
          <ThemedText type="body" style={styles.pickerText}>
            {formatDate(date)}
          </ThemedText>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      <Animated.View entering={FadeInDown.delay(300).duration(500).springify()}>
        <Pressable
          style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Feather name="clock" size={20} color={Colors.dark.primary} style={styles.inputIcon} />
          <ThemedText type="body" style={styles.pickerText}>
            {formatTime(date)}
          </ThemedText>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>

      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
          is24Hour={true}
        />
      )}

      <InputField
        icon="map-pin"
        placeholder="Miejsce odbioru"
        value={pickupLocation}
        onChangeText={setPickupLocation}
        delay={400}
      />

      <InputField
        icon="navigation"
        placeholder="Miejsce docelowe"
        value={destination}
        onChangeText={setDestination}
        delay={500}
      />

      <InputField
        icon="user"
        placeholder="Twoje imię"
        value={name}
        onChangeText={setName}
        delay={600}
      />

      <InputField
        icon="phone"
        placeholder="Numer telefonu"
        value={phone}
        onChangeText={setPhone}
        delay={700}
      />

      {/* Submit Button */}
      <Animated.View entering={FadeInDown.delay(800).duration(500).springify()}>
        <AnimatedPressable
          onPressIn={() => {
            buttonScale.value = withSpring(0.97);
          }}
          onPressOut={() => {
            buttonScale.value = withSpring(1);
          }}
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            { backgroundColor: Colors.dark.primary, opacity: isSubmitting ? 0.7 : 1 },
            buttonAnimatedStyle,
          ]}
        >
          <Feather name="send" size={20} color="#121212" />
          <ThemedText style={styles.submitButtonText} lightColor="#121212" darkColor="#121212">
            {isSubmitting ? "Wysyłanie..." : "Wyślij rezerwację"}
          </ThemedText>
        </AnimatedPressable>
      </Animated.View>

      {/* Alternative Options */}
      <Animated.View
        entering={FadeInDown.delay(900).duration(500).springify()}
        style={styles.alternativeSection}
      >
        <ThemedText
          type="small"
          style={[styles.alternativeLabel, { color: theme.textSecondary }]}
        >
          lub skorzystaj z innych opcji
        </ThemedText>

        <Pressable
          style={[styles.alternativeButton, { backgroundColor: theme.backgroundDefault }]}
          onPress={handleCallToBook}
        >
          <Feather name="message-circle" size={20} color={Colors.dark.primary} />
          <ThemedText type="body" style={styles.alternativeButtonText}>
            Wyślij SMS z rezerwacją
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.alternativeButton, { backgroundColor: theme.backgroundDefault }]}
          onPress={handleOpenCalendly}
        >
          <Feather name="external-link" size={20} color={Colors.dark.primary} />
          <ThemedText type="body" style={styles.alternativeButtonText}>
            Otwórz kalendarz online
          </ThemedText>
        </Pressable>
      </Animated.View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitle: {
    marginBottom: Spacing.sm,
  },
  pageSubtitle: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  pickerText: {
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  alternativeSection: {
    marginTop: Spacing["3xl"],
  },
  alternativeLabel: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  alternativeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  alternativeButtonText: {
    marginLeft: Spacing.sm,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  successTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  successText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  summaryText: {
    marginLeft: Spacing.md,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  newBookingButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
