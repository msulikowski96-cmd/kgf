import React, { useRef, useState } from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { TeslaCar } from "@/components/TeslaCar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { errorFeedback } from "@/lib/feedback";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Podaj e-mail i hasło");
      errorFeedback();
      return;
    }
    try {
      setLoading(true);
      setError("");
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zalogować");
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
        {
          paddingTop: insets.top + Spacing["3xl"],
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <Animated.View entering={FadeInDown.duration(600)} style={styles.hero}>
        <Logo size="lg" />
        <View style={styles.car}>
          <TeslaCar width={300} />
        </View>
        <ThemedText type="h2" style={styles.center}>
          Przejazdy premium Teslą
        </ThemedText>
        <ThemedText color="secondary" style={[styles.center, styles.subtitle]}>
          Ciche, elektryczne i zawsze punktualne. Zaloguj się, aby zamówić
          przejazd.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(600)}>
        <TextField
          label="E-mail"
          icon="mail"
          placeholder="jan@example.pl"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          testID="login-email"
        />
        <TextField
          ref={passwordRef}
          label="Hasło"
          icon="lock"
          placeholder="Twoje hasło"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          testID="login-password"
        />

        {error ? (
          <ThemedText
            type="small"
            style={[styles.error, { color: theme.error }]}
          >
            {error}
          </ThemedText>
        ) : null}

        <Button
          title="Zaloguj się"
          onPress={handleLogin}
          loading={loading}
          style={styles.button}
        />

        <View style={styles.footer}>
          <ThemedText color="secondary">Nie masz konta? </ThemedText>
          <Pressable
            onPress={() => navigation.navigate("Register")}
            hitSlop={8}
          >
            <ThemedText type="link">Załóż konto</ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  car: {
    marginVertical: Spacing.xl,
  },
  center: { textAlign: "center" },
  subtitle: { marginTop: Spacing.sm, maxWidth: 320 },
  error: { marginBottom: Spacing.md, textAlign: "center" },
  button: { marginTop: Spacing.sm },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
});
