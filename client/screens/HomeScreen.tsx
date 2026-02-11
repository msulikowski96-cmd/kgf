import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

const { width } = Dimensions.get("window");

const PHONE_NUMBER = "537353052";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ServiceCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: any;
  title: string;
  description: string;
  delay: number;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify()}
    >
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        style={[
          styles.serviceCard,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
      >
        <ExpoImage source={icon} style={styles.serviceIcon} contentFit="cover" />
        <View style={styles.serviceContent}>
          <ThemedText type="h4" style={styles.serviceTitle}>
            {title}
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.serviceDescription, { color: theme.textSecondary }]}
          >
            {description}
          </ThemedText>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const handleCall = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${PHONE_NUMBER}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + 100,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
          <ThemedText type="h2" style={styles.welcomeText}>
            Witaj, {user?.firstName || "Użytkowniku"}!
          </ThemedText>
        </Animated.View>

        {/* Where To Bar */}
        <Animated.View entering={FadeInDown.delay(200).duration(600).springify()}>
          <Pressable
            style={[styles.whereToBar, { backgroundColor: theme.backgroundSecondary }]}
            onPress={() => Linking.openURL("tel:537353052")}
          >
            <View style={[styles.searchDot, { backgroundColor: "#000" }]} />
            <ThemedText type="h4" style={styles.whereToText}>
              Dokąd jedziemy?
            </ThemedText>
            <View style={[styles.nowBadge, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="clock" size={14} color="#000" />
              <ThemedText type="small" style={{ fontWeight: "700", marginLeft: 4 }}>
                Teraz
              </ThemedText>
              <Feather name="chevron-down" size={14} color="#000" style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Animated.View entering={FadeInDown.delay(300).duration(500).springify()} style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: theme.backgroundSecondary }]}>
              <ExpoImage source={require("../../assets/images/service-city.png")} style={styles.actionImg} />
            </View>
            <ThemedText type="small" style={styles.quickActionLabel}>Przejazd</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(500).springify()} style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: theme.backgroundSecondary }]}>
              <ExpoImage source={require("../../assets/images/service-vip.png")} style={styles.actionImg} />
            </View>
            <ThemedText type="small" style={styles.quickActionLabel}>VIP</ThemedText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(500).springify()} style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: theme.backgroundSecondary }]}>
              <ExpoImage source={require("../../assets/images/service-business.png")} style={styles.actionImg} />
            </View>
            <ThemedText type="small" style={styles.quickActionLabel}>Biznes</ThemedText>
          </Animated.View>
        </View>

        {/* Saved Places Placeholder */}
        <Animated.View entering={FadeInDown.delay(600).duration(500).springify()} style={styles.recentLocation}>
          <View style={[styles.locationIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="clock" size={18} color={theme.text} />
          </View>
          <View style={styles.locationInfo}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Piotrków Trybunalski</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Ostatni cel podróży</ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Animated.View>

        <View style={[styles.separator, { backgroundColor: theme.border }]} />

        <Animated.View entering={FadeInDown.delay(700).duration(500).springify()} style={styles.recentLocation}>
          <View style={[styles.locationIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="home" size={18} color={theme.text} />
          </View>
          <View style={styles.locationInfo}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Dodaj dom</ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Animated.View>

        {/* Promotion Card */}
        <Animated.View entering={FadeInDown.delay(800).duration(600).springify()} style={[styles.promoCard, { backgroundColor: "#276EF1" }]}>
          <View style={styles.promoContent}>
            <ThemedText type="h3" lightColor="#fff" darkColor="#fff">Zbieraj punkty!</ThemedText>
            <ThemedText type="small" lightColor="#fff" darkColor="#fff" style={{ marginTop: 4, opacity: 0.9 }}>
              Każdy przejazd to punkty w programie lojalnościowym KGF.
            </ThemedText>
          </View>
          <ExpoImage source={require("../../assets/images/icon.png")} style={styles.promoImg} />
        </Animated.View>
      </ScrollView>

      {/* Floating Call Button - Redesigned to be less intrusive */}
      <Animated.View
        entering={FadeInDown.delay(900).duration(500).springify()}
        style={[
          styles.fabContainer,
          { bottom: tabBarHeight + Spacing.lg },
        ]}
      >
        <Pressable
          style={[styles.fab, { backgroundColor: theme.text }]}
          onPress={handleCall}
        >
          <Feather name="phone" size={20} color={theme.backgroundRoot} />
          <ThemedText style={styles.fabText} lightColor={theme.backgroundRoot} darkColor={theme.backgroundRoot}>
            Zadzwoń do kierowcy
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  welcomeText: {
    marginBottom: Spacing.xl,
    fontSize: 32,
  },
  whereToBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: 50,
    marginBottom: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 14,
  },
  whereToText: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
  },
  nowBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing["2xl"],
  },
  quickAction: {
    alignItems: "center",
    width: (width - Spacing.lg * 2) / 3.5,
  },
  quickActionIcon: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  actionImg: {
    width: "70%",
    height: "70%",
  },
  quickActionLabel: {
    fontWeight: "600",
  },
  recentLocation: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  locationInfo: {
    flex: 1,
  },
  separator: {
    height: 1,
    opacity: 0.1,
  },
  promoCard: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  promoContent: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  promoImg: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    opacity: 0.8,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
    left: Spacing.lg,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: Spacing.sm,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 12,
  },
});
