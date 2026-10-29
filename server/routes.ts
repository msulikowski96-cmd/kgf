import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "fs";
import * as path from "path";
import { ZodError } from "zod";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createRideSchema,
  updateRideStatusSchema,
  type User,
  type UserResponse,
} from "../shared/schema";
import {
  getVehicle,
  CANCELLABLE_STATUSES,
  MAX_SCHEDULE_DAYS,
} from "../shared/fleet";
import { createStorage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateToken,
  authenticateAdmin,
} from "./auth";

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function publicUser(user: User): UserResponse {
  const { password: _password, ...rest } = user;
  return rest;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const storage = createStorage();

  // ---------- Auth ----------

  app.post("/api/auth/register", async (req, res) => {
    const data = registerSchema.parse(req.body);

    if (await storage.getUserByEmail(data.email)) {
      throw new HttpError(409, "Konto z tym adresem e-mail już istnieje");
    }

    const user = await storage.createUser({
      ...data,
      password: await hashPassword(data.password),
      marketingConsent: data.marketingConsent ?? false,
    });

    res
      .status(201)
      .json({ user: publicUser(user), token: generateToken(user.id) });
  });

  app.post("/api/auth/login", async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await storage.getUserByEmail(data.email);

    if (!user || !(await verifyPassword(data.password, user.password))) {
      throw new HttpError(401, "Niepoprawny e-mail lub hasło");
    }

    res.json({ user: publicUser(user), token: generateToken(user.id) });
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    const user = await storage.getUserById(req.userId!);
    if (!user)
      throw new HttpError(401, "Konto nie istnieje. Zaloguj się ponownie");
    res.json(publicUser(user));
  });

  // ---------- Profile ----------

  app.put("/api/profile", authenticateToken, async (req, res) => {
    const patch = updateProfileSchema.parse(req.body);
    const user = await storage.updateUser(req.userId!, patch);
    if (!user) throw new HttpError(404, "Nie znaleziono konta");
    res.json(publicUser(user));
  });

  // ---------- Rides ----------

  app.post("/api/rides", authenticateToken, async (req, res) => {
    const data = createRideSchema.parse(req.body);
    const vehicle = getVehicle(data.vehicleModel)!;

    if (data.passengers > vehicle.seats) {
      throw new HttpError(
        400,
        `${vehicle.name} zabiera maksymalnie ${vehicle.seats} pasażerów`,
      );
    }

    let scheduledAt: Date | null = null;
    if (data.scheduledAt) {
      scheduledAt = new Date(data.scheduledAt);
      const now = Date.now();
      // Small tolerance for clock differences between phone and server
      if (scheduledAt.getTime() < now - 5 * 60_000) {
        throw new HttpError(400, "Wybrany termin już minął");
      }
      if (scheduledAt.getTime() > now + MAX_SCHEDULE_DAYS * 24 * 60 * 60_000) {
        throw new HttpError(
          400,
          `Przejazd można zaplanować maksymalnie ${MAX_SCHEDULE_DAYS} dni naprzód`,
        );
      }
    }

    const ride = await storage.createRide(req.userId!, {
      ...data,
      notes: data.notes || undefined,
      scheduledAt,
    });
    res.status(201).json(ride);
  });

  app.get("/api/rides", authenticateToken, async (req, res) => {
    res.json(await storage.listRidesForUser(req.userId!));
  });

  app.get("/api/rides/:id", authenticateToken, async (req, res) => {
    const ride = await storage.getRide(String(req.params.id));
    if (!ride || ride.userId !== req.userId)
      throw new HttpError(404, "Nie znaleziono przejazdu");
    res.json(ride);
  });

  app.post("/api/rides/:id/cancel", authenticateToken, async (req, res) => {
    const ride = await storage.getRide(String(req.params.id));
    if (!ride || ride.userId !== req.userId)
      throw new HttpError(404, "Nie znaleziono przejazdu");
    if (!CANCELLABLE_STATUSES.includes(ride.status)) {
      throw new HttpError(409, "Tego przejazdu nie można już anulować");
    }
    res.json(await storage.updateRideStatus(ride.id, "cancelled", req.userId));
  });

  // ---------- Dispatcher ----------

  const adminPage = fs.readFileSync(
    path.resolve(process.cwd(), "server", "templates", "admin.html"),
    "utf-8",
  );
  app.get("/admin", (_req, res) => {
    res.type("html").send(adminPage);
  });

  app.get("/api/admin/rides", authenticateAdmin, async (_req, res) => {
    res.json(await storage.listAllRides());
  });

  app.patch("/api/admin/rides/:id", authenticateAdmin, async (req, res) => {
    const { status } = updateRideStatusSchema.parse(req.body);
    const ride = await storage.updateRideStatus(String(req.params.id), status);
    if (!ride) throw new HttpError(404, "Nie znaleziono przejazdu");
    res.json(ride);
  });

  // ---------- Errors ----------

  app.use("/api", (req: Request, res: Response) => {
    res.status(404).json({
      message: `API route ${req.method} ${req.originalUrl} not found`,
    });
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: err.errors[0]?.message ?? "Niepoprawne dane",
        errors: err.errors,
      });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ message: err.message });
    }
    const status = (err as { status?: number }).status;
    if (status && status >= 400 && status < 500) {
      return res.status(status).json({ message: "Niepoprawne zapytanie" });
    }
    console.error("Internal Server Error:", err);
    return res
      .status(500)
      .json({ message: "Wystąpił błąd serwera. Spróbuj ponownie" });
  });

  return createServer(app);
}
