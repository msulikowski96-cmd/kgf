import type { StyleProp, ViewStyle } from "react-native";
import type { LatLng } from "@shared/fleet";

export type MarkerKind = "pickup" | "destination" | "car" | "me";

export interface MapMarker extends LatLng {
  id: string;
  kind: MarkerKind;
  // Car direction in degrees, 0 = north
  heading?: number;
  // Highlighted car (the assigned driver) is drawn larger and white
  highlight?: boolean;
}

export interface MapPadding {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}

export interface RideMapProps {
  markers?: MapMarker[];
  route?: [number, number][] | null;
  // Where the map opens before anything is fitted
  initialCenter?: LatLng;
  initialZoom?: number;
  /**
   * Points the camera should show. The camera moves only when `fitKey`
   * changes, so live updates of a car do not fight with the user panning.
   */
  fitPoints?: LatLng[];
  fitKey?: string;
  // Space covered by overlays (header, bottom sheet) that the map should avoid
  padding?: MapPadding;
  // Shows a pin in the middle of the map and reports where it points
  pickMode?: boolean;
  onCenterChange?: (center: LatLng) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Messages from the map page to the app
export type MapEvent =
  | { type: "ready" }
  | { type: "center"; lat: number; lng: number }
  | { type: "error"; message: string };

// State sent from the app to the map page
export interface MapState {
  markers: MapMarker[];
  route: [number, number][] | null;
  fitPoints: LatLng[];
  fitKey: string;
  padding: MapPadding;
  pickMode: boolean;
}
