import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  users,
  rides,
  type User,
  type Ride,
  type CreateRideData,
} from "../shared/schema";
import type { RideStatus } from "../shared/fleet";
import { createDb, type Db } from "./db";

export interface NewUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  marketingConsent: boolean;
}

export interface UserPatch {
  firstName?: string;
  lastName?: string;
  phone?: string;
  marketingConsent?: boolean;
}

export interface NewRide extends Omit<CreateRideData, "scheduledAt"> {
  scheduledAt: Date | null;
}

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: NewUser): Promise<User>;
  updateUser(id: string, patch: UserPatch): Promise<User | undefined>;
  createRide(userId: string, data: NewRide): Promise<Ride>;
  getRide(id: string): Promise<Ride | undefined>;
  listRidesForUser(userId: string): Promise<Ride[]>;
  listAllRides(): Promise<Ride[]>;
  updateRideStatus(
    id: string,
    status: RideStatus,
    onlyIfUserId?: string,
  ): Promise<Ride | undefined>;
}

const boolToText = (value: boolean | undefined) =>
  value === undefined ? undefined : value ? "true" : "false";

function toRide(row: typeof rides.$inferSelect): Ride {
  return row as Ride;
}

export class DbStorage implements IStorage {
  constructor(private db: Db) {}

  async getUserById(id: string) {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async getUserByEmail(email: string) {
    return this.db.query.users.findFirst({ where: eq(users.email, email) });
  }

  async createUser(data: NewUser) {
    const [user] = await this.db
      .insert(users)
      .values({ ...data, marketingConsent: boolToText(data.marketingConsent)! })
      .returning();
    return user;
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
    return user;
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
    return ride ? toRide(ride) : undefined;
  }

  async listRidesForUser(userId: string) {
    const rows = await this.db.query.rides.findMany({
      where: eq(rides.userId, userId),
      orderBy: desc(rides.createdAt),
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

  async updateRideStatus(
    id: string,
    status: RideStatus,
    onlyIfUserId?: string,
  ) {
    const where = onlyIfUserId
      ? and(eq(rides.id, id), eq(rides.userId, onlyIfUserId))
      : eq(rides.id, id);
    const [ride] = await this.db
      .update(rides)
      .set({ status, updatedAt: new Date() })
      .where(where)
      .returning();
    return ride ? toRide(ride) : undefined;
  }
}

// In-memory storage for local development without PostgreSQL. Data is lost on restart.
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private rides = new Map<string, Ride>();

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

  async createRide(userId: string, data: NewRide) {
    const now = new Date();
    const ride: Ride = {
      id: randomUUID(),
      userId,
      pickupAddress: data.pickupAddress,
      destinationAddress: data.destinationAddress,
      scheduledAt: data.scheduledAt,
      vehicleModel: data.vehicleModel,
      passengers: data.passengers,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      notes: data.notes ?? null,
      paymentMethod: data.paymentMethod,
      status: "pending",
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

  async listAllRides() {
    return Array.from(this.rides.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async updateRideStatus(
    id: string,
    status: RideStatus,
    onlyIfUserId?: string,
  ) {
    const ride = this.rides.get(id);
    if (!ride || (onlyIfUserId && ride.userId !== onlyIfUserId))
      return undefined;
    const updated = { ...ride, status, updatedAt: new Date() };
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
