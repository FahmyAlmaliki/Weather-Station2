import type { WeatherField } from "./types";

export const METRIC_META: Record<
  WeatherField,
  { label: string; short: string; unit: string; color: string }
> = {
  temperature: { label: "Suhu", short: "Suhu", unit: "°C", color: "#fb923c" },
  humidity: { label: "Kelembapan", short: "RH", unit: "%", color: "#38bdf8" },
  pressure: { label: "Tekanan", short: "Tekanan", unit: "hPa", color: "#a78bfa" },
  wind_speed: { label: "Kecepatan Angin", short: "Angin", unit: "m/s", color: "#22d3ee" },
  wind_direction: { label: "Arah Angin", short: "Arah", unit: "°", color: "#34d399" },
  rainfall: { label: "Curah Hujan", short: "Hujan", unit: "mm", color: "#60a5fa" },
};

export function formatNumber(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return "belum pernah";
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return "--";
  const diff = Date.now() - date;
  const seconds = Math.round(diff / 1000);
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

const COMPASS = [
  "U",
  "TL",
  "T",
  "TG",
  "S",
  "BD",
  "B",
  "BL",
];

export function compass(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return "--";
  const index = Math.round(((deg % 360) / 45)) % 8;
  return COMPASS[index];
}
