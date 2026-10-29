// Tesla fleet and pricing. Shared by the server (validation) and the app (display).

export type VehicleId = "model3" | "modelY" | "modelS" | "modelX";

export interface Vehicle {
  id: VehicleId;
  name: string;
  tier: string;
  description: string;
  seats: number;
  luggage: number;
  // Prices in PLN
  baseFare: number;
  perKm: number;
  minimumFare: number;
}

export const FLEET: Vehicle[] = [
  {
    id: "model3",
    name: "Tesla Model 3",
    tier: "Premium",
    description: "Elegancki sedan na co dzień i do miasta",
    seats: 4,
    luggage: 2,
    baseFare: 15,
    perKm: 4.5,
    minimumFare: 40,
  },
  {
    id: "modelY",
    name: "Tesla Model Y",
    tier: "Premium SUV",
    description: "Więcej miejsca na bagaż, idealna na lotnisko",
    seats: 4,
    luggage: 3,
    baseFare: 18,
    perKm: 5,
    minimumFare: 50,
  },
  {
    id: "modelS",
    name: "Tesla Model S",
    tier: "Executive",
    description: "Flagowa limuzyna dla biznesu i okazji specjalnych",
    seats: 4,
    luggage: 2,
    baseFare: 25,
    perKm: 7,
    minimumFare: 80,
  },
  {
    id: "modelX",
    name: "Tesla Model X",
    tier: "Executive XL",
    description: "Drzwi Falcon Wing i miejsce dla 6 pasażerów",
    seats: 6,
    luggage: 4,
    baseFare: 30,
    perKm: 8,
    minimumFare: 100,
  },
];

export const VEHICLE_IDS = FLEET.map((v) => v.id) as [
  VehicleId,
  ...VehicleId[],
];

export function getVehicle(id: string): Vehicle | undefined {
  return FLEET.find((v) => v.id === id);
}

export const PAYMENT_METHODS = {
  card: "Karta u kierowcy",
  cash: "Gotówka",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const RIDE_STATUSES = {
  pending: "Oczekuje na potwierdzenie",
  confirmed: "Potwierdzony",
  in_progress: "W trakcie",
  completed: "Zakończony",
  cancelled: "Anulowany",
} as const;

export type RideStatus = keyof typeof RIDE_STATUSES;

// Statuses in which the customer can still cancel the ride
export const CANCELLABLE_STATUSES: RideStatus[] = ["pending", "confirmed"];
export const ACTIVE_STATUSES: RideStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
];

// How far ahead a ride can be scheduled
export const MAX_SCHEDULE_DAYS = 30;
