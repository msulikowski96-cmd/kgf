import { useMemo } from "react";
import type { MapState, RideMapProps } from "@/components/map/mapTypes";

// Normalises the props into the state object the map page understands
export function useMapState({
  markers,
  route,
  fitPoints,
  fitKey,
  padding,
  pickMode,
}: RideMapProps): MapState {
  return useMemo(
    () => ({
      markers: markers ?? [],
      route: route ?? null,
      fitPoints: fitPoints ?? [],
      fitKey: fitKey ?? "",
      padding: padding ?? { top: 0, bottom: 0 },
      pickMode: !!pickMode,
    }),
    [markers, route, fitPoints, fitKey, padding, pickMode],
  );
}
