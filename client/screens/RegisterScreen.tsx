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

export default function RegisterScreen({ navigation }: any) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const { theme } = useTheme();

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            setError("Proszę wypełnić wymagane pola");
            return;
        }

        if (password !== confirmPassword) {
            setError("Hasła nie są identyczne");
            return;
        }

        if (password.length < 6) {
            setError("Hasło musi mieć co najmniej 6 znaków");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await register({
                email,
                password,
                firstName,
                lastName,
            });
        } catch (err: any) {
            setError(err.message || "Błąd rejestracji");
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
                    <Text style={[styles.title, { color: theme.text }]}>Stwórz konto</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Dołącz do nas i zarządzaj swoimi rezerwacjami
                    </Text>
                </View>

                <View style={styles.form}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.row}>
                        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Imię</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                                ]}
                                placeholder="Imię"
                                placeholderTextColor={theme.textSecondary}
                                value={firstName}
                                onChangeText={setFirstName}
                            />
                        </View>
                        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Nazwisko</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                                ]}
                                placeholder="Nazwisko"
                                placeholderTextColor={theme.textSecondary}
                                value={lastName}
                                onChangeText={setLastName}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Email *</Text>
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
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Hasło *</Text>
                        <TextInput
                            style={[
                                styles.input,
                                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                            ]}
                            placeholder="Co najmniej 6 znaków"
                            placeholderTextColor={theme.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Potwierdź hasło *</Text>
                        <TextInput
                            style={[
                                styles.input,
                                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundDefault },
                            ]}
                            placeholder="Powtórz hasło"
                            placeholderTextColor={theme.textSecondary}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.registerButton, { backgroundColor: Colors.dark.primary }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.registerButtonText}>Zarejestruj się</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                            Masz już konto?{" "}
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                            <Text style={[styles.footerLink, { color: Colors.dark.primary }]}>Zaloguj się</Text>
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
        paddingTop: 60,
    },
    header: {
        marginBottom: 32,
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
    row: {
        flexDirection: "row",
        marginBottom: 16,
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
    registerButton: {
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
    registerButtonText: {
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
        marginBottom: 40,
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
