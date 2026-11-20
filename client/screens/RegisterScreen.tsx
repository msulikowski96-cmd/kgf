import React, { useState } from "react";
import { StyleSheet, View, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { errorFeedback, successFeedback } from "@/lib/feedback";
import { isValidPhone } from "@shared/phone";
import { FLEET, type VehicleId } from "@shared/fleet";

type Field =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "password"
  | "confirm"
  | "terms"
  | "plate"
  | "carColor";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [terms, setTerms] = useState(false);
  const [asDriver, setAsDriver] = useState(false);
  const [vehicleModel, setVehicleModel] = useState<VehicleId>("model3");
  const [plate, setPlate] = useState("");
  const [carColor, setCarColor] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<Field, string>> = {};
    if (form.firstName.trim().length < 2) e.firstName = "Podaj imię";
    if (form.lastName.trim().length < 2) e.lastName = "Podaj nazwisko";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      e.email = "Podaj poprawny adres e-mail";
    if (!isValidPhone(form.phone))
      e.phone = "Podaj poprawny numer, np. 600 100 200";
    if (form.password.length < 8)
      e.password = "Hasło musi mieć co najmniej 8 znaków";
    if (form.confirm !== form.password) e.confirm = "Hasła nie są takie same";
    if (!terms) e.terms = "Zaakceptuj regulamin, aby założyć konto";
    if (asDriver && !/^[A-Za-z0-9 ]{4,10}$/.test(plate.trim()))
      e.plate = "Podaj numer rejestracyjny, np. PO 12345";
    if (asDriver && carColor.trim().length < 3)
      e.carColor = "Podaj kolor samochodu";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    setServerError("");
    if (!validate()) {
      errorFeedback();
      return;
    }
    try {
      setLoading(true);
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        marketingConsent: marketing,
        driver: asDriver
          ? { vehicleModel, plate: plate.trim(), carColor: carColor.trim() }
          : undefined,
      });
      successFeedback();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Nie udało się założyć konta",
      );
      errorFeedback();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + Spacing["2xl"] },
      ]}
    >
      <ThemedText type="h1">Załóż konto</ThemedText>
      <ThemedText color="secondary" style={styles.subtitle}>
        Twoje dane kontaktowe przekażemy kierowcy, aby mógł się z Tobą
        skontaktować przy odbiorze.
      </ThemedText>

      <ThemedText type="label" color="tertiary" style={styles.section}>
        Typ konta
      </ThemedText>
      <View
        style={[styles.segment, { backgroundColor: theme.backgroundSecondary }]}
      >
        {[false, true].map((driver) => (
          <Pressable
            key={String(driver)}
            onPress={() => setAsDriver(driver)}
            style={[
              styles.segmentItem,
              asDriver === driver && {
                backgroundColor: theme.backgroundTertiary,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: asDriver === driver }}
            testID={driver ? "register-driver" : "register-customer"}
          >
            <Feather
              name={driver ? "navigation" : "user"}
              size={15}
              color={asDriver === driver ? theme.text : theme.textSecondary}
            />
            <ThemedText
              type="small"
              color={asDriver === driver ? "primary" : "secondary"}
              style={styles.bold}
            >
              {driver ? "Jestem kierowcą" : "Zamawiam przejazdy"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText type="label" color="tertiary" style={styles.section}>
        Dane osobowe
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label="Imię"
            placeholder="Jan"
            value={form.firstName}
            onChangeText={set("firstName")}
            autoComplete="given-name"
            textContentType="givenName"
            error={errors.firstName}
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Nazwisko"
            placeholder="Kowalski"
            value={form.lastName}
            onChangeText={set("lastName")}
            autoComplete="family-name"
            textContentType="familyName"
            error={errors.lastName}
          />
        </View>
      </View>

      <ThemedText type="label" color="tertiary" style={styles.section}>
        Kontakt
      </ThemedText>
      <TextField
        label="Telefon"
        icon="phone"
        placeholder="600 100 200"
        value={form.phone}
        onChangeText={set("phone")}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        error={errors.phone}
        hint="Numer bez kierunkowego traktujemy jako polski (+48)"
      />
      <TextField
        label="E-mail"
        icon="mail"
        placeholder="jan@example.pl"
        value={form.email}
        onChangeText={set("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={errors.email}
      />

      {asDriver ? (
        <>
          <ThemedText type="label" color="tertiary" style={styles.section}>
            Twój samochód
          </ThemedText>
          <View style={styles.models}>
            {FLEET.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => setVehicleModel(v.id)}
                style={[
                  styles.model,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                  vehicleModel === v.id && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: vehicleModel === v.id }}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.bold,
                    vehicleModel === v.id && { color: theme.buttonText },
                  ]}
                >
                  {v.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <TextField
                label="Nr rejestracyjny"
                placeholder="PO 12345"
                value={plate}
                onChangeText={(t) => {
                  setPlate(t.toUpperCase());
                  setErrors((e) => ({ ...e, plate: undefined }));
                }}
                autoCapitalize="characters"
                error={errors.plate}
                testID="register-plate"
              />
            </View>
            <View style={styles.half}>
              <TextField
                label="Kolor"
                placeholder="Biała"
                value={carColor}
                onChangeText={(t) => {
                  setCarColor(t);
                  setErrors((e) => ({ ...e, carColor: undefined }));
                }}
                error={errors.carColor}
                testID="register-color"
              />
            </View>
          </View>
          <ThemedText type="caption" color="tertiary">
            Pasażer zobaczy model, kolor i numer rejestracyjny, aby łatwo Cię
            rozpoznać. Konto kierowcy zatwierdza dyspozytor.
          </ThemedText>
        </>
      ) : null}

      <ThemedText type="label" color="tertiary" style={styles.section}>
        Hasło
      </ThemedText>
      <TextField
        label="Hasło"
        icon="lock"
        placeholder="Minimum 8 znaków"
        value={form.password}
        onChangeText={set("password")}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.password}
      />
      <TextField
        label="Powtórz hasło"
        icon="lock"
        placeholder="Powtórz hasło"
        value={form.confirm}
        onChangeText={set("confirm")}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.confirm}
      />

      <Pressable
        style={styles.checkRow}
        onPress={() => {
          setTerms((t) => !t);
          setErrors((e) => ({ ...e, terms: undefined }));
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: errors.terms ? theme.error : theme.borderStrong },
            terms && {
              backgroundColor: theme.primary,
              borderColor: theme.primary,
            },
          ]}
        >
          {terms ? (
            <Feather name="check" size={14} color={theme.buttonText} />
          ) : null}
        </View>
        <ThemedText type="small" color="secondary" style={styles.checkText}>
          Akceptuję regulamin usługi i politykę prywatności
        </ThemedText>
      </Pressable>
      {errors.terms ? (
        <ThemedText
          type="caption"
          style={{ color: theme.error, marginBottom: Spacing.sm }}
        >
          {errors.terms}
        </ThemedText>
      ) : null}

      <View style={styles.switchRow}>
        <ThemedText type="small" color="secondary" style={styles.checkText}>
          Chcę otrzymywać informacje o promocjach (opcjonalnie)
        </ThemedText>
        <Switch
          value={marketing}
          onValueChange={setMarketing}
          trackColor={{ true: theme.success, false: theme.backgroundTertiary }}
        />
      </View>

      {serverError ? (
        <View
          style={[styles.serverError, { backgroundColor: theme.accentSoft }]}
        >
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.error, flex: 1 }}>
            {serverError}
          </ThemedText>
        </View>
      ) : null}

      <Button
        title={asDriver ? "Załóż konto kierowcy" : "Załóż konto"}
        onPress={handleRegister}
        loading={loading}
        style={styles.button}
      />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  subtitle: { marginTop: Spacing.sm },
  bold: { fontWeight: "600" },
  segment: { flexDirection: "row", borderRadius: BorderRadius.md, padding: 4 },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  models: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  model: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  section: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  row: { flexDirection: "row", gap: Spacing.md },
  half: { flex: 1 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.xs + 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  checkText: { flex: 1 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  serverError: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  button: { marginTop: Spacing.xl },
});
