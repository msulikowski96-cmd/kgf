import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
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

const PHONE_NUMBER = "537353052";
const INSTAGRAM_URL = "https://www.instagram.com/kgf_taxi/";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ContactCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value: string;
  onPress: () => void;
  delay: number;
  isPrimary?: boolean;
}

function ContactCard({
  icon,
  title,
  value,
  onPress,
  delay,
  isPrimary = false,
}: ContactCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        onPress={handlePress}
        style={[
          styles.contactCard,
          {
            backgroundColor: isPrimary
              ? Colors.dark.primary
              : theme.backgroundDefault,
          },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isPrimary
                ? "rgba(0,0,0,0.2)"
                : theme.backgroundSecondary,
            },
          ]}
        >
          <Feather
            name={icon}
            size={24}
            color={isPrimary ? "#121212" : Colors.dark.primary}
          />
        </View>
        <View style={styles.contactContent}>
          <ThemedText
            type="small"
            style={[
              styles.contactTitle,
              { color: isPrimary ? "rgba(0,0,0,0.6)" : theme.textSecondary },
            ]}
          >
            {title}
          </ThemedText>
          <ThemedText
            type="h4"
            style={styles.contactValue}
            lightColor={isPrimary ? "#121212" : undefined}
            darkColor={isPrimary ? "#121212" : undefined}
          >
            {value}
          </ThemedText>
        </View>
        <Feather
          name="chevron-right"
          size={24}
          color={isPrimary ? "#121212" : theme.textSecondary}
        />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();

  const handleCall = () => {
    Linking.openURL(`tel:${PHONE_NUMBER}`);
  };

  const handleInstagram = () => {
    Linking.openURL(INSTAGRAM_URL);
  };

  const handleSMS = () => {
    Linking.openURL(`sms:${PHONE_NUMBER}`);
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
      <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
        <ThemedText type="h2" style={styles.pageTitle}>
          Kontakt
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.pageSubtitle, { color: theme.textSecondary }]}
        >
          Skontaktuj się z nami i zamów przejazd
        </ThemedText>
      </Animated.View>

      <ContactCard
        icon="phone"
        title="Zadzwoń do nas"
        value="+48 537 353 052"
        onPress={handleCall}
        delay={200}
        isPrimary
      />

      <ContactCard
        icon="message-circle"
        title="Wyślij SMS"
        value="+48 537 353 052"
        onPress={handleSMS}
        delay={300}
      />

      <ContactCard
        icon="instagram"
        title="Instagram"
        value="@kgf_taxi"
        onPress={handleInstagram}
        delay={400}
      />

      <Animated.View
        entering={FadeInDown.delay(500).duration(500).springify()}
        style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <ThemedText type="h4" style={styles.infoTitle}>
          Godziny pracy
        </ThemedText>
        <View style={styles.hoursRow}>
          <ThemedText type="body">Poniedziałek - Niedziela</ThemedText>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            24/7
          </ThemedText>
        </View>
        <ThemedText
          type="small"
          style={[styles.hoursNote, { color: theme.textSecondary }]}
        >
          Jesteśmy dostępni całą dobę, 7 dni w tygodniu
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(600).duration(500).springify()}
        style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <ThemedText type="h4" style={styles.infoTitle}>
          Obszar działania
        </ThemedText>
        <View style={styles.areaItem}>
          <Feather name="map-pin" size={18} color={Colors.dark.primary} />
          <ThemedText type="body" style={styles.areaText}>
            Poznań
          </ThemedText>
        </View>
        <View style={styles.areaItem}>
          <Feather name="map-pin" size={18} color={Colors.dark.primary} />
          <ThemedText type="body" style={styles.areaText}>
            Okolice Poznania
          </ThemedText>
        </View>
        <View style={styles.areaItem}>
          <Feather name="navigation" size={18} color={Colors.dark.primary} />
          <ThemedText type="body" style={styles.areaText}>
            Transfery dalekobieżne
          </ThemedText>
        </View>
      </Animated.View>
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
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    marginBottom: Spacing.xs,
  },
  contactValue: {
    marginBottom: 0,
  },
  infoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoTitle: {
    marginBottom: Spacing.lg,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  hoursNote: {
    marginTop: Spacing.sm,
  },
  areaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  areaText: {
    marginLeft: Spacing.md,
  },
});
