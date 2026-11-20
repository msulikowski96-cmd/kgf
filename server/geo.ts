// Address search and routing on OpenStreetMap services, with offline fallbacks.
// Nominatim and the public OSRM server are free but rate limited: fine for
// development and small traffic. Point GEOCODER_URL / ROUTER_URL at your own
// instances (or a paid provider with the same API) for production.

import { POPULAR_PLACES, type LatLng, type Place } from "../shared/fleet";
import { distanceKm } from "../shared/geo";

const GEOCODER_URL = (
  process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org"
).replace(/\/$/, "");
const ROUTER_URL = (
  process.env.ROUTER_URL || "https://router.project-osrm.org"
).replace(/\/$/, "");
const USER_AGENT =
  process.env.GEO_USER_AGENT || "TwojPrywatnySzofer/1.0 (ride booking app)";
const TIMEOUT_MS = 5000;

// Bias search results towards Poznań and the surrounding area
const VIEWBOX = "16.6,52.55,17.25,52.25";

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  path: [number, number][];
  // false when the routing service was unreachable and we guessed
  exact: boolean;
}

class TtlCache<T> {
  private map = new Map<string, { value: T; expires: number }>();
  constructor(
    private ttlMs: number,
    private max = 500,
  ) {}
  get(key: string): T | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

const searchCache = new TtlCache<Place[]>(24 * 3600_000);
const reverseCache = new TtlCache<Place>(24 * 3600_000);
const routeCache = new TtlCache<RouteInfo>(3600_000, 1000);

// Nominatim allows one request per second
let geocoderQueue: Promise<unknown> = Promise.resolve();
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = geocoderQueue.then(fn, fn);
  geocoderQueue = run
    .catch(() => undefined)
    .then(() => new Promise((r) => setTimeout(r, 1000)));
  return run;
}

// Logs a service outage at most once a minute
const lastWarning = new Map<string, number>();
function warnUnavailable(service: string, err: unknown) {
  const now = Date.now();
  if (now - (lastWarning.get(service) ?? 0) < 60_000) return;
  lastWarning.set(service, now);
  console.warn(
    `${service} unavailable (${(err as Error).message}); using offline estimate`,
  );
}

// Requests go only to the two configured services (set by the operator in the
// environment, never by users). User input only reaches the query string.
const ALLOWED_ORIGINS = new Set([
  new URL(GEOCODER_URL).origin,
  new URL(ROUTER_URL).origin,
]);

