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
  pending: "Szukamy kierowcy",
  confirmed: "Kierowca przypisany",
  en_route: "Kierowca w drodze",
  arrived: "Kierowca na miejscu",
  in_progress: "W trasie",
  completed: "Zakończony",
  cancelled: "Anulowany",
} as const;

export type RideStatus = keyof typeof RIDE_STATUSES;

// Statuses in which the customer can still cancel the ride
export const CANCELLABLE_STATUSES: RideStatus[] = [
  "pending",
  "confirmed",
  "en_route",
  "arrived",
];
export const ACTIVE_STATUSES: RideStatus[] = [
  "pending",
  "confirmed",
  "en_route",
  "arrived",
  "in_progress",
];
// A driver is assigned and the ride is not finished
export const ASSIGNED_STATUSES: RideStatus[] = [
  "confirmed",
  "en_route",
  "arrived",
  "in_progress",
];

// Allowed status changes made by the driver
export const DRIVER_TRANSITIONS: Partial<Record<RideStatus, RideStatus>> = {
  confirmed: "en_route",
  en_route: "arrived",
  arrived: "in_progress",
  in_progress: "completed",
};

// How far ahead a ride can be scheduled
export const MAX_SCHEDULE_DAYS = 30;

// Fare estimate for a route, rounded to whole złoty
export function estimateFare(vehicle: Vehicle, distanceKm: number): number {
  return Math.round(
    Math.max(
      vehicle.minimumFare,
      vehicle.baseFare + vehicle.perKm * distanceKm,
    ),
  );
}

// ---------- Map ----------

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  // Short name shown in bold, e.g. "Lotnisko Poznań-Ławica"
  name: string;
  // Full address line
  address: string;
}

// Default map centre: Poznań, Stary Rynek
export const DEFAULT_CENTER: LatLng = { lat: 52.4083, lng: 16.9335 };

// Quick picks shown before the user types and when the geocoder is unreachable
export const POPULAR_PLACES: Place[] = [
  {
    name: "Lotnisko Poznań-Ławica",
    address: "ul. Bukowska 285, Poznań",
    lat: 52.4211,
    lng: 16.8263,
  },
  {
    name: "Poznań Główny (dworzec PKP)",
    address: "ul. Dworcowa 2, Poznań",
    lat: 52.4022,
    lng: 16.9118,
  },
  {
    name: "Stary Rynek",
    address: "Stary Rynek, Poznań",
    lat: 52.4083,
    lng: 16.9335,
  },
  {
    name: "Międzynarodowe Targi Poznańskie",
    address: "ul. Głogowska 14, Poznań",
    lat: 52.4006,
    lng: 16.9087,
  },
  {
    name: "Stary Browar",
    address: "ul. Półwiejska 42, Poznań",
    lat: 52.4024,
    lng: 16.9264,
  },
  {
    name: "Jezioro Maltańskie",
    address: "ul. Termalna, Poznań",
    lat: 52.4031,
    lng: 16.9818,
  },
  {
    name: "Stadion Poznań (Enea Stadion)",
    address: "ul. Bułgarska 17, Poznań",
    lat: 52.3974,
    lng: 16.8587,
  },
  {
    name: "Posnania",
    address: "ul. Pleszewska 1, Poznań",
    lat: 52.3958,
    lng: 16.9564,
  },
];
