// Live driver positions and the views of a ride shown to customers and drivers.

import type {
  Driver,
  DriverLocation,
  DriverPublic,
  Ride,
  RideView,
  User,
} from "../shared/schema";
import { ASSIGNED_STATUSES, type LatLng } from "../shared/fleet";
import { distanceKm } from "../shared/geo";
import type { IStorage } from "./storage";

// A position older than this means the driver's app is closed or offline
const LOCATION_TTL_MS = 2 * 60_000;
const ROAD_FACTOR = 1.35;
const CITY_SPEED_KMH = 30;

// Positions change every few seconds, so they live in memory, not in the database.
// After a server restart drivers simply send their position again.
const locations = new Map<string, DriverLocation>();

export function setDriverLocation(
  driverId: string,
  point: LatLng,
  heading?: number,
) {
  const previous = locations.get(driverId);
  locations.set(driverId, {
    lat: point.lat,
    lng: point.lng,
    heading: heading ?? previous?.heading ?? 0,
    updatedAt: Date.now(),
  });
}

export function getDriverLocation(driverId: string): DriverLocation | null {
  const loc = locations.get(driverId);
  if (!loc || Date.now() - loc.updatedAt > LOCATION_TTL_MS) return null;
  return loc;
}

export function clearDriverLocation(driverId: string) {
  locations.delete(driverId);
}

// Rough driving time in minutes between two points
export function etaMinutes(from: LatLng, to: LatLng): number {
  const km = distanceKm(from, to) * ROAD_FACTOR;
  return Math.max(1, Math.round((km / CITY_SPEED_KMH) * 60));
}

export function ridePickup(ride: Ride): LatLng | null {
  return ride.pickupLat != null && ride.pickupLng != null
    ? { lat: ride.pickupLat, lng: ride.pickupLng }
    : null;
}

export function rideDestination(ride: Ride): LatLng | null {
  return ride.destinationLat != null && ride.destinationLng != null
    ? { lat: ride.destinationLat, lng: ride.destinationLng }
    : null;
}

export function driverRating(driver: Driver): number | null {
  return driver.ratingCount > 0
    ? Math.round((driver.ratingSum / driver.ratingCount) * 10) / 10
    : null;
}

export async function buildRideView(
  storage: IStorage,
  ride: Ride,
): Promise<RideView> {
  if (!ride.driverId) return { ...ride, driver: null };
  const [user, driver] = await Promise.all([
    storage.getUserById(ride.driverId),
    storage.getDriver(ride.driverId),
  ]);
  if (!user || !driver) return { ...ride, driver: null };

  const assigned = ASSIGNED_STATUSES.includes(ride.status);
  // The customer sees the car only while the ride is in progress
  const location = assigned ? getDriverLocation(ride.driverId) : null;
  const target =
    ride.status === "in_progress" ? rideDestination(ride) : ridePickup(ride);
  const etaMin =
    location && target && ride.status !== "arrived"
      ? etaMinutes(location, target)
      : null;

  const view: DriverPublic = {
    id: user.id,
    firstName: user.firstName ?? "Kierowca",
    phone: assigned ? user.phone : null,
    vehicleModel: driver.vehicleModel,
    plate: driver.plate,
    carColor: driver.carColor,
    rating: driverRating(driver),
    ratingCount: driver.ratingCount,
    location,
    etaMin,
  };
  return { ...ride, driver: view };
}

// Approved drivers with the app open and a recent position
export async function availableDrivers(storage: IStorage) {
  const [all, active] = await Promise.all([
    storage.listDrivers(),
    storage.listActiveRides(),
  ]);
  const busy = new Set(
    active
      .filter((r) => r.driverId && r.status !== "confirmed")
      .map((r) => r.driverId!),
  );
  return all
    .filter((d) => d.status === "approved" && d.online && !busy.has(d.userId))
    .map((d) => ({ driver: d, location: getDriverLocation(d.userId) }))
    .filter(
      (d): d is { driver: Driver; location: DriverLocation } => !!d.location,
    );
}

export function displayName(user: User | undefined): string {
  if (!user) return "—";
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  );
}
