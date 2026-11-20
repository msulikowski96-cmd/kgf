import { randomUUID } from "crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  users,
  rides,
  drivers,
  type User,
  type Ride,
  type Driver,
  type DriverStatus,
  type UserRole,
} from "../shared/schema";
import {
  ACTIVE_STATUSES,
  type PaymentMethod,
  type RideStatus,
  type VehicleId,
} from "../shared/fleet";
import { createDb, type Db } from "./db";

export interface NewUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingConsent: boolean;
  role: UserRole;
}

export interface UserPatch {
  firstName?: string;
  lastName?: string;
  phone?: string;
  marketingConsent?: boolean;
}

export interface NewDriver {
  vehicleModel: VehicleId;
  plate: string;
  carColor: string;
  status: DriverStatus;
}

export interface DriverPatch {
  status?: DriverStatus;
  online?: boolean;
}

export interface NewRide {
  pickupAddress: string;
  destinationAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  durationMin: number;
  estimatedPrice: number;
  route: [number, number][];
  scheduledAt: Date | null;
  vehicleModel: VehicleId;
  passengers: number;
  contactName: string;
  contactPhone: string;
  notes?: string;
  paymentMethod: PaymentMethod;
}

export type RidePatch = Partial<
  Pick<
    Ride,
    | "status"
    | "driverId"
    | "acceptedAt"
    | "startedAt"
    | "completedAt"
    | "rating"
    | "ratingComment"
  >
>;

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: NewUser): Promise<User>;
  updateUser(id: string, patch: UserPatch): Promise<User | undefined>;

  createDriver(userId: string, data: NewDriver): Promise<Driver>;
  getDriver(userId: string): Promise<Driver | undefined>;
  listDrivers(): Promise<Driver[]>;
  updateDriver(userId: string, patch: DriverPatch): Promise<Driver | undefined>;
  addDriverRating(userId: string, rating: number): Promise<void>;

  createRide(userId: string, data: NewRide): Promise<Ride>;
  getRide(id: string): Promise<Ride | undefined>;
  listRidesForUser(userId: string): Promise<Ride[]>;
  listRidesForDriver(driverId: string): Promise<Ride[]>;
  listOpenRides(): Promise<Ride[]>;
  // Rides that are not completed or cancelled yet
  listActiveRides(): Promise<Ride[]>;
  listAllRides(): Promise<Ride[]>;
  /**
   * Updates a ride only when it is still in one of `expectedStatuses`
   * (and, when given, still assigned to `expectedDriverId`).
   * Returns undefined when someone else changed it first.
   */
  updateRide(
    id: string,
    patch: RidePatch,
    expected?: { statuses?: RideStatus[]; driverId?: string | null },
  ): Promise<Ride | undefined>;
}

const boolToText = (value: boolean | undefined) =>
  value === undefined ? undefined : value ? "true" : "false";

const toUser = (row: typeof users.$inferSelect) => row as User;
const toRide = (row: typeof rides.$inferSelect) => row as Ride;
const toDriver = (row: typeof drivers.$inferSelect) => row as Driver;

export class DbStorage implements IStorage {
  constructor(private db: Db) {}

  async getUserById(id: string) {
    const row = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return row && toUser(row);
  }

  async getUserByEmail(email: string) {
    const row = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
    return row && toUser(row);
  }

  async createUser(data: NewUser) {
    const [user] = await this.db
      .insert(users)
      .values({ ...data, marketingConsent: boolToText(data.marketingConsent)! })
      .returning();
    return toUser(user);
  }

  async updateUser(id: string, patch: UserPatch) {
    const [user] = await this.db
      .update(users)
      .set({
        ...patch,
        marketingConsent: boolToText(patch.marketingConsent),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user && toUser(user);
  }

  async createDriver(userId: string, data: NewDriver) {
    const [driver] = await this.db
      .insert(drivers)
      .values({ ...data, userId })
      .returning();
    return toDriver(driver);
  }

  async getDriver(userId: string) {
    const row = await this.db.query.drivers.findFirst({
      where: eq(drivers.userId, userId),
    });
    return row && toDriver(row);
  }

  async listDrivers() {
    const rows = await this.db.query.drivers.findMany({
      orderBy: desc(drivers.createdAt),
    });
    return rows.map(toDriver);
  }

  async updateDriver(userId: string, patch: DriverPatch) {
    const [driver] = await this.db
      .update(drivers)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(drivers.userId, userId))
      .returning();
    return driver && toDriver(driver);
  }

  async addDriverRating(userId: string, rating: number) {
    await this.db
      .update(drivers)
      .set({
        ratingSum: sql`${drivers.ratingSum} + ${rating}`,
        ratingCount: sql`${drivers.ratingCount} + 1`,
      })
      .where(eq(drivers.userId, userId));
  }

  async createRide(userId: string, data: NewRide) {
    const [ride] = await this.db
      .insert(rides)
      .values({ ...data, userId })
      .returning();
    return toRide(ride);
  }

  async getRide(id: string) {
    const ride = await this.db.query.rides.findFirst({
      where: eq(rides.id, id),
    });
    return ride && toRide(ride);
  }

  async listRidesForUser(userId: string) {
    const rows = await this.db.query.rides.findMany({
      where: eq(rides.userId, userId),
      orderBy: desc(rides.createdAt),
    });
    return rows.map(toRide);
  }

  async listRidesForDriver(driverId: string) {
    const rows = await this.db.query.rides.findMany({
      where: eq(rides.driverId, driverId),
      orderBy: desc(rides.createdAt),
      limit: 200,
    });
    return rows.map(toRide);
  }

  async listOpenRides() {
    const rows = await this.db.query.rides.findMany({
      where: and(eq(rides.status, "pending"), isNull(rides.driverId)),
      orderBy: desc(rides.createdAt),
      limit: 200,
    });
    return rows.map(toRide);
  }

  async listActiveRides() {
    const rows = await this.db.query.rides.findMany({
      where: inArray(rides.status, ACTIVE_STATUSES),
      orderBy: desc(rides.createdAt),
      limit: 500,
    });
    return rows.map(toRide);
  }

  async listAllRides() {
    const rows = await this.db.query.rides.findMany({
      orderBy: desc(rides.createdAt),
      limit: 500,
    });
    return rows.map(toRide);
  }

  async updateRide(
    id: string,
    patch: RidePatch,
    expected?: { statuses?: RideStatus[]; driverId?: string | null },
  ) {
    const conditions = [eq(rides.id, id)];
    if (expected?.statuses)
      conditions.push(inArray(rides.status, expected.statuses));
    if (expected?.driverId === null) conditions.push(isNull(rides.driverId));
    else if (expected?.driverId)
      conditions.push(eq(rides.driverId, expected.driverId));
    const [ride] = await this.db
      .update(rides)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();
    return ride && toRide(ride);
  }
}

// In-memory storage for local development without PostgreSQL. Data is lost on restart.
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private rides = new Map<string, Ride>();
  private drivers = new Map<string, Driver>();

