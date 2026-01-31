import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Image,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  delay: number;
}

function MenuItem({ icon, title, subtitle, onPress, delay }: MenuItemProps) {
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
          <Feather name={icon} size={20} color={Colors.dark.primary} />
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

  const handleWebsite = () => {
    Linking.openURL("https://kgf-taxi.pl");
  };

  const handleInstagram = () => {
    Linking.openURL("https://www.instagram.com/kgf_taxi/");
  };

  const handlePrivacy = () => {
    Linking.openURL("https://kgf-taxi.pl");
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
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.profileImage}
          resizeMode="contain"
        />
        <ThemedText type="h2" style={styles.profileName}>
          KGF Taxi
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.profileTagline, { color: theme.textSecondary }]}
        >
          Przejazdy takie jak lubisz
        </ThemedText>
      </Animated.View>

      {/* Company Info Section */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500).springify()}
      >
        <ThemedText
          type="small"
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          O FIRMIE
        </ThemedText>
      </Animated.View>

      <MenuItem
        icon="globe"
        title="Strona internetowa"
        subtitle="kgf-taxi.pl"
        onPress={handleWebsite}
        delay={300}
      />

      <MenuItem
        icon="instagram"
        title="Instagram"
        subtitle="@kgf_taxi"
        onPress={handleInstagram}
        delay={400}
      />

      <MenuItem
        icon="map-pin"
        title="Lokalizacja"
        subtitle="Poznań i okolice"
        delay={500}
      />

      {/* Stats Section */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(500).springify()}
        style={styles.statsSection}
      >
        <ThemedText
          type="small"
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          W LICZBACH
        </ThemedText>
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: Colors.dark.primary }}>
              24/7
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              Godziny pracy
            </ThemedText>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: theme.border }]}
          />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: Colors.dark.primary }}>
              2K+
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              Obserwujących
            </ThemedText>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: theme.border }]}
          />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: Colors.dark.primary }}>
              45+
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              Postów
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      {/* Legal Section */}
      <Animated.View
        entering={FadeInDown.delay(700).duration(500).springify()}
      >
        <ThemedText
          type="small"
          style={[styles.sectionLabel, { color: theme.textSecondary }]}
        >
          INFORMACJE
        </ThemedText>
      </Animated.View>

      <MenuItem
        icon="shield"
        title="Polityka prywatności"
        onPress={handlePrivacy}
        delay={800}
      />

      <MenuItem
        icon="info"
        title="Wersja aplikacji"
        subtitle="1.0.0"
        delay={900}
      />

      {/* Footer */}
      <Animated.View
        entering={FadeInDown.delay(1000).duration(500).springify()}
        style={styles.footer}
      >
        <ThemedText
          type="small"
          style={[styles.footerText, { color: theme.textSecondary }]}
        >
          Stworzone z pasją dla KGF Taxi
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.footerText, { color: theme.textSecondary }]}
        >
          Poznań, Polska
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
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  profileName: {
    marginBottom: Spacing.xs,
  },
  profileTagline: {
    textAlign: "center",
  },
  sectionLabel: {
    fontWeight: "600",
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    letterSpacing: 1,
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
  statsSection: {
    marginTop: Spacing.lg,
  },
  statsCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    marginHorizontal: Spacing.md,
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
