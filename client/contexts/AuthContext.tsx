import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { RegisterInput, UserResponse } from "@shared/schema";
import * as api from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UserResponse) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (await api.getToken()) setUser(await api.getMe());
      } catch (error) {
        // Only drop the session when the server rejects it, not on network errors
        if (error instanceof api.ApiError && error.status === 401)
          await api.removeToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const { user: userData, token } = await api.login({ email, password });
    await api.setToken(token);
    setUser(userData);
  }

  async function register(data: RegisterInput) {
    const { user: userData, token } = await api.register(data);
    await api.setToken(token);
    setUser(userData);
  }

  async function logout() {
    await api.removeToken();
    queryClient.clear();
    setUser(null);
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
        updateUser: setUser,
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
