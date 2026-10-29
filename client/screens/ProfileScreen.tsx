import React, { useEffect, useState } from "react";
import { StyleSheet, View, Switch, Pressable, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TabScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { COMPANY } from "@/constants/company";
import { formatPhone, isValidPhone } from "@shared/phone";
import * as api from "@/lib/api";
import {
  confirmAction,
  errorFeedback,
  showMessage,
  successFeedback,
} from "@/lib/feedback";

function LinkRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <View
        style={[styles.linkIcon, { backgroundColor: theme.backgroundTertiary }]}
      >
        <Feather name={icon} size={16} color={theme.text} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="caption" color="tertiary">
          {title}
        </ThemedText>
        <ThemedText>{value}</ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={theme.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, logout, updateUser } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPhone(user?.phone ? formatPhone(user.phone) : "");
    setMarketing(user?.marketingConsent === "true");
    setErrors({});
  };
  useEffect(resetForm, [user]);

  const dirty =
    firstName !== (user?.firstName ?? "") ||
    lastName !== (user?.lastName ?? "") ||
    phone !== (user?.phone ? formatPhone(user.phone) : "") ||
    marketing !== (user?.marketingConsent === "true");

  const save = async () => {
    const e: typeof errors = {};
    if (firstName.trim().length < 2) e.firstName = "Podaj imię";
    if (lastName.trim().length < 2) e.lastName = "Podaj nazwisko";
    if (!isValidPhone(phone)) e.phone = "Podaj poprawny numer telefonu";
    setErrors(e);
    if (Object.keys(e).length) {
      errorFeedback();
      return;
    }
    try {
      setSaving(true);
      updateUser(
        await api.updateProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          marketingConsent: marketing,
        }),
      );
      successFeedback();
      showMessage("Zapisano", "Twoje dane kontaktowe zostały zaktualizowane.");
    } catch (err) {
      showMessage(
        "Nie udało się zapisać",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";

  return (
    <TabScreenScrollView>
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: theme.backgroundTertiary,
              borderColor: theme.borderStrong,
            },
          ]}
        >
          <ThemedText type="h3">{initials}</ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="h3">
            {user?.firstName} {user?.lastName}
          </ThemedText>
          <ThemedText color="secondary">{user?.email}</ThemedText>
        </View>
      </View>

      <ThemedText type="label" color="tertiary" style={styles.sectionTitle}>
        Dane kontaktowe
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Imię"
            value={firstName}
            onChangeText={setFirstName}
            error={errors.firstName}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label="Nazwisko"
            value={lastName}
            onChangeText={setLastName}
            error={errors.lastName}
          />
        </View>
      </View>
      <TextField
        label="Telefon"
        icon="phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        error={errors.phone}
        hint="Na ten numer dzwoni kierowca"
      />
      <TextField
        label="E-mail"
        icon="mail"
        value={user?.email ?? ""}
        editable={false}
        hint="Adresu e-mail nie można zmienić"
      />

      <View style={styles.switchRow}>
        <ThemedText type="small" color="secondary" style={styles.flex}>
          Informacje o promocjach
        </ThemedText>
        <Switch
          value={marketing}
          onValueChange={setMarketing}
          trackColor={{ true: theme.success, false: theme.backgroundTertiary }}
        />
      </View>

      {dirty ? (
        <View style={styles.actions}>
          <Button
            title="Cofnij"
            variant="ghost"
            onPress={resetForm}
            style={styles.flex}
          />
          <Button
            title="Zapisz zmiany"
            onPress={save}
            loading={saving}
            style={styles.flex}
          />
        </View>
      ) : null}

      <ThemedText type="label" color="tertiary" style={styles.sectionTitle}>
        Kontakt z {COMPANY.name}
      </ThemedText>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <LinkRow
          icon="phone"
          title={`Telefon · ${COMPANY.hours}`}
          value={COMPANY.phoneDisplay}
          onPress={() => Linking.openURL(`tel:${COMPANY.phone}`)}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <LinkRow
          icon="message-circle"
          title="SMS"
          value={COMPANY.phoneDisplay}
          onPress={() => Linking.openURL(`sms:${COMPANY.phone}`)}
        />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <LinkRow
          icon="instagram"
          title="Instagram"
          value={COMPANY.instagramHandle}
          onPress={() => Linking.openURL(COMPANY.instagramUrl)}
        />
      </View>

      <Button
        title="Wyloguj się"
        icon="log-out"
        variant="danger"
        style={styles.logout}
        onPress={() =>
          confirmAction({
            title: "Wylogować się?",
            message:
              "Aby zamówić przejazd, trzeba będzie zalogować się ponownie.",
            confirmText: "Wyloguj",
            destructive: true,
            onConfirm: logout,
          })
        }
      />
    </TabScreenScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { marginTop: Spacing["2xl"], marginBottom: Spacing.md },
  row: { flexDirection: "row", gap: Spacing.md },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  actions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth },
  logout: { marginTop: Spacing["2xl"] },
});
