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
