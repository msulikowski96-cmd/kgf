import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();

    const user: User = {
      // Required fields from insertUser
      email: insertUser.email,
      password: insertUser.password,

      // Optional fields - map undefined to null
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      phone: insertUser.phone ?? null,
      address: insertUser.address ?? null,
      city: insertUser.city ?? null,
      postalCode: insertUser.postalCode ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,

      // Fields with defaults
      id,
      loyaltyPoints: insertUser.loyaltyPoints ?? "0",
      marketingConsent: insertUser.marketingConsent ?? "false",
      pushNotifications: insertUser.pushNotifications ?? "true",
      createdAt: now,
      updatedAt: now
    };

    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
