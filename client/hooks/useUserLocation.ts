import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { LatLng } from "@shared/fleet";

export type UserLocation = LatLng & { heading?: number; accuracy?: number };
export type LocationStatus = "idle" | "granted" | "denied" | "unavailable";

async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Location.requestForegroundPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

function toUserLocation(pos: Location.LocationObject): UserLocation {
  const heading = pos.coords.heading;
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    heading: heading != null && heading >= 0 ? heading : undefined,
    accuracy: pos.coords.accuracy ?? undefined,
  };
}

// One position fix, asking for permission when needed
export async function getCurrentLocation(): Promise<UserLocation | null> {
  if (!(await ensurePermission())) return null;
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
    if (last) return toUserLocation(last);
  } catch {
    // Not supported everywhere (e.g. web); fall through to a fresh fix
  }
  try {
    return toUserLocation(
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
    );
  } catch {
    return null;
  }
}

/**
 * The phone's position. With `watch` it follows the user (driver mode);
 * otherwise it takes a single fix when the screen opens.
 */
export function useUserLocation({
  watch = false,
  enabled = true,
}: { watch?: boolean; enabled?: boolean } = {}) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const subscription = useRef<Location.LocationSubscription | null>(null);

  const refresh = useCallback(async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setLocation(loc);
      setStatus("granted");
    } else {
      setStatus((s) => (s === "granted" ? s : "denied"));
    }
    return loc;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      if (!(await ensurePermission())) {
        if (!cancelled) setStatus("denied");
        return;
      }
      if (!cancelled) setStatus("granted");
      if (!watch) {
        const loc = await getCurrentLocation();
        if (!cancelled) {
          if (loc) setLocation(loc);
          else setStatus("unavailable");
        }
        return;
      }
      try {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 10,
          },
          (pos) => setLocation(toUserLocation(pos)),
        );
        if (cancelled) sub.remove();
        else subscription.current = sub;
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    })();
    return () => {
      cancelled = true;
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [watch, enabled]);

  return { location, status, refresh };
}
