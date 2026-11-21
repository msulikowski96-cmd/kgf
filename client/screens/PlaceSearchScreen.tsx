import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { RideMap } from "@/components/map/RideMap";
import { useTheme } from "@/hooks/useTheme";
import { useUserLocation, getCurrentLocation } from "@/hooks/useUserLocation";
import { useBookingDraft } from "@/contexts/BookingDraftContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import {
  DEFAULT_CENTER,
  POPULAR_PLACES,
  type LatLng,
  type Place,
} from "@shared/fleet";
import * as api from "@/lib/api";
import { showMessage, tapFeedback } from "@/lib/feedback";
import type { RootStackParamList } from "@/navigation/types";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function PlaceRow({
  icon,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSecondary },
      ]}
      accessibilityRole="button"
      testID={testID}
    >
      <View
        style={[styles.rowIcon, { backgroundColor: theme.backgroundTertiary }]}
      >
        <Feather name={icon} size={16} color={theme.text} />
      </View>
      <View style={styles.flex}>
        <ThemedText numberOfLines={1} style={styles.bold}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" color="secondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PlaceSearchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "PlaceSearch">>();
  const draft = useBookingDraft();
  const isPickup = params.field === "pickup";
  const current = isPickup ? draft.pickup : draft.destination;

  const [query, setQuery] = useState("");
  const [mapMode, setMapMode] = useState(false);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const { location } = useUserLocation();
  const debounced = useDebounced(query.trim(), 350);
  const near = location ?? draft.pickup ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isPickup ? "Skąd jedziemy?" : "Dokąd jedziemy?",
    });
  }, [navigation, isPickup]);

  const search = useQuery({
    queryKey: ["geo", "search", debounced],
    queryFn: () => api.searchPlaces(debounced, near),
    enabled: debounced.length >= 3,
    staleTime: 5 * 60_000,
  });

  const debouncedCenter = useDebounced(center, 500);
  const reverse = useQuery({
    queryKey: [
      "geo",
      "reverse",
      debouncedCenter?.lat.toFixed(5),
      debouncedCenter?.lng.toFixed(5),
    ],
    queryFn: () => api.reverseGeocode(debouncedCenter!),
    enabled: mapMode && !!debouncedCenter,
    staleTime: 10 * 60_000,
  });

  const choose = (place: Place) => {
    if (isPickup) draft.setPickup(place);
    else draft.setDestination(place);
    if (params.then === "booking") {
      navigation.navigate("Main", {
        screen: "BookingTab",
        params: { screen: "Booking" },
      });
    } else {
      navigation.goBack();
    }
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const loc = location ?? (await getCurrentLocation());
      if (!loc) {
        showMessage(
          "Brak dostępu do lokalizacji",
          "Zezwól aplikacji na dostęp do lokalizacji albo wskaż miejsce na mapie.",
        );
        return;
      }
      const place = await api.reverseGeocode(loc).catch(() => null);
      choose(
        place ?? {
          name: "Moja lokalizacja",
          address: `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`,
          lat: loc.lat,
          lng: loc.lng,
        },
      );
    } finally {
      setLocating(false);
    }
  };

  if (mapMode) {
    const start = current ?? near ?? DEFAULT_CENTER;
    const place = reverse.data;
    const settling =
      !center ||
      !debouncedCenter ||
      center.lat !== debouncedCenter.lat ||
      reverse.isFetching;
    return (
      <View style={[styles.flex, { backgroundColor: theme.backgroundRoot }]}>
        <RideMap
          style={StyleSheet.absoluteFill}
          initialCenter={start}
          initialZoom={16}
          pickMode
          padding={{ top: 0, bottom: 190 }}
          onCenterChange={setCenter}
          markers={
            location
              ? [{ id: "me", kind: "me", lat: location.lat, lng: location.lng }]
              : []
          }
          testID="pick-map"
        />
        <View
          style={[
            styles.pickSheet,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <ThemedText type="label" color="tertiary">
            {isPickup ? "Miejsce odbioru" : "Cel podróży"}
          </ThemedText>
          <View style={styles.pickAddress}>
            {settling ? (
              <ActivityIndicator color={theme.textSecondary} />
            ) : (
              <>
                <ThemedText type="h4" numberOfLines={1}>
                  {place?.name ?? "Przesuń mapę"}
                </ThemedText>
                <ThemedText type="small" color="secondary" numberOfLines={1}>
                  {place?.address ?? ""}
                </ThemedText>
              </>
            )}
          </View>
          <View style={styles.pickButtons}>
            <Button
              title="Lista"
              icon="list"
              variant="secondary"
              onPress={() => setMapMode(false)}
              style={styles.pickBack}
            />
            <Button
              title="Potwierdź"
              icon="check"
              disabled={settling || !place}
              onPress={() => place && choose(place)}
              style={styles.flex}
              testID="pick-confirm"
            />
          </View>
        </View>
      </View>
    );
  }

  const results = debounced.length >= 3 ? search.data?.places : undefined;
  const popular = query.trim()
    ? []
    : POPULAR_PLACES.filter((p) => p.name !== current?.name);

  return (
    <View style={[styles.flex, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.searchBox}>
        <TextField
          icon={isPickup ? "circle" : "square"}
          placeholder={
            isPickup ? "Wpisz adres odbioru" : "Wpisz adres lub nazwę miejsca"
          }
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          testID="place-query"
        />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      >
        {!query.trim() ? (
          <>
            {isPickup ? (
              <PlaceRow
                icon="navigation"
                title={locating ? "Ustalam lokalizację…" : "Moja lokalizacja"}
                subtitle="Kierowca przyjedzie tam, gdzie jesteś"
                onPress={useMyLocation}
                testID="place-my-location"
              />
            ) : null}
            <PlaceRow
              icon="map-pin"
              title="Wskaż na mapie"
              subtitle="Przesuń mapę, aby ustawić pinezkę"
              onPress={() => setMapMode(true)}
              testID="place-map"
            />
          </>
        ) : null}

        {debounced.length >= 3 && search.isLoading ? (
          <ActivityIndicator color={theme.text} style={styles.loader} />
        ) : null}

        {results?.map((p, i) => (
          <PlaceRow
            key={`${p.lat},${p.lng},${i}`}
            icon="map-pin"
            title={p.name}
            subtitle={p.address}
            onPress={() => choose(p)}
            testID="place-result"
          />
        ))}

        {results && results.length === 0 ? (
          <View style={styles.note}>
            <ThemedText color="secondary">
              Nie znaleźliśmy tego adresu.
            </ThemedText>
          </View>
        ) : null}

        {search.data && !search.data.online && debounced.length >= 3 ? (
          <View style={styles.note}>
            <ThemedText type="small" color="secondary">
              Wyszukiwarka adresów jest chwilowo niedostępna. Wybierz miejsce na
              mapie lub z listy popularnych.
            </ThemedText>
          </View>
        ) : null}

        {query.trim() ? (
          <PlaceRow
            icon="map"
            title="Nie ma na liście? Wskaż na mapie"
            onPress={() => setMapMode(true)}
          />
        ) : null}

        {popular.length > 0 ? (
          <>
            <ThemedText type="label" color="tertiary" style={styles.section}>
              Popularne miejsca
            </ThemedText>
            {popular.map((p) => (
              <PlaceRow
                key={p.name}
                icon="star"
                title={p.name}
                subtitle={p.address}
                onPress={() => choose(p)}
                testID="place-popular"
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: "600" },
  searchBox: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  loader: { marginVertical: Spacing.lg },
  note: { padding: Spacing.lg },
  pickSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  pickAddress: {
    minHeight: 48,
    justifyContent: "center",
    marginVertical: Spacing.md,
  },
  pickButtons: { flexDirection: "row", gap: Spacing.sm },
  pickBack: { paddingHorizontal: Spacing.lg },
});
