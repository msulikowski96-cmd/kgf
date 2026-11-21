import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { z, ZodError } from "zod";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createRideSchema,
  estimateSchema,
  updateRideStatusSchema,
  driverStatusUpdateSchema,
  rateRideSchema,
  driverOnlineSchema,
  driverLocationSchema,
  adminDriverSchema,
  type Driver,
  type Ride,
  type User,
  type UserResponse,
} from "../shared/schema";
import {
  FLEET,
  getVehicle,
  estimateFare,
  ACTIVE_STATUSES,
  ASSIGNED_STATUSES,
  CANCELLABLE_STATUSES,
  DRIVER_TRANSITIONS,
  MAX_SCHEDULE_DAYS,
  type VehicleId,
} from "../shared/fleet";
import { distanceKm } from "../shared/geo";
import { createStorage, type RidePatch } from "./storage";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authenticateToken,
  authenticateAdmin,
} from "./auth";
import { searchPlaces, reverseGeocode, getRoute } from "./geo";
import {
  availableDrivers,
  buildRideView,
  clearDriverLocation,
  displayName,
  driverRating,
  etaMinutes,
  getDriverLocation,
  ridePickup,
  setDriverLocation,
} from "./dispatch";
import { DriverSimulator, demoDriversEnabled } from "./simulator";

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

// How far from the pickup point a driver still gets offers for "now" rides
const OFFER_RADIUS_KM = 30;
const NEARBY_RADIUS_KM = 15;

declare global {
  namespace Express {
    interface Request {
      driver?: Driver;
    }
  }
}

const pointQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

function autoApproveDrivers(): boolean {
  const flag = process.env.DRIVER_AUTO_APPROVE;
  if (flag !== undefined) return flag === "true" || flag === "1";
  return process.env.NODE_ENV !== "production";
}

