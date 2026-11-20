import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type {
  CreateRideInput,
  Driver,
  DriverLocation,
  EstimateInput,
  LoginInput,
  RateRideInput,
  RegisterInput,
  RideView,
  UpdateProfileInput,
  UserResponse,
} from "@shared/schema";
import type { LatLng, Place, RideStatus, VehicleId } from "@shared/fleet";

const TOKEN_KEY = "auth_token";

/**
 * Resolves the API address.
 * - EXPO_PUBLIC_API_URL pointing at a real host is used as-is (production).
 * - In development, "localhost" is swapped for the computer running Expo,
 *   so the app also works on a physical phone in the same Wi-Fi network.
 */
function resolveApiUrl(): string {
  const configured = (
    process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000"
  ).replace(/\/$/, "");
  const url = new URL(configured);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!isLocal) return configured;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") url.hostname = window.location.hostname;
    return url.origin;
  }

  const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (devHost && devHost !== "localhost" && devHost !== "127.0.0.1") {
    url.hostname = devHost;
  } else if (Platform.OS === "android") {
    // Android emulator reaches the host computer at 10.0.2.2
    url.hostname = "10.0.2.2";
  }
  return url.origin;
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie",
    );
  }

  const isJson = response.headers
    .get("Content-Type")
    ?.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ||
        `Serwer zwrócił błąd (${response.status}). Spróbuj ponownie`,
    );
  }
  return body as T;
}

// ---------- Auth ----------

interface AuthResponse {
  user: UserResponse;
  token: string;
}

export function register(data: RegisterInput) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function login(data: LoginInput) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMe() {
  return request<UserResponse>("/api/auth/me");
}

export function updateProfile(data: UpdateProfileInput) {
  return request<UserResponse>("/api/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ---------- Map ----------

export function searchPlaces(query: string, near?: LatLng | null) {
  const params = new URLSearchParams({ q: query });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lng", String(near.lng));
  }
  return request<{ places: Place[]; online: boolean }>(
    `/api/geo/search?${params}`,
  );
}

export function reverseGeocode(point: LatLng) {
  return request<Place>(`/api/geo/reverse?lat=${point.lat}&lng=${point.lng}`);
}

export interface NearbyCar extends LatLng {
  id: string;
  heading: number;
  vehicleModel: VehicleId;
}

export function getNearbyCars(point: LatLng) {
  return request<NearbyCar[]>(
    `/api/drivers/nearby?lat=${point.lat}&lng=${point.lng}`,
  );
}

export interface Estimate {
  distanceKm: number;
  durationMin: number;
  route: [number, number][];
  exact: boolean;
  prices: Record<VehicleId, number>;
  pickupEtaMin: Record<VehicleId, number | null>;
}

export function getEstimate(data: EstimateInput) {
  return request<Estimate>("/api/rides/estimate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------- Rides ----------

type Dated<T, K extends keyof T> = Omit<T, K> & { [P in K]: string | null };

// Dates arrive as ISO strings over JSON
export type RideDto = Dated<
  RideView,
  "scheduledAt" | "acceptedAt" | "startedAt" | "completedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

export function createRide(data: CreateRideInput) {
  return request<RideDto>("/api/rides", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getRides() {
  return request<RideDto[]>("/api/rides");
}

export function getRide(id: string) {
  return request<RideDto>(`/api/rides/${encodeURIComponent(id)}`);
}

export function cancelRide(id: string) {
  return request<RideDto>(`/api/rides/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
}

export function rateRide(id: string, data: RateRideInput) {
  return request<RideDto>(`/api/rides/${encodeURIComponent(id)}/rate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------- Driver ----------

export type DriverProfileDto = Omit<Driver, "createdAt" | "updatedAt"> & {
  rating: number | null;
  location: DriverLocation | null;
  today: { rides: number; earnings: number };
};

// A ride as the driver sees it; the phone appears once the ride is accepted
export type DriverRideDto = Omit<RideDto, "driver" | "contactPhone"> & {
  contactPhone: string | null;
  distanceToPickupKm?: number | null;
  pickupEtaMin?: number | null;
};

export function getDriverProfile() {
  return request<DriverProfileDto>("/api/driver/me");
}

export function setDriverOnline(online: boolean) {
  return request<DriverProfileDto>("/api/driver/online", {
    method: "POST",
    body: JSON.stringify({ online }),
  });
}

export function sendDriverLocation(point: LatLng & { heading?: number }) {
  return request<{ ok: true }>("/api/driver/location", {
    method: "POST",
    body: JSON.stringify(point),
  });
}

export function getDriverOffers() {
  return request<DriverRideDto[]>("/api/driver/offers");
}

export function getDriverRides() {
  return request<DriverRideDto[]>("/api/driver/rides");
}

export function acceptRide(id: string) {
  return request<DriverRideDto>(
    `/api/driver/rides/${encodeURIComponent(id)}/accept`,
    { method: "POST" },
  );
}

export function updateDriverRideStatus(id: string, status: RideStatus) {
  return request<DriverRideDto>(
    `/api/driver/rides/${encodeURIComponent(id)}/status`,
    { method: "POST", body: JSON.stringify({ status }) },
  );
}

export function releaseRide(id: string) {
  return request<DriverRideDto>(
    `/api/driver/rides/${encodeURIComponent(id)}/release`,
    { method: "POST" },
  );
}
