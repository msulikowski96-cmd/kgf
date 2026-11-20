import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  index,
  boolean,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  VEHICLE_IDS,
  PAYMENT_METHODS,
  RIDE_STATUSES,
  type PaymentMethod,
  type RideStatus,
  type VehicleId,
} from "./fleet";
import { isValidPhone, normalizePhone } from "./phone";

// ---------- Tables ----------

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  avatarUrl: text("avatar_url"),
  loyaltyPoints: varchar("loyalty_points", { length: 50 })
    .default("0")
    .notNull(),
  marketingConsent: varchar("marketing_consent", { length: 10 })
    .default("false")
    .notNull(),
  pushNotifications: varchar("push_notifications", { length: 10 })
    .default("true")
    .notNull(),
  // "customer" or "driver"
  role: text("role").default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rides = pgTable(
  "rides",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pickupAddress: text("pickup_address").notNull(),
    destinationAddress: text("destination_address").notNull(),
    // null means "as soon as possible"
    scheduledAt: timestamp("scheduled_at"),
    vehicleModel: text("vehicle_model").notNull(),
    passengers: integer("passengers").default(1).notNull(),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    notes: text("notes"),
    paymentMethod: text("payment_method").default("card").notNull(),
    status: text("status").default("pending").notNull(),
    // Coordinates are null only for rides created before the map existed
    pickupLat: doublePrecision("pickup_lat"),
    pickupLng: doublePrecision("pickup_lng"),
    destinationLat: doublePrecision("destination_lat"),
    destinationLng: doublePrecision("destination_lng"),
    distanceKm: doublePrecision("distance_km"),
    durationMin: integer("duration_min"),
    estimatedPrice: integer("estimated_price"),
    // Route polyline as [lat, lng] pairs
    route: jsonb("route").$type<[number, number][]>(),
    driverId: varchar("driver_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    rating: integer("rating"),
    ratingComment: text("rating_comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("rides_user_id_idx").on(table.userId),
    index("rides_driver_id_idx").on(table.driverId),
    index("rides_status_idx").on(table.status),
  ],
);

export const drivers = pgTable("drivers", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  vehicleModel: text("vehicle_model").notNull(),
  plate: text("plate").notNull(),
  carColor: text("car_color").notNull(),
  // "pending" (waiting for the dispatcher), "approved" or "blocked"
  status: text("status").default("pending").notNull(),
  online: boolean("online").default(false).notNull(),
  ratingSum: integer("rating_sum").default(0).notNull(),
  ratingCount: integer("rating_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserRole = "customer" | "driver";
export type DriverStatus = "pending" | "approved" | "blocked";

export type User = Omit<typeof users.$inferSelect, "role"> & {
  role: UserRole;
};
export type UserResponse = Omit<User, "password">;
export type Ride = Omit<
  typeof rides.$inferSelect,
  "paymentMethod" | "status" | "vehicleModel"
> & {
  paymentMethod: PaymentMethod;
  status: RideStatus;
  vehicleModel: VehicleId;
};
export type Driver = Omit<
  typeof drivers.$inferSelect,
  "status" | "vehicleModel"
> & {
  status: DriverStatus;
  vehicleModel: VehicleId;
};

// Live position of a driver, kept in memory on the server
export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  updatedAt: number;
}

// What the customer sees about the assigned driver
export interface DriverPublic {
  id: string;
  firstName: string;
  phone: string | null;
  vehicleModel: VehicleId;
  plate: string;
  carColor: string;
  rating: number | null;
  ratingCount: number;
  location: DriverLocation | null;
  // Minutes until the driver reaches the pickup point
  etaMin: number | null;
}

// What the driver sees about the customer
export interface PassengerPublic {
  firstName: string;
}

export type RideView = Ride & {
  driver: DriverPublic | null;
};

// ---------- Validation ----------

const phoneSchema = z
  .string({ required_error: "Podaj numer telefonu" })
  .refine(isValidPhone, "Podaj poprawny numer telefonu, np. 600 100 200")
  .transform(normalizePhone);

const nameSchema = (label: string) =>
  z
    .string({ required_error: `Podaj ${label}` })
    .trim()
    .min(
      2,
      `${label[0].toUpperCase()}${label.slice(1)} musi mieć co najmniej 2 znaki`,
    )
    .max(50, `${label[0].toUpperCase()}${label.slice(1)} jest za długie`);

const plateSchema = z
  .string({ required_error: "Podaj numer rejestracyjny" })
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/\s+/g, " "))
  .refine(
    (v) => /^[A-Z0-9 ]{4,10}$/.test(v),
    "Podaj poprawny numer rejestracyjny, np. PO 12345",
  );