  async getUserById(id: string) {
    return this.users.get(id);
  }

  async getUserByEmail(email: string) {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  async createUser(data: NewUser) {
    const now = new Date();
    const user: User = {
      id: randomUUID(),
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: null,
      city: null,
      postalCode: null,
      avatarUrl: null,
      loyaltyPoints: "0",
      marketingConsent: boolToText(data.marketingConsent)!,
      pushNotifications: "true",
      role: data.role,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, patch: UserPatch) {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      firstName: patch.firstName ?? user.firstName,
      lastName: patch.lastName ?? user.lastName,
      phone: patch.phone ?? user.phone,
      marketingConsent:
        boolToText(patch.marketingConsent) ?? user.marketingConsent,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async createDriver(userId: string, data: NewDriver) {
    const now = new Date();
    const driver: Driver = {
      userId,
      ...data,
      online: false,
      ratingSum: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.drivers.set(userId, driver);
    return driver;
  }

  async getDriver(userId: string) {
    return this.drivers.get(userId);
  }

  async listDrivers() {
    return Array.from(this.drivers.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async updateDriver(userId: string, patch: DriverPatch) {
    const driver = this.drivers.get(userId);
    if (!driver) return undefined;
    const updated: Driver = {
      ...driver,
      status: patch.status ?? driver.status,
      online: patch.online ?? driver.online,
      updatedAt: new Date(),
    };
    this.drivers.set(userId, updated);
    return updated;
  }

  async addDriverRating(userId: string, rating: number) {
    const driver = this.drivers.get(userId);
    if (!driver) return;
    this.drivers.set(userId, {
      ...driver,
      ratingSum: driver.ratingSum + rating,
      ratingCount: driver.ratingCount + 1,
    });
  }

  async createRide(userId: string, data: NewRide) {
    const now = new Date();
    const ride: Ride = {
      id: randomUUID(),
      userId,
      pickupAddress: data.pickupAddress,
      destinationAddress: data.destinationAddress,
      pickupLat: data.pickupLat,
      pickupLng: data.pickupLng,
      destinationLat: data.destinationLat,
      destinationLng: data.destinationLng,
      distanceKm: data.distanceKm,
      durationMin: data.durationMin,
      estimatedPrice: data.estimatedPrice,
      route: data.route,
      scheduledAt: data.scheduledAt,
      vehicleModel: data.vehicleModel,
      passengers: data.passengers,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      notes: data.notes ?? null,
      paymentMethod: data.paymentMethod,
      status: "pending",
      driverId: null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      rating: null,
      ratingComment: null,
      createdAt: now,
      updatedAt: now,
    };
    this.rides.set(ride.id, ride);
    return ride;
  }

  async getRide(id: string) {
    return this.rides.get(id);
  }

  async listRidesForUser(userId: string) {
    return (await this.listAllRides()).filter((r) => r.userId === userId);
  }

  async listRidesForDriver(driverId: string) {
    return (await this.listAllRides()).filter((r) => r.driverId === driverId);
  }

  async listOpenRides() {
    return (await this.listAllRides()).filter(
      (r) => r.status === "pending" && !r.driverId,
    );
  }

  async listActiveRides() {
    return (await this.listAllRides()).filter((r) =>
      ACTIVE_STATUSES.includes(r.status),
    );
  }

  async listAllRides() {
    return Array.from(this.rides.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async updateRide(
    id: string,
    patch: RidePatch,
    expected?: { statuses?: RideStatus[]; driverId?: string | null },
  ) {
    const ride = this.rides.get(id);
    if (!ride) return undefined;
    if (expected?.statuses && !expected.statuses.includes(ride.status))
      return undefined;
    if (expected?.driverId !== undefined && ride.driverId !== expected.driverId)
      return undefined;
    const updated: Ride = { ...ride, ...patch, updatedAt: new Date() };
    this.rides.set(id, updated);
    return updated;
  }
}

export function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    return new DbStorage(createDb(process.env.DATABASE_URL));
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production.");
  }
  console.warn(
    "DATABASE_URL is not set - using in-memory storage. Accounts and rides will be lost on restart.",
  );
  return new MemStorage();
}
