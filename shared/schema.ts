import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  VEHICLE_IDS,
  PAYMENT_METHODS,
  RIDE_STATUSES,
  type PaymentMethod,
  type RideStatus,
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("rides_user_id_idx").on(table.userId)],
);

export type User = typeof users.$inferSelect;
export type UserResponse = Omit<User, "password">;
export type Ride = Omit<
  typeof rides.$inferSelect,
  "paymentMethod" | "status"
> & {
  paymentMethod: PaymentMethod;
  status: RideStatus;
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

export const createRideSchema = z.object({
  pickupAddress: addressSchema("miejsce odbioru"),
  destinationAddress: addressSchema("cel podróży"),
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

export const updateRideStatusSchema = z.object({
  status: z.enum(Object.keys(RIDE_STATUSES) as [RideStatus, ...RideStatus[]]),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type CreateRideInput = z.input<typeof createRideSchema>;
export type CreateRideData = z.output<typeof createRideSchema>;