const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const emailSchema = z
  .string({ required_error: "Podaj adres e-mail" })
  .trim()
  .toLowerCase()
  .email("Podaj poprawny adres e-mail");

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string({ required_error: "Podaj hasło" })
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(100, "Hasło jest za długie"),
  firstName: nameSchema("imię"),
  lastName: nameSchema("nazwisko"),
  phone: phoneSchema,
  marketingConsent: z.boolean().optional(),
  // Present when the person signs up as a driver
  driver: z
    .object({
      vehicleModel: z.enum(VEHICLE_IDS, {
        errorMap: () => ({ message: "Wybierz model samochodu" }),
      }),
      plate: plateSchema,
      carColor: z
        .string({ required_error: "Podaj kolor samochodu" })
        .trim()
        .min(3, "Podaj kolor samochodu")
        .max(30, "Nazwa koloru jest za długa"),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "Podaj hasło" }).min(1, "Podaj hasło"),
});

export const updateProfileSchema = z.object({
  firstName: nameSchema("imię").optional(),
  lastName: nameSchema("nazwisko").optional(),
  phone: phoneSchema.optional(),
  marketingConsent: z.boolean().optional(),
});

const addressSchema = (label: string) =>
  z
    .string({ required_error: `Podaj ${label}` })
    .trim()
    .min(3, `Podaj ${label}`)
    .max(200, "Adres jest za długi");

export const estimateSchema = z.object({
  pickup: latLngSchema,
  destination: latLngSchema,
});

export const createRideSchema = z.object({
  pickupAddress: addressSchema("miejsce odbioru"),
  destinationAddress: addressSchema("cel podróży"),
  pickup: latLngSchema,
  destination: latLngSchema,
  // ISO date string, or null/undefined for "now"
  scheduledAt: z
    .string()
    .datetime({ message: "Niepoprawna data" })
    .nullable()
    .optional(),
  vehicleModel: z.enum(VEHICLE_IDS, {
    errorMap: () => ({ message: "Wybierz model Tesli" }),
  }),
  passengers: z
    .number()
    .int()
    .min(1, "Minimum 1 pasażer")
    .max(6, "Maksymalnie 6 pasażerów"),
  contactName: z
    .string()
    .trim()
    .min(2, "Podaj imię osoby kontaktowej")
    .max(100),
  contactPhone: phoneSchema,
  notes: z
    .string()
    .trim()
    .max(500, "Uwagi mogą mieć maksymalnie 500 znaków")
    .optional(),
  paymentMethod: z.enum(
    Object.keys(PAYMENT_METHODS) as [PaymentMethod, ...PaymentMethod[]],
  ),
});

const rideStatusSchema = z.enum(
  Object.keys(RIDE_STATUSES) as [RideStatus, ...RideStatus[]],
);

export const updateRideStatusSchema = z.object({
  status: rideStatusSchema,
});

export const driverStatusUpdateSchema = z.object({
  status: rideStatusSchema,
});

export const rateRideSchema = z.object({
  rating: z.number().int().min(1, "Wybierz ocenę").max(5),
  comment: z.string().trim().max(300, "Komentarz jest za długi").optional(),
});

export const driverOnlineSchema = z.object({ online: z.boolean() });

export const driverLocationSchema = latLngSchema.extend({
  heading: z.number().min(0).max(360).optional(),
});

export const adminDriverSchema = z.object({
  status: z.enum(["pending", "approved", "blocked"]),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type CreateRideInput = z.input<typeof createRideSchema>;
export type CreateRideData = z.output<typeof createRideSchema>;
export type EstimateInput = z.input<typeof estimateSchema>;
export type RateRideInput = z.input<typeof rateRideSchema>;
