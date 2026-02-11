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
                    <Text style={[styles.title, { color: theme.text }]}>Witaj ponownie</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Zaloguj się do swojego konta
                    </Text>
                </View>

                <View style={styles.form}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
                        <TextInput
                            style={[
                                styles.input,
                                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                            ]}
                            placeholder="Twój email"
                            placeholderTextColor={theme.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Hasło</Text>
                        <TextInput
                            style={[
                                styles.input,
                                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                            ]}
                            placeholder="Twoje hasło"
                            placeholderTextColor={theme.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: Colors.dark.primary }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Zaloguj się</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                            Nie masz konta?{" "}
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                            <Text style={[styles.footerLink, { color: Colors.dark.primary }]}>Zarejestruj się</Text>
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
        justifyContent: "center",
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontFamily: "Nunito_700Bold",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: "Nunito_400Regular",
    },
    form: {
        width: "100%",
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontFamily: "Nunito_600SemiBold",
        marginBottom: 8,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        fontFamily: "Nunito_400Regular",
    },
    loginButton: {
        height: 54,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 24,
        shadowColor: Colors.dark.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        color: "#fff",
        fontSize: 16,
        fontFamily: "Nunito_700Bold",
    },
    errorText: {
        color: "#ff4444",
        fontSize: 14,
        fontFamily: "Nunito_400Regular",
        marginBottom: 16,
        textAlign: "center",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        fontFamily: "Nunito_400Regular",
    },
    footerLink: {
        fontSize: 14,
        fontFamily: "Nunito_700Bold",
    },
});