async function fetchJson(url: string): Promise<unknown> {
  const target = new URL(url);
  if (!ALLOWED_ORIGINS.has(target.origin)) {
    throw new Error(`Blocked request to ${target.origin}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "pl" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
}

function toPlace(r: NominatimResult): Place {
  const a = r.address ?? {};
  const street = a.road || a.pedestrian || a.footway || a.square;
  const streetLine = street
    ? `${street}${a.house_number ? ` ${a.house_number}` : ""}`
    : undefined;
  const town = a.city || a.town || a.village || a.municipality || a.county;
  const name = r.name || streetLine || r.display_name.split(",")[0];
  const address =
    [streetLine && streetLine !== name ? streetLine : undefined, town]
      .filter(Boolean)
      .join(", ") || r.display_name.split(",").slice(1, 3).join(",").trim();
  return {
    name,
    address,
    lat: Number(r.lat),
    lng: Number(r.lon),
  };
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

function matchPopular(query: string): Place[] {
  const q = normalize(query);
  return POPULAR_PLACES.filter((p) =>
    normalize(`${p.name} ${p.address}`).includes(q),
  );
}

export async function searchPlaces(
  query: string,
  near?: LatLng,
): Promise<{ places: Place[]; online: boolean }> {
  const q = query.trim();
  if (q.length < 3) return { places: matchPopular(q), online: true };

  const cacheKey = q.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached) return { places: cached, online: true };

  const popular = matchPopular(q);
  try {
    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      addressdetails: "1",
      limit: "8",
      countrycodes: "pl",
      viewbox: near
        ? `${near.lng - 0.4},${near.lat + 0.25},${near.lng + 0.4},${near.lat - 0.25}`
        : VIEWBOX,
    });
    const results = (await throttled(() =>
      fetchJson(`${GEOCODER_URL}/search?${params}`),
    )) as NominatimResult[];
    const places = [...popular, ...results.map(toPlace)].filter(
      (p, i, all) =>
        all.findIndex((o) => distanceKm(o, p) < 0.05 && o.name === p.name) ===
        i,
    );
    searchCache.set(cacheKey, places);
    return { places, online: true };
  } catch (err) {
    warnUnavailable("Geocoder", err);
    return { places: popular, online: false };
  }
}

export async function reverseGeocode(point: LatLng): Promise<Place> {
  const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const cached = reverseCache.get(key);
  if (cached) return cached;

  const nearby = POPULAR_PLACES.find((p) => distanceKm(p, point) < 0.08);
  const fallback: Place = nearby
    ? { ...nearby, lat: point.lat, lng: point.lng }
    : {
        name: "Wskazane miejsce",
        address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
        lat: point.lat,
        lng: point.lng,
      };

  try {
    const params = new URLSearchParams({
      lat: String(point.lat),
      lon: String(point.lng),
      format: "jsonv2",
      addressdetails: "1",
      zoom: "18",
    });
    const result = (await throttled(() =>
      fetchJson(`${GEOCODER_URL}/reverse?${params}`),
    )) as NominatimResult & { error?: string };
    if (result.error) return fallback;
    const place = { ...toPlace(result), lat: point.lat, lng: point.lng };
    reverseCache.set(key, place);
    return place;
  } catch (err) {
    warnUnavailable("Geocoder", err);
    return fallback;
  }
}

// Road distances are on average ~35% longer than a straight line in a city
const ROAD_FACTOR = 1.35;
const CITY_SPEED_KMH = 32;

function estimatedRoute(from: LatLng, to: LatLng): RouteInfo {
  const km = distanceKm(from, to) * ROAD_FACTOR;
  return {
    distanceKm: Math.round(km * 10) / 10,
    durationMin: Math.max(1, Math.round((km / CITY_SPEED_KMH) * 60)),
    path: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    exact: false,
  };
}

// Keeps at most ~maxPoints points so the route stays small in the database
function simplify(
  path: [number, number][],
  maxPoints = 300,
): [number, number][] {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const out = path.filter((_, i) => i % step === 0);
  const last = path[path.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export async function getRoute(from: LatLng, to: LatLng): Promise<RouteInfo> {
  const key = [from.lat, from.lng, to.lat, to.lng]
    .map((n) => n.toFixed(4))
    .join(",");
  const cached = routeCache.get(key);
  if (cached) return cached;

  if (distanceKm(from, to) < 0.05) {
    return {
      distanceKm: 0,
      durationMin: 1,
      path: [[from.lat, from.lng]],
      exact: true,
    };
  }

  try {
    const fmt = (n: number) => Number(n).toFixed(6);
    const coords = `${fmt(from.lng)},${fmt(from.lat)};${fmt(to.lng)},${fmt(to.lat)}`;
    const data = (await fetchJson(
      `${ROUTER_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    )) as {
      code: string;
      routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }[];
    };
    const best = data.routes?.[0];
    if (data.code !== "Ok" || !best) throw new Error(data.code);
    const route: RouteInfo = {
      distanceKm: Math.round(best.distance / 100) / 10,
      durationMin: Math.max(1, Math.round(best.duration / 60)),
      path: simplify(best.geometry.coordinates.map(([lng, lat]) => [lat, lng])),
      exact: true,
    };
    routeCache.set(key, route);
    return route;
  } catch (err) {
    warnUnavailable("Router", err);
    return estimatedRoute(from, to);
  }
}
