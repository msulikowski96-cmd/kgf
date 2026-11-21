import type { Vehicle } from "@shared/fleet";

export function formatPrice(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(".", ",")} zł`;
}

export function priceSummary(v: Vehicle): string {
  return `od ${formatPrice(v.minimumFare)} · ${formatPrice(v.perKm)}/km`;
}

export function formatRideTime(scheduledAt: string | null): string {
  if (!scheduledAt) return "Jak najszybciej";
  const date = new Date(scheduledAt);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === today.toDateString()) return `Dziś, ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Jutro, ${time}`;
  return `${date.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "long" })}, ${time}`;
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Customer-facing description of what is happening with the ride now
export function rideHeadline(
  status: string,
  etaMin: number | null | undefined,
  driverName?: string,
): string {
  switch (status) {
    case "pending":
      return "Szukamy kierowcy…";
    case "confirmed":
      return `${driverName ?? "Kierowca"} przyjął rezerwację`;
    case "en_route":
      return etaMin != null
        ? `${driverName ?? "Kierowca"} będzie za ${etaMin} min`
        : `${driverName ?? "Kierowca"} jedzie po Ciebie`;
    case "arrived":
      return `${driverName ?? "Kierowca"} czeka na miejscu`;
    case "in_progress":
      return etaMin != null ? `Na miejscu za ${etaMin} min` : "Jesteś w trasie";
    case "completed":
      return "Przejazd zakończony";
    default:
      return "Przejazd anulowany";
  }
}

// Polish plural forms: plural(1, "kurs", "kursy", "kursów") -> "1 kurs"
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    n === 1
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? few
        : many;
  return `${n} ${word}`;
}
