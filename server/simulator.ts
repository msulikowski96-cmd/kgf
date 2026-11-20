// Demo drivers: simulated cars that drive around Poznań, accept rides and
// complete them, so the app can be tried without real drivers on the road.
// Enabled with DEMO_DRIVERS=true (default outside production).
// Real drivers get a head start: a demo driver takes a ride only after
// DEMO_ACCEPT_DELAY_S seconds.

import { randomBytes } from "crypto";
import {
  DEFAULT_CENTER,
  FLEET,
  type LatLng,
  type VehicleId,
} from "../shared/fleet";
import type { Ride } from "../shared/schema";
import { bearing, distanceKm } from "../shared/geo";
import type { IStorage } from "./storage";
import { hashPassword } from "./auth";
import { getRoute } from "./geo";
import {
  clearDriverLocation,
  etaMinutes,
  rideDestination,
  ridePickup,
  setDriverLocation,
} from "./dispatch";

const TICK_MS = 1000;
const ACCEPT_DELAY_MS = Number(process.env.DEMO_ACCEPT_DELAY_S ?? 8) * 1000;
// Real driving is ~8 m/s in a city; the demo runs faster so a ride takes minutes
const SPEED_MULTIPLIER = Number(process.env.DEMO_SPEED ?? 3);
const CITY_SPEED_MS = 8.5;
const PICKUP_WAIT_MS = 8000;

type Phase = "idle" | "pause" | "to_pickup" | "waiting" | "to_destination";

interface SimDriver {
  userId: string;
  vehicleModel: VehicleId;
  pos: LatLng;
  heading: number;
  path: [number, number][];
  pathIndex: number;
  phase: Phase;
  rideId: string | null;
  until: number;
  // Rides accepted ahead of time
  scheduled: Set<string>;
  routing: boolean;
}

const NAMES: [string, string][] = [
  ["Marek", "Nowak"],
  ["Anna", "Wiśniewska"],
  ["Piotr", "Kowalczyk"],
  ["Katarzyna", "Lewandowska"],
  ["Tomasz", "Zieliński"],
  ["Aleksandra", "Szymańska"],
  ["Bartosz", "Woźniak"],
  ["Ewa", "Dąbrowska"],
];
const COLORS = ["Biała", "Czarna", "Szara", "Granatowa", "Czerwona"];

