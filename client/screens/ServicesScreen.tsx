import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
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

const PHONE_NUMBER = "537353052";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ServiceDetailProps {
  icon: any;
  title: string;
  description: string;
  features: string[];
  delay: number;
}

function ServiceDetailCard({
  icon,
  title,
  description,
  features,
  delay,
}: ServiceDetailProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCall = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${PHONE_NUMBER}`);
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
        style={[
          styles.serviceCard,
          { backgroundColor: theme.backgroundDefault },
          animatedStyle,
        ]}
      >
        <View style={styles.serviceHeader}>
          <ExpoImage source={icon} style={styles.serviceIcon} contentFit="cover" />
          <View style={styles.serviceHeaderText}>
            <ThemedText type="h4" style={styles.serviceTitle}>
              {title}
            </ThemedText>
          </View>
        </View>

        <ThemedText
          type="body"
          style={[styles.serviceDescription, { color: theme.textSecondary }]}
        >
          {description}
        </ThemedText>

        <View style={styles.featuresList}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Feather
                name="check-circle"
                size={18}
                color={Colors.dark.primary}
              />
              <ThemedText type="small" style={styles.featureText}>
                {feature}
              </ThemedText>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.callButton, { backgroundColor: Colors.dark.primary }]}
          onPress={handleCall}
        >
          <Feather name="phone" size={18} color="#121212" />
          <ThemedText style={styles.callButtonText} lightColor="#121212" darkColor="#121212">
            Zamów teraz
          </ThemedText>
        </Pressable>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

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
      <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
        <ThemedText type="h2" style={styles.pageTitle}>
          Nasze usługi
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.pageSubtitle, { color: theme.textSecondary }]}
        >
          Wybierz usługę dopasowaną do Twoich potrzeb
        </ThemedText>
      </Animated.View>

      <ServiceDetailCard
        icon={require("../../assets/images/service-city.png")}
        title="Poznań i okolice"
        description="Oferujemy szybkie i komfortowe przejazdy po całym Poznaniu oraz okolicznych miejscowościach. Niezależnie od pory dnia czy nocy, jesteśmy do Twojej dyspozycji."
        features={[
          "Przejazdy całodobowe",
          "Krótki czas oczekiwania",
          "Konkurencyjne ceny",
          "Bezpieczna jazda",
        ]}
        delay={200}
      />

      <ServiceDetailCard
        icon={require("../../assets/images/service-vip.png")}
        title="Przejazdy VIP"
        description="Dla najbardziej wymagających klientów oferujemy ekskluzywne przejazdy luksusowymi autami. Idealne na specjalne okazje, ważne spotkania czy wydarzenia."
        features={[
          "Luksusowe samochody",
          "Dyskretna obsługa",
          "Klimatyzacja premium",
          "Napoje dla pasażerów",
        ]}
        delay={400}
      />

      <ServiceDetailCard
        icon={require("../../assets/images/service-business.png")}
        title="Przejazdy Biznesowe"
        description="Profesjonalna obsługa klientów biznesowych. Zapewniamy punktualne i komfortowe transfery na spotkania, konferencje oraz wydarzenia firmowe."
        features={[
          "Punktualność gwarantowana",
          "Faktura VAT",
          "Stałe umowy dla firm",
          "Transfery lotniskowe",
        ]}
        delay={600}
      />
    </ScrollView>
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
  serviceCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  serviceIcon: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.lg,
  },
  serviceHeaderText: {
    flex: 1,
  },
  serviceTitle: {
    marginBottom: 0,
  },
  serviceDescription: {
    lineHeight: 26,
    marginBottom: Spacing.lg,
  },
  featuresList: {
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  featureText: {
    marginLeft: Spacing.sm,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
});
