import React, { useState } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { Colors } from "../constants/theme";
import { useTheme } from "../hooks/useTheme";

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { theme } = useTheme();

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Proszę podać email i hasło");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await login(email, password);
        } catch (err: any) {
            setError(err.message || "Błąd logowania");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>Zaloguj się</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Wpisz swój adres e-mail, aby kontynuować
                    </Text>
                </View>

                <View style={styles.form}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[
                                styles.minimalInput,
                                { color: theme.text, backgroundColor: theme.backgroundSecondary },
                            ]}
                            placeholder="Email"
                            placeholderTextColor={theme.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[
                                styles.minimalInput,
                                { color: theme.text, backgroundColor: theme.backgroundSecondary },
                            ]}
                            placeholder="Hasło"
                            placeholderTextColor={theme.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: "#000" }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Dalej</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                            Nie masz konta?{" "}
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                            <Text style={[styles.footerLink, { color: "#276EF1" }]}>Zarejestruj się</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 100,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 18,
        lineHeight: 24,
    },
    form: {
        width: "100%",
    },
    inputGroup: {
        marginBottom: 12,
    },
    minimalInput: {
        height: 56,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: "500",
    },
    loginButton: {
        height: 56,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
    },
    loginButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
    errorText: {
        color: "#E11900",
        fontSize: 14,
        marginBottom: 16,
        textAlign: "center",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 32,
    },
    footerText: {
        fontSize: 15,
    },
    footerLink: {
        fontSize: 15,
        fontWeight: "700",
    },
});