function randomPointNear(center: LatLng, radiusKm: number): LatLng {
  const r = radiusKm * Math.sqrt(Math.random());
  const angle = Math.random() * 2 * Math.PI;
  return {
    lat: center.lat + (r / 111) * Math.cos(angle),
    lng:
      center.lng +
      (r / (111 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle),
  };
}

export class DriverSimulator {
  private drivers: SimDriver[] = [];
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(private storage: IStorage) {}

  async start() {
    const password = await hashPassword(randomBytes(24).toString("hex"));
    for (let i = 0; i < NAMES.length; i++) {
      const vehicle = FLEET[i % FLEET.length];
      const email = `kierowca${i + 1}@demo.szofer`;
      let user = await this.storage.getUserByEmail(email);
      if (!user) {
        user = await this.storage.createUser({
          email,
          password,
          firstName: NAMES[i][0],
          lastName: NAMES[i][1],
          phone: `+48600100${String(i + 1).padStart(3, "0")}`,
          marketingConsent: false,
          role: "driver",
        });
      }
      if (!(await this.storage.getDriver(user.id))) {
        await this.storage.createDriver(user.id, {
          vehicleModel: vehicle.id,
          plate: `PO ${String(10000 + i * 1371).slice(0, 5)}`,
          carColor: COLORS[i % COLORS.length],
          status: "approved",
        });
      }
      await this.storage.updateDriver(user.id, { online: true });
      const pos = randomPointNear(DEFAULT_CENTER, 4);
      this.drivers.push({
        userId: user.id,
        vehicleModel: vehicle.id,
        pos,
        heading: Math.random() * 360,
        path: [],
        pathIndex: 0,
        phase: "pause",
        rideId: null,
        until: Date.now() + Math.random() * 10_000,
        scheduled: new Set(),
        routing: false,
      });
      setDriverLocation(user.id, pos);
    }

    // Pick up rides that demo drivers held before a restart
    for (const ride of await this.storage.listActiveRides()) {
      const sim = this.drivers.find((d) => d.userId === ride.driverId);
      if (!sim) continue;
      if (ride.status === "confirmed") sim.scheduled.add(ride.id);
      else if (!sim.rideId) void this.resume(sim, ride);
    }

    this.timer = setInterval(() => void this.tick(), TICK_MS);
    console.log(
      `Demo drivers: ${this.drivers.length} simulated cars around Poznań`,
    );
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    for (const d of this.drivers) clearDriverLocation(d.userId);
  }

  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.dispatch();
      for (const driver of this.drivers) await this.step(driver);
    } catch (err) {
      console.error("Demo driver simulator error:", err);
    } finally {
      this.ticking = false;
    }
  }

  // Accept waiting rides and start scheduled ones
  private async dispatch() {
    const now = Date.now();
    const open = await this.storage.listOpenRides();
    for (const ride of open) {
      if (now - ride.createdAt.getTime() < ACCEPT_DELAY_MS) continue;
      const pickup = ridePickup(ride);
      if (!pickup) continue;
      const scheduled = !!ride.scheduledAt;
      const candidates = this.drivers
        .filter((d) => d.vehicleModel === ride.vehicleModel)
        .filter((d) => scheduled || this.isFree(d))
        .sort((a, b) => distanceKm(a.pos, pickup) - distanceKm(b.pos, pickup));
      const driver = candidates[0];
      if (!driver) continue;

      const accepted = await this.storage.updateRide(
        ride.id,
        {
          driverId: driver.userId,
          status: scheduled ? "confirmed" : "en_route",
          acceptedAt: new Date(),
        },
        { statuses: ["pending"], driverId: null },
      );
      if (!accepted) continue;
      if (scheduled) driver.scheduled.add(ride.id);
      else await this.goToPickup(driver, accepted);
    }

    // Leave for scheduled pickups in time
    for (const driver of this.drivers) {
      if (!this.isFree(driver) || driver.scheduled.size === 0) continue;
      for (const rideId of driver.scheduled) {
        const ride = await this.storage.getRide(rideId);
        if (
          !ride ||
          ride.status !== "confirmed" ||
          ride.driverId !== driver.userId
        ) {
          driver.scheduled.delete(rideId);
          continue;
        }
        const pickup = ridePickup(ride);
        if (!pickup || !ride.scheduledAt) continue;
        const leaveAt =
          ride.scheduledAt.getTime() -
          (etaMinutes(driver.pos, pickup) * 60_000) / SPEED_MULTIPLIER -
          60_000;
        if (now < leaveAt) continue;
        const started = await this.storage.updateRide(
          ride.id,
          { status: "en_route" },
          { statuses: ["confirmed"], driverId: driver.userId },
        );
        driver.scheduled.delete(rideId);
        if (started) await this.goToPickup(driver, started);
        break;
      }
    }
  }

  private isFree(d: SimDriver) {
    return d.phase === "idle" || d.phase === "pause";
  }

  private async resume(driver: SimDriver, ride: Ride) {
    if (ride.status === "en_route") await this.goToPickup(driver, ride);
    else if (ride.status === "arrived" || ride.status === "in_progress") {
      const pickup = ridePickup(ride);
      if (pickup) driver.pos = pickup;
      driver.rideId = ride.id;
      driver.phase = "waiting";
      driver.until = Date.now();
      if (ride.status === "in_progress")
        await this.goToDestination(driver, ride);
    }
  }

  private async goToPickup(driver: SimDriver, ride: Ride) {
    const pickup = ridePickup(ride)!;
    driver.rideId = ride.id;
    driver.phase = "to_pickup";
    const route = await getRoute(driver.pos, pickup);
    this.setPath(driver, route.path, pickup);
  }

  private async goToDestination(driver: SimDriver, ride: Ride) {
    const pickup = ridePickup(ride)!;
    const destination = rideDestination(ride)!;
    driver.phase = "to_destination";
    const path =
      ride.route && ride.route.length > 1
        ? ride.route
        : (await getRoute(pickup, destination)).path;
    this.setPath(driver, path, destination);
  }

  private setPath(driver: SimDriver, path: [number, number][], end: LatLng) {
    driver.path = [...path, [end.lat, end.lng]];
    driver.pathIndex = 0;
  }

  // Moves the car along its path; returns true at the end of the path
  private move(driver: SimDriver, speedMs: number): boolean {
    let budgetKm = (speedMs * SPEED_MULTIPLIER * TICK_MS) / 1_000_000;
    while (driver.pathIndex < driver.path.length) {
      const [lat, lng] = driver.path[driver.pathIndex];
      const target = { lat, lng };
      const d = distanceKm(driver.pos, target);
      if (d > 0.002) driver.heading = bearing(driver.pos, target);
      if (d <= budgetKm) {
        driver.pos = target;
        budgetKm -= d;
        driver.pathIndex++;
      } else {
        const f = budgetKm / d;
        driver.pos = {
          lat: driver.pos.lat + (target.lat - driver.pos.lat) * f,
          lng: driver.pos.lng + (target.lng - driver.pos.lng) * f,
        };
        break;
      }
    }
    setDriverLocation(driver.userId, driver.pos, driver.heading);
    return driver.pathIndex >= driver.path.length;
  }

  private async step(driver: SimDriver) {
    const now = Date.now();

    // The customer may have cancelled while the car was on its way
    if (driver.rideId) {
      const ride = await this.storage.getRide(driver.rideId);
      if (
        !ride ||
        ride.status === "cancelled" ||
        ride.driverId !== driver.userId
      ) {
        driver.rideId = null;
        driver.phase = "pause";
        driver.until = now + 5000;
        driver.path = [];
        return;
      }
    }

    switch (driver.phase) {
      case "pause":
        setDriverLocation(driver.userId, driver.pos, driver.heading);
        if (now >= driver.until) driver.phase = "idle";
        return;

      case "idle": {
        if (driver.path.length === 0) {
          if (driver.routing) return;
          driver.routing = true;
          // Cruise towards a random spot, staying near the city centre
          const anchor =
            distanceKm(driver.pos, DEFAULT_CENTER) > 6
              ? DEFAULT_CENTER
              : driver.pos;
          const target = randomPointNear(anchor, 2);
          getRoute(driver.pos, target)
            .then((r) => {
              if (driver.phase === "idle") this.setPath(driver, r.path, target);
            })
            .finally(() => (driver.routing = false));
          setDriverLocation(driver.userId, driver.pos, driver.heading);
          return;
        }
        if (this.move(driver, CITY_SPEED_MS * 0.6)) {
          driver.path = [];
          driver.phase = "pause";
          driver.until = now + 15_000 + Math.random() * 30_000;
        }
        return;
      }

      case "to_pickup":
        if (this.move(driver, CITY_SPEED_MS)) {
          driver.path = [];
          driver.phase = "waiting";
          driver.until = now + PICKUP_WAIT_MS;
          await this.storage.updateRide(
            driver.rideId!,
            { status: "arrived" },
            { statuses: ["en_route"], driverId: driver.userId },
          );
        }
        return;

      case "waiting": {
        setDriverLocation(driver.userId, driver.pos, driver.heading);
        if (now < driver.until) return;
        const ride = await this.storage.updateRide(
          driver.rideId!,
          { status: "in_progress", startedAt: new Date() },
          { statuses: ["arrived"], driverId: driver.userId },
        );
        if (ride) await this.goToDestination(driver, ride);
        else {
          const current = await this.storage.getRide(driver.rideId!);
          if (current?.status === "in_progress")
            await this.goToDestination(driver, current);
        }
        return;
      }

      case "to_destination":
        if (this.move(driver, CITY_SPEED_MS)) {
          await this.storage.updateRide(
            driver.rideId!,
            { status: "completed", completedAt: new Date() },
            { statuses: ["in_progress"], driverId: driver.userId },
          );
          driver.rideId = null;
          driver.path = [];
          driver.phase = "pause";
          driver.until = now + 20_000;
        }
        return;
    }
  }
}

export function demoDriversEnabled(): boolean {
  const flag = process.env.DEMO_DRIVERS;
  if (flag !== undefined) return flag === "true" || flag === "1";
  return process.env.NODE_ENV !== "production";
}
