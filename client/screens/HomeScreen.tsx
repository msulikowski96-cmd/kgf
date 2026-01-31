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

  const handleCall = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${PHONE_NUMBER}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: tabBarHeight + 100,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
        >
          <View style={styles.heroContainer}>
            <ExpoImage
              source={require("../../assets/images/hero-taxi.png")}
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.heroLogo}
                resizeMode="contain"
              />
              <ThemedText
                type="h1"
                style={styles.heroTitle}
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
              >
                KGF Taxi
              </ThemedText>
              <ThemedText
                type="body"
                style={styles.heroSubtitle}
                lightColor="#FFFFFF"
                darkColor="#FFFFFF"
              >
                Przejazdy takie jak lubisz
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500).springify()}
          style={styles.section}
        >
          <ThemedText type="h3" style={styles.sectionTitle}>
            Podróżuj komfortowo i bezpiecznie
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.sectionText, { color: theme.textSecondary }]}
          >
            Oferujemy profesjonalne przejazdy taxi na terenie Poznania i okolic.
            Skorzystaj z naszych usług i ciesz się wygodą, bezpieczeństwem oraz
            atrakcyjnymi cenami.
          </ThemedText>
        </Animated.View>

        {/* Services */}
        <View style={styles.section}>
          <Animated.View
            entering={FadeInDown.delay(300).duration(500).springify()}
          >
            <ThemedText type="h3" style={styles.sectionTitle}>
              Nasze usługi
            </ThemedText>
          </Animated.View>

          <ServiceCard
            icon={require("../../assets/images/service-city.png")}
            title="Poznań i okolice"
            description="Szybkie i komfortowe przejazdy po całym mieście oraz okolicznych miejscowościach."
            delay={400}
          />

          <ServiceCard
            icon={require("../../assets/images/service-vip.png")}
            title="Przejazdy VIP"
            description="Ekskluzywne przejazdy luksusowymi autami dla najbardziej wymagających klientów."
            delay={500}
          />

          <ServiceCard
            icon={require("../../assets/images/service-business.png")}
            title="Przejazdy Biznesowe"
            description="Obsługa klientów biznesowych – komfortowe transfery na spotkania i wydarzenia."
            delay={600}
          />
        </View>

        {/* About */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(500).springify()}
          style={styles.section}
        >
          <View
            style={[
              styles.aboutCard,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText type="h4" style={styles.aboutTitle}>
              O nas
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.aboutText, { color: theme.textSecondary }]}
            >
              Świadczymy profesjonalne usługi taxi w Poznaniu i okolicach.
              Oferujemy przejazdy indywidualne, grupowe, biznesowe oraz
              ekskluzywne transfery VIP. Zapewniamy nowoczesne i wygodne
              samochody, konkurencyjne ceny oraz przyjaznych i doświadczonych
              kierowców.
            </ThemedText>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Call Button */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(500).springify()}
        style={[
          styles.fabContainer,
          { bottom: tabBarHeight + Spacing.xl },
        ]}
      >
        <Pressable
          style={[styles.fab, { backgroundColor: Colors.dark.primary }]}
          onPress={handleCall}
        >
          <Feather name="phone" size={24} color="#121212" />
          <ThemedText style={styles.fabText} lightColor="#121212" darkColor="#121212">
            Zadzwoń teraz
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
  heroContainer: {
    height: 280,
    position: "relative",
    marginBottom: Spacing.xl,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  heroLogo: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    textAlign: "center",
    opacity: 0.9,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionText: {
    lineHeight: 26,
  },
  serviceCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.lg,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    marginBottom: Spacing.xs,
  },
  serviceDescription: {
    lineHeight: 20,
  },
  aboutCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  aboutTitle: {
    marginBottom: Spacing.md,
  },
  aboutText: {
    lineHeight: 26,
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
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
});
