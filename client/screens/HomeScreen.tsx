import React from "react";
import { StyleSheet, View, Pressable, ScrollView, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { TabScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { TeslaCar } from "@/components/TeslaCar";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { COMPANY } from "@/constants/company";
import {
  FLEET,
  ACTIVE_STATUSES,
  getVehicle,
  type VehicleId,
} from "@shared/fleet";
import * as api from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { formatPrice, formatRideTime } from "@/lib/format";
import { carColor, carVariant } from "@/lib/vehicleStyle";

const FEATURES: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text: string;
}[] = [
  {
    icon: "zap",
    title: "100% elektrycznie",
    text: "Cisza w kabinie i zero emisji",
  },
  {
    icon: "shield",
    title: "Licencjonowani kierowcy",
    text: "Doświadczeni i dyskretni",
  },
  { icon: "clock", title: "Punktualność", text: "Odbiór o umówionej godzinie" },
  {
    icon: "coffee",
    title: "Komfort premium",
    text: "Woda, ładowarki, klimatyzacja",
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { data: rides } = useQuery({
    queryKey: queryKeys.rides,
    queryFn: api.getRides,
    refetchInterval: 30_000,
  });
  const activeRide = rides?.find((r) => ACTIVE_STATUSES.includes(r.status));

  const book = (vehicle?: VehicleId) =>
    navigation.navigate("Main", {
      screen: "BookingTab",
      params: { screen: "Booking", params: vehicle ? { vehicle } : undefined },
    });

  return (
    <TabScreenScrollView>
      <Animated.View entering={FadeInDown.duration(500)}>
        <ThemedText type="h2">
          Dzień dobry{user?.firstName ? `, ${user.firstName}` : ""}
        </ThemedText>
        <ThemedText color="secondary" style={styles.greetingSub}>
          Dokąd dziś jedziemy?
        </ThemedText>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={[
          styles.hero,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText type="label" color="accent">
          {COMPANY.area} · {COMPANY.hours}
        </ThemedText>
        <ThemedText type="h3" style={styles.heroTitle}>
          Przejazdy premium Teslą
        </ThemedText>
        <View style={styles.heroCar}>
          <TeslaCar width={300} />
        </View>
        <Button
          title="Zamów przejazd"
          icon="navigation"
          onPress={() => book()}
          testID="home-book"
        />
      </Animated.View>

      {activeRide ? (
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <Pressable
            onPress={() =>
              navigation.navigate("RideDetails", { id: activeRide.id })
            }
            style={[
              styles.activeRide,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.borderStrong,
              },
            ]}
          >
            <View style={styles.activeHeader}>
              <ThemedText type="label" color="tertiary">
                Twój przejazd
              </ThemedText>
              <StatusBadge status={activeRide.status} />
            </View>
            <ThemedText type="h4">
              {formatRideTime(activeRide.scheduledAt)}
            </ThemedText>
            <ThemedText
              color="secondary"
              numberOfLines={1}
              style={styles.activeRoute}
            >
              {activeRide.pickupAddress} → {activeRide.destinationAddress}
            </ThemedText>
            <View style={styles.activeFooter}>
              <ThemedText type="small" color="tertiary">
                {getVehicle(activeRide.vehicleModel)?.name}
              </ThemedText>
              <Feather
                name="chevron-right"
                size={18}
                color={theme.textSecondary}
              />
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <ThemedText type="h4" style={styles.sectionTitle}>
        Nasza flota
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fleetList}
        style={styles.fleetScroll}
      >
        {FLEET.map((v, i) => (
          <Animated.View
            key={v.id}
            entering={FadeInDown.delay(200 + i * 60).duration(500)}
          >
            <Pressable
              onPress={() => book(v.id)}
              style={[
                styles.fleetCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText type="caption" color="accent">
                {v.tier.toUpperCase()}
              </ThemedText>
              <ThemedText type="h4" style={styles.fleetName}>
                {v.name.replace("Tesla ", "")}
              </ThemedText>
              <View style={styles.fleetCar}>
                <TeslaCar
                  width={170}
                  color={carColor(v.id)}
                  variant={carVariant(v.id)}
                />
              </View>
              <View style={styles.fleetMeta}>
                <Feather name="users" size={13} color={theme.textSecondary} />
                <ThemedText type="caption" color="secondary">
                  {v.seats}
                </ThemedText>
                <Feather
                  name="briefcase"
                  size={13}
                  color={theme.textSecondary}
                  style={styles.metaGap}
                />
                <ThemedText type="caption" color="secondary">
                  {v.luggage}
                </ThemedText>
              </View>
              <ThemedText type="small" style={styles.fleetPrice}>
                od {formatPrice(v.minimumFare)}
              </ThemedText>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Dlaczego KGF Premium
      </ThemedText>
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View
            key={f.title}
            style={[
              styles.feature,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name={f.icon} size={20} color={theme.text} />
            <ThemedText type="small" style={styles.featureTitle}>
              {f.title}
            </ThemedText>
            <ThemedText type="caption" color="secondary">
              {f.text}
            </ThemedText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => Linking.openURL(`tel:${COMPANY.phone}`)}
        style={[
          styles.call,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.callIcon,
            { backgroundColor: theme.backgroundTertiary },
          ]}
        >
          <Feather name="phone" size={18} color={theme.text} />
        </View>
        <View style={styles.callText}>
          <ThemedText type="small" color="secondary">
            Wolisz zamówić telefonicznie?
          </ThemedText>
          <ThemedText type="h4">{COMPANY.phoneDisplay}</ThemedText>
        </View>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>
    </TabScreenScrollView>
  );
}

const styles = StyleSheet.create({
  greetingSub: { marginTop: Spacing.xs },
  hero: {
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  heroTitle: { marginTop: Spacing.sm },
  heroCar: { alignItems: "center", marginVertical: Spacing.lg },
  activeRide: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  activeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  activeRoute: { marginTop: Spacing.xs },
  activeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  sectionTitle: { marginTop: Spacing["2xl"], marginBottom: Spacing.md },
  fleetScroll: { marginHorizontal: -Spacing.lg },
  fleetList: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  fleetCard: {
    width: 200,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  fleetName: { marginTop: 2 },
  fleetCar: { alignItems: "center", marginVertical: Spacing.md },
  fleetMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaGap: { marginLeft: Spacing.sm },
  fleetPrice: { marginTop: Spacing.xs, fontWeight: "600" },
  features: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  feature: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  featureTitle: { fontWeight: "600", marginTop: Spacing.sm },
  call: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing["2xl"],
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  callText: { flex: 1, marginLeft: Spacing.md },
});
