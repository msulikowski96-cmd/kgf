import type { VehicleId } from "@shared/fleet";

// Illustration settings per model
export const carVariant = (id: VehicleId) =>
  id === "modelY" || id === "modelX" ? "suv" : "sedan";

export const carColor = (id: VehicleId) =>
  ({
    model3: "#E5E5EA",
    modelY: "#8E9196",
    modelS: "#5C5C64",
    modelX: "#C8102E",
  })[id];
