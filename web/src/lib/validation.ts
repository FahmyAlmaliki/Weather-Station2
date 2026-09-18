import { z } from "zod";

export const weatherPayloadSchema = z.object({
  ts: z.number().int().positive().optional(),
  device: z.string().min(1).max(120),
  site: z.string().min(1).max(120),
  wind_direction: z.number().min(0).max(360).optional(),
  wind_speed: z.number().min(0).max(500).optional(),
  rainfall: z.number().min(0).max(10000).optional(),
  temperature: z.number().min(-100).max(100).optional(),
  pressure: z.number().min(0).max(2000).optional(),
  humidity: z.number().min(0).max(100).optional(),
});

export type WeatherPayloadInput = z.infer<typeof weatherPayloadSchema>;

export const registrySchema = z.object({
  device: z.string().min(1).max(120),
  site: z.string().max(120).optional().default(""),
  label: z.string().max(120).optional().default(""),
  location: z.string().max(200).optional().default(""),
  active: z.boolean().optional().default(true),
});

export type RegistryInput = z.infer<typeof registrySchema>;

export const RANGE_OPTIONS = ["1h", "6h", "24h", "7d", "30d", "90d"] as const;
export type RangeOption = (typeof RANGE_OPTIONS)[number];

export function parseRange(value: string | null): RangeOption {
  if (value && (RANGE_OPTIONS as readonly string[]).includes(value)) {
    return value as RangeOption;
  }
  return "24h";
}

export function aggregateWindowFor(range: RangeOption): string {
  switch (range) {
    case "1h":
      return "1m";
    case "6h":
      return "5m";
    case "24h":
      return "15m";
    case "7d":
      return "1h";
    case "30d":
      return "6h";
    case "90d":
      return "1d";
    default:
      return "15m";
  }
}