// Stable, anonymous id for a car marker on the customer's map
function markerId(driverId: string) {
  return createHash("sha256")
    .update(`marker:${driverId}`)
    .digest("hex")
    .slice(0, 12);
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
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      password: await hashPassword(data.password),
      marketingConsent: data.marketingConsent ?? false,
      role: data.driver ? "driver" : "customer",
    });
    if (data.driver) {
      await storage.createDriver(user.id, {
        ...data.driver,
        status: autoApproveDrivers() ? "approved" : "pending",
      });
    }

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

  // ---------- Map ----------

  app.get("/api/geo/search", authenticateToken, async (req, res) => {
    const q = String(req.query.q ?? "").slice(0, 120);
    const near = pointQuery.safeParse(req.query);
    res.json(await searchPlaces(q, near.success ? near.data : undefined));
  });

  app.get("/api/geo/reverse", authenticateToken, async (req, res) => {
    res.json(await reverseGeocode(pointQuery.parse(req.query)));
  });

  // Free cars around a point, shown on the customer's map
  app.get("/api/drivers/nearby", authenticateToken, async (req, res) => {
    const point = pointQuery.parse(req.query);
    const cars = (await availableDrivers(storage))
      .filter(({ location }) => distanceKm(location, point) <= NEARBY_RADIUS_KM)
      .slice(0, 40)
      .map(({ driver, location }) => ({
        id: markerId(driver.userId),
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        vehicleModel: driver.vehicleModel,
      }));
    res.json(cars);
  });

  app.post("/api/rides/estimate", authenticateToken, async (req, res) => {
    const { pickup, destination } = estimateSchema.parse(req.body);
    const [route, free] = await Promise.all([
      getRoute(pickup, destination),
      availableDrivers(storage),
    ]);

    const prices = {} as Record<VehicleId, number>;
    const pickupEtaMin = {} as Record<VehicleId, number | null>;
    for (const v of FLEET) {
      prices[v.id] = estimateFare(v, route.distanceKm);
      const nearest = free
        .filter((d) => d.driver.vehicleModel === v.id)
        .map((d) => etaMinutes(d.location, pickup))
        .sort((a, b) => a - b)[0];
      pickupEtaMin[v.id] = nearest ?? null;
    }

    res.json({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      route: route.path,
      exact: route.exact,
      prices,
      pickupEtaMin,
    });
  });

  // ---------- Rides (customer) ----------

  const loadOwnRide = async (req: Request): Promise<Ride> => {
    const ride = await storage.getRide(String(req.params.id));
    if (!ride || ride.userId !== req.userId)
      throw new HttpError(404, "Nie znaleziono przejazdu");
    return ride;
  };

  app.post("/api/rides", authenticateToken, async (req, res) => {
    const data = createRideSchema.parse(req.body);
    const vehicle = getVehicle(data.vehicleModel)!;

    if (data.passengers > vehicle.seats) {
      throw new HttpError(
        400,
        `${vehicle.name} zabiera maksymalnie ${vehicle.seats} pasażerów`,
      );
    }
    if (distanceKm(data.pickup, data.destination) < 0.1) {
      throw new HttpError(400, "Miejsce odbioru i cel są zbyt blisko siebie");
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

    const active = (await storage.listRidesForUser(req.userId!)).filter(
      (r) => ACTIVE_STATUSES.includes(r.status) && !r.scheduledAt,
    );
    if (!scheduledAt && active.length > 0) {
      throw new HttpError(
        409,
        "Masz już aktywny przejazd. Zakończ go lub anuluj, zanim zamówisz kolejny",
      );
    }

    const route = await getRoute(data.pickup, data.destination);
    const ride = await storage.createRide(req.userId!, {
      pickupAddress: data.pickupAddress,
      destinationAddress: data.destinationAddress,
      pickupLat: data.pickup.lat,
      pickupLng: data.pickup.lng,
      destinationLat: data.destination.lat,
      destinationLng: data.destination.lng,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      estimatedPrice: estimateFare(vehicle, route.distanceKm),
      route: route.path,
      scheduledAt,
      vehicleModel: data.vehicleModel,
      passengers: data.passengers,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      notes: data.notes || undefined,
      paymentMethod: data.paymentMethod,
    });
    res.status(201).json(await buildRideView(storage, ride));
  });

  app.get("/api/rides", authenticateToken, async (req, res) => {
    const rides = (await storage.listRidesForUser(req.userId!)).slice(0, 100);
    res.json(await Promise.all(rides.map((r) => buildRideView(storage, r))));
  });

  app.get("/api/rides/:id", authenticateToken, async (req, res) => {
    res.json(await buildRideView(storage, await loadOwnRide(req)));
  });

  app.post("/api/rides/:id/cancel", authenticateToken, async (req, res) => {
    const ride = await loadOwnRide(req);
    const updated = await storage.updateRide(
      ride.id,
      { status: "cancelled" },
      { statuses: CANCELLABLE_STATUSES },
    );
    if (!updated)
      throw new HttpError(409, "Tego przejazdu nie można już anulować");
    res.json(await buildRideView(storage, updated));
  });

  app.post("/api/rides/:id/rate", authenticateToken, async (req, res) => {
    const { rating, comment } = rateRideSchema.parse(req.body);
    const ride = await loadOwnRide(req);
    if (ride.status !== "completed" || !ride.driverId)
      throw new HttpError(409, "Ocenić można tylko zakończony przejazd");
    if (ride.rating) throw new HttpError(409, "Ten przejazd jest już oceniony");
    const updated = await storage.updateRide(ride.id, {
      rating,
      ratingComment: comment || null,
    });
    await storage.addDriverRating(ride.driverId, rating);
    res.json(await buildRideView(storage, updated!));
  });

  // ---------- Driver ----------

  const requireDriver = async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    const driver = await storage.getDriver(req.userId!);
    if (!driver) throw new HttpError(403, "To konto nie jest kontem kierowcy");
    req.driver = driver;
    next();
  };

  const requireApproved = (
    req: Request,
    _res: Response,
    next: NextFunction,
  ) => {
    if (req.driver!.status === "blocked")
      throw new HttpError(403, "Konto kierowcy jest zablokowane");
    if (req.driver!.status !== "approved")
      throw new HttpError(
        403,
        "Konto kierowcy czeka na weryfikację przez dyspozytora",
      );
    next();
  };

  const driverOnly = [authenticateToken, requireDriver];
  const approvedDriver = [authenticateToken, requireDriver, requireApproved];

  // Ride as the driver sees it: customer contact only once the ride is theirs
  const driverRideView = (ride: Ride, driverId: string) => {
    const mine =
      ride.driverId === driverId && ASSIGNED_STATUSES.includes(ride.status);
    return {
      ...ride,
      contactName: mine ? ride.contactName : ride.contactName.split(" ")[0],
      contactPhone: mine ? ride.contactPhone : null,
      route: ride.route,
    };
  };

  app.get("/api/driver/me", ...driverOnly, async (req, res) => {
    const driver = req.driver!;
    const rides = await storage.listRidesForDriver(driver.userId);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = rides.filter(
      (r) =>
        r.status === "completed" &&
        r.completedAt &&
        r.completedAt >= startOfDay,
    );
    res.json({
      ...driver,
      rating: driverRating(driver),
      location: getDriverLocation(driver.userId),
      today: {
        rides: today.length,
        earnings: today.reduce((sum, r) => sum + (r.estimatedPrice ?? 0), 0),
      },
    });
  });

  app.post("/api/driver/online", ...approvedDriver, async (req, res) => {
    const { online } = driverOnlineSchema.parse(req.body);
    const driver = await storage.updateDriver(req.userId!, { online });
    if (!online) clearDriverLocation(req.userId!);
    res.json(driver);
  });

  app.post("/api/driver/location", ...approvedDriver, async (req, res) => {
    const { lat, lng, heading } = driverLocationSchema.parse(req.body);
    setDriverLocation(req.userId!, { lat, lng }, heading);
    res.json({ ok: true });
  });

  app.get("/api/driver/offers", ...approvedDriver, async (req, res) => {
    const driver = req.driver!;
    const location = getDriverLocation(driver.userId);
    const offers = (await storage.listOpenRides())
      .filter((r) => r.vehicleModel === driver.vehicleModel)
      .map((r) => {
        const pickup = ridePickup(r);
        const km = location && pickup ? distanceKm(location, pickup) : null;
        return {
          ...driverRideView(r, driver.userId),
          distanceToPickupKm: km === null ? null : Math.round(km * 10) / 10,
          pickupEtaMin:
            location && pickup ? etaMinutes(location, pickup) : null,
        };
      })
      // "Now" rides only near the driver; scheduled rides from anywhere
      .filter(
        (r) =>
          r.scheduledAt ||
          r.distanceToPickupKm === null ||
          r.distanceToPickupKm <= OFFER_RADIUS_KM,
      )
      .sort((a, b) => {
        if (!a.scheduledAt !== !b.scheduledAt) return a.scheduledAt ? 1 : -1;
        return (a.distanceToPickupKm ?? 99) - (b.distanceToPickupKm ?? 99);
      });
    res.json(offers);
  });

  app.get("/api/driver/rides", ...driverOnly, async (req, res) => {
    const rides = await storage.listRidesForDriver(req.userId!);
    res.json(rides.map((r) => driverRideView(r, req.userId!)));
  });

  app.post(
    "/api/driver/rides/:id/accept",
    ...approvedDriver,
    async (req, res) => {
      const driver = req.driver!;
      const ride = await storage.getRide(String(req.params.id));
      if (!ride) throw new HttpError(404, "Nie znaleziono zlecenia");
      if (ride.vehicleModel !== driver.vehicleModel)
        throw new HttpError(409, "To zlecenie jest dla innego modelu auta");
      if (ride.userId === driver.userId)
        throw new HttpError(409, "Nie możesz przyjąć własnego zamówienia");

      const scheduled = !!ride.scheduledAt;
      if (!scheduled) {
        if (!driver.online)
          throw new HttpError(409, "Włącz tryb online, aby przyjmować kursy");
        const busy = (await storage.listRidesForDriver(driver.userId)).some(
          (r) =>
            ASSIGNED_STATUSES.includes(r.status) && r.status !== "confirmed",
        );
        if (busy) throw new HttpError(409, "Najpierw zakończ bieżący przejazd");
      }

      const accepted = await storage.updateRide(
        ride.id,
        {
          driverId: driver.userId,
          status: scheduled ? "confirmed" : "en_route",
          acceptedAt: new Date(),
        },
        { statuses: ["pending"], driverId: null },
      );
      if (!accepted)
        throw new HttpError(409, "Ktoś inny przyjął już to zlecenie");
      res.json(driverRideView(accepted, driver.userId));
    },
  );

  app.post(
    "/api/driver/rides/:id/status",
    ...approvedDriver,
    async (req, res) => {
      const { status } = driverStatusUpdateSchema.parse(req.body);
      const ride = await storage.getRide(String(req.params.id));
      if (!ride || ride.driverId !== req.userId)
        throw new HttpError(404, "Nie znaleziono przejazdu");
      if (DRIVER_TRANSITIONS[ride.status] !== status)
        throw new HttpError(409, "Nie można zmienić statusu tego przejazdu");

      const patch: RidePatch = { status };
      if (status === "in_progress") patch.startedAt = new Date();
      if (status === "completed") patch.completedAt = new Date();
      const updated = await storage.updateRide(ride.id, patch, {
        statuses: [ride.status],
        driverId: req.userId!,
      });
      if (!updated)
        throw new HttpError(409, "Przejazd zmienił się w międzyczasie");
      res.json(driverRideView(updated, req.userId!));
    },
  );

  // The driver gives the ride back; it returns to the queue
  app.post(
    "/api/driver/rides/:id/release",
    ...approvedDriver,
    async (req, res) => {
      const ride = await storage.getRide(String(req.params.id));
      if (!ride || ride.driverId !== req.userId)
        throw new HttpError(404, "Nie znaleziono przejazdu");
      const updated = await storage.updateRide(
        ride.id,
        { status: "pending", driverId: null, acceptedAt: null },
        { statuses: ["confirmed", "en_route"], driverId: req.userId! },
      );
      if (!updated)
        throw new HttpError(
          409,
          "Nie można zrezygnować z przejazdu, który już się rozpoczął",
        );
      res.json(driverRideView(updated, req.userId!));
    },
  );

  // ---------- Dispatcher ----------

  const adminPage = fs.readFileSync(
    path.resolve(process.cwd(), "server", "templates", "admin.html"),
    "utf-8",
  );
  app.get("/admin", (_req, res) => {
    res.type("html").send(adminPage);
  });

  app.get("/api/admin/rides", authenticateAdmin, async (_req, res) => {
    const rides = await storage.listAllRides();
    const ids = [
      ...new Set(rides.flatMap((r) => [r.userId, r.driverId ?? r.userId])),
    ];
    const people = new Map(
      await Promise.all(
        ids.map(async (id) => [id, await storage.getUserById(id)] as const),
      ),
    );
    res.json(
      rides.map(({ route: _route, ...r }) => ({
        ...r,
        customerName: displayName(people.get(r.userId)),
        customerEmail: people.get(r.userId)?.email ?? null,
        driverName: r.driverId ? displayName(people.get(r.driverId)) : null,
      })),
    );
  });

  app.patch("/api/admin/rides/:id", authenticateAdmin, async (req, res) => {
    const { status } = updateRideStatusSchema.parse(req.body);
    const patch: RidePatch = { status };
    // Back to the queue: free the driver
    if (status === "pending") patch.driverId = null;
    const ride = await storage.updateRide(String(req.params.id), patch);
    if (!ride) throw new HttpError(404, "Nie znaleziono przejazdu");
    res.json(ride);
  });

  app.get("/api/admin/drivers", authenticateAdmin, async (_req, res) => {
    const list = await storage.listDrivers();
    res.json(
      await Promise.all(
        list.map(async (d) => {
          const user = await storage.getUserById(d.userId);
          return {
            ...d,
            name: displayName(user),
            email: user?.email ?? null,
            phone: user?.phone ?? null,
            rating: driverRating(d),
            location: getDriverLocation(d.userId),
          };
        }),
      ),
    );
  });

  app.patch("/api/admin/drivers/:id", authenticateAdmin, async (req, res) => {
    const { status } = adminDriverSchema.parse(req.body);
    const id = String(req.params.id);
    const driver = await storage.updateDriver(id, {
      status,
      ...(status !== "approved" ? { online: false } : {}),
    });
    if (!driver) throw new HttpError(404, "Nie znaleziono kierowcy");
    if (status !== "approved") clearDriverLocation(id);
    res.json(driver);
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

  if (demoDriversEnabled()) {
    await new DriverSimulator(storage).start();
  }

  return createServer(app);
}
