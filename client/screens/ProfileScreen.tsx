import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  delay: number;
  color?: string;
}

function MenuItem({ icon, title, subtitle, onPress, delay, color }: MenuItemProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    if (onPress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.98);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        onPress={handlePress}
        style={[
          styles.menuItem,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name={icon} size={20} color={color || Colors.dark.primary} />
        </View>
        <View style={styles.menuContent}>
          <ThemedText type="body" style={styles.menuTitle}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              type="small"
              style={[styles.menuSubtitle, { color: theme.textSecondary }]}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "");

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const updatedUser = await api.updateProfile({
        firstName,
        lastName,
        phone,
        address,
        city,
      });
      updateUser(updatedUser);
      setIsEditing(false);
      Alert.alert("Sukces", "Profil został zaktualizowany");
    } catch (error: any) {
      Alert.alert("Błąd", error.message || "Nie udało się zaktualizować profilu");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Wyloguj się",
      "Czy na pewno chcesz się wylogować?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Wyloguj", style: "destructive", onPress: logout },
      ]
    );
  };

  const handleWebsite = () => {
    Linking.openURL("https://kgf-taxi.pl");
  };

  const handleInstagram = () => {
    Linking.openURL("https://www.instagram.com/kgf_taxi/");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500).springify()}
        style={styles.profileHeader}
      >
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.profileImage}
            resizeMode="contain"
          />
        </View>
        <ThemedText type="h2" style={styles.profileName}>
          {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "Użytkownik"}
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.profileTagline, { color: theme.textSecondary }]}
        >
          {user?.email}
        </ThemedText>
      </Animated.View>

      {/* Profile Details Section */}
      <Animated.View entering={FadeInDown.delay(200).duration(500).springify()}>
        <View style={styles.sectionHeader}>
          <ThemedText
            type="small"
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            MOJE DANE
          </ThemedText>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <ThemedText type="small" style={{ color: Colors.dark.primary, fontWeight: "600" }}>
              {isEditing ? "Anuluj" : "Edytuj"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={[styles.detailsCard, { backgroundColor: theme.backgroundDefault }]}>
          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <ThemedText type="small" style={styles.inputLabel}>Imię</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Wpisz imię"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <ThemedText type="small" style={styles.inputLabel}>Nazwisko</ThemedText>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Wpisz nazwisko"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>Telefon</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Numer telefonu"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>Adres</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Ulica i nr domu"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>Miasto</ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Miasto"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: Colors.dark.primary }]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>Zapisz zmiany</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.detailItem}>
                <Feather name="user" size={16} color={theme.textSecondary} style={styles.detailIcon} />
                <ThemedText type="body">{user?.firstName || "Nie podano"} {user?.lastName || ""}</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <Feather name="phone" size={16} color={theme.textSecondary} style={styles.detailIcon} />
                <ThemedText type="body">{user?.phone || "Nie podano"}</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <Feather name="map-pin" size={16} color={theme.textSecondary} style={styles.detailIcon} />
                <ThemedText type="body">{user?.address ? `${user.address}, ${user.city || ""}` : "Nie podano"}</ThemedText>
              </View>
            </>
          )}
        </View>
      </Animated.View>

      {/* Info Section */}
      <Animated.View entering={FadeInDown.delay(300).duration(500).springify()}>
        <ThemedText
          type="small"
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          INFORMACJE I POMOC
        </ThemedText>
      </Animated.View>

      <MenuItem
        icon="globe"
        title="Strona internetowa"
        subtitle="kgf-taxi.pl"
        onPress={handleWebsite}
        delay={400}
      />

      <MenuItem
        icon="instagram"
        title="Instagram"
        subtitle="@kgf_taxi"
        onPress={handleInstagram}
        delay={500}
      />

      <MenuItem
        icon="log-out"
        title="Wyloguj się"
        onPress={handleLogout}
        delay={600}
        color="#ff4444"
      />

      {/* Footer */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(500).springify()}
        style={styles.footer}
      >
        <ThemedText
          type="small"
          style={[styles.footerText, { color: theme.textSecondary }]}
        >
          KGF Taxi - Twoje bezpieczne przejazdy
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.footerText, { color: theme.textSecondary }]}
        >
          Wersja 1.1.0
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  imageContainer: {
    padding: 8,
    borderRadius: BorderRadius.xl,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    marginBottom: Spacing.lg,
  },
  profileImage: {
    width: 80,
    height: 80,
  },
  profileName: {
    marginBottom: Spacing.xs,
  },
  profileTagline: {
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontWeight: "600",
    letterSpacing: 1,
  },
  detailsCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  detailIcon: {
    marginRight: Spacing.md,
    width: 20,
  },
  editForm: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontWeight: "600",
    fontSize: 12,
    opacity: 0.7,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  saveButton: {
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    color: "#000",
    fontWeight: "700",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontWeight: "500",
  },
  menuSubtitle: {
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing["3xl"],
    paddingBottom: Spacing.xl,
  },
  footerText: {
    marginBottom: Spacing.xs,
  },
});

