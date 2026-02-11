import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InsertUser, LoginUser, UpdateProfile, UserResponse } from "../../shared/schema";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

// Token storage
const TOKEN_KEY = "auth_token";

export async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
}

// API client with auth headers
async function fetchWithAuth(
    endpoint: string,
    options: RequestInit = {},
): Promise<Response> {
    const token = await getToken();
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });
}

// Auth API
export async function register(data: InsertUser): Promise<{
    user: UserResponse;
    token: string;
}> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
    }

    return response.json();
}

export async function login(data: LoginUser): Promise<{
    user: UserResponse;
    token: string;
}> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
    }

    return response.json();
}

export async function getMe(): Promise<UserResponse> {
    const response = await fetchWithAuth("/api/auth/me");

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to get user");
    }

    return response.json();
}

// Profile API
export async function getProfile(): Promise<UserResponse> {
    const response = await fetchWithAuth("/api/profile");

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to get profile");
    }

    return response.json();
}

export async function updateProfile(data: UpdateProfile): Promise<UserResponse> {
    const response = await fetchWithAuth("/api/profile", {
        method: "PUT",
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
    }

    return response.json();
}
