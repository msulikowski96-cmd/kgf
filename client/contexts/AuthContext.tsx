import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { UserResponse } from "../../shared/schema";
import * as api from "../lib/api";

interface AuthContextType {
    user: UserResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (user: UserResponse) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const token = await api.getToken();
            if (token) {
                const userData = await api.getMe();
                setUser(userData);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            await api.removeToken();
        } finally {
            setIsLoading(false);
        }
    }

    async function login(email: string, password: string) {
        try {
            const { user: userData, token } = await api.login({ email, password });
            await api.setToken(token);
            setUser(userData);
        } catch (error) {
            throw error;
        }
    }

    async function register(data: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
    }) {
        try {
            const { user: userData, token } = await api.register(data);
            await api.setToken(token);
            setUser(userData);
        } catch (error) {
            throw error;
        }
    }

    async function logout() {
        await api.removeToken();
        setUser(null);
    }

    function updateUser(updatedUser: UserResponse) {
        setUser(updatedUser);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
