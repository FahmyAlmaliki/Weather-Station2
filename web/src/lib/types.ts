export const WEATHER_FIELDS = [
  "wind_direction",
  "wind_speed",
  "rainfall",
  "temperature",
  "pressure",
  "humidity",
] as const;

export type WeatherField = (typeof WEATHER_FIELDS)[number];

export interface WeatherPayload {
  ts?: number;
  device: string;
  site: string;
  wind_direction?: number;
  wind_speed?: number;
  rainfall?: number;
  temperature?: number;
  pressure?: number;
  humidity?: number;
}

export interface Reading extends WeatherPayload {
  time: string;
}

export interface DeviceInfo {
  device: string;
  site: string;
  lastSeen: string | null;
  online: boolean;
  label?: string;
  location?: string;
  active?: boolean;
  latest: Partial<Record<WeatherField, number>>;
}

export interface DeviceRegistryEntry {
  device: string;
  site?: string;
  label?: string;
  location?: string;
  active?: boolean;
}

export interface FieldSummary {
  min: number | null;
  max: number | null;
  avg: number | null;
}

export type Summary = Partial<Record<WeatherField, FieldSummary>>;

export interface StatsResponse {
  series: Reading[];
  summary: Summary;
  window: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
