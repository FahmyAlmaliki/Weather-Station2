import { InfluxDB, Point } from "@influxdata/influxdb-client";
import type {
  DeviceInfo,
  DeviceRegistryEntry,
  Reading,
  StatsResponse,
  WeatherField,
  WeatherPayload,
} from "./types";
import { WEATHER_FIELDS } from "./types";
import { aggregateWindowFor, type RangeOption } from "./validation";

const INFLUX_URL = process.env.INFLUX_URL ?? "http://localhost:8086";
const INFLUX_TOKEN = process.env.INFLUX_TOKEN ?? "";
const INFLUX_ORG = process.env.INFLUX_ORG ?? "weather";
const INFLUX_BUCKET = process.env.INFLUX_BUCKET ?? "weather";

export const ONLINE_THRESHOLD_MS = Number(
  process.env.ONLINE_THRESHOLD_MS ?? 300_000,
);

const WEATHER_MEASUREMENT = "weather";
const REGISTRY_MEASUREMENT = "device_registry";

const influx = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });

/** Escape an arbitrary string for safe use inside a Flux string literal. */
function fluxString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function queryRows<T>(flux: string): Promise<T[]> {
  return influx.getQueryApi(INFLUX_ORG).collectRows<T>(flux);
}

function buildFilters(
  device?: string | null,
  site?: string | null,
): string {
  let out = "";
  if (device) {
    out += `\n  |> filter(fn: (r) => r.device == ${fluxString(device)})`;
  }
  if (site) {
    out += `\n  |> filter(fn: (r) => r.site == ${fluxString(site)})`;
  }
  return out;
}

export async function writeWeather(payload: WeatherPayload): Promise<void> {
  const point = new Point(WEATHER_MEASUREMENT)
    .tag("device", payload.device)
    .tag("site", payload.site);

  for (const field of WEATHER_FIELDS) {
    const value = payload[field];
    if (typeof value === "number" && Number.isFinite(value)) {
      point.floatField(field, value);
    }
  }

  point.timestamp(new Date(payload.ts ?? Date.now()));

  const writeApi = influx.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, "ms");
  writeApi.writePoint(point);
  await writeApi.close();
}

/** Raw readings, newest first (for the history table). */
export async function queryReadings(options: {
  device?: string | null;
  site?: string | null;
  range: RangeOption;
  limit: number;
}): Promise<Reading[]> {
  const flux = `from(bucket: ${fluxString(INFLUX_BUCKET)})
  |> range(start: -${options.range})
  |> filter(fn: (r) => r._measurement == ${fluxString(WEATHER_MEASUREMENT)})${buildFilters(
    options.device,
    options.site,
  )}
  |> pivot(rowKey: ["_time", "device", "site"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: ${Math.max(1, Math.min(options.limit, 5000))})`;

  const rows = await queryRows<Record<string, unknown>>(flux);
  return rows.map(rowToReading);
}

/** Downsampled time series + min/max/avg summary (for charts and stat cards). */
export async function queryStats(options: {
  device?: string | null;
  site?: string | null;
  range: RangeOption;
}): Promise<StatsResponse> {
  const window = aggregateWindowFor(options.range);
  const flux = `from(bucket: ${fluxString(INFLUX_BUCKET)})
  |> range(start: -${options.range})
  |> filter(fn: (r) => r._measurement == ${fluxString(WEATHER_MEASUREMENT)})${buildFilters(
    options.device,
    options.site,
  )}
  |> filter(fn: (r) => contains(value: r._field, set: ${JSON.stringify(WEATHER_FIELDS)}))
  |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
  |> keep(columns: ["_time", "_field", "_value", "device", "site"])
  |> sort(columns: ["_time"])`;

  const rows = await queryRows<{
    _time: string;
    _field: WeatherField;
    _value: number;
    device: string;
    site: string;
  }>(flux);

  const seriesMap = new Map<string, Reading>();
  const summary: StatsResponse["summary"] = {};
  const accumulators: Record<
    WeatherField,
    { min: number; max: number; sum: number; count: number }
  > = {} as Record<
    WeatherField,
    { min: number; max: number; sum: number; count: number }
  >;

  for (const field of WEATHER_FIELDS) {
    accumulators[field] = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
  }

  for (const row of rows) {
    const key = `${row._time}|${row.device}|${row.site}`;
    let reading = seriesMap.get(key);
    if (!reading) {
      reading = { time: row._time, device: row.device, site: row.site };
      seriesMap.set(key, reading);
    }
    reading[row._field] = row._value;

    const acc = accumulators[row._field];
    if (acc && Number.isFinite(row._value)) {
      acc.min = Math.min(acc.min, row._value);
      acc.max = Math.max(acc.max, row._value);
      acc.sum += row._value;
      acc.count += 1;
    }
  }

  for (const field of WEATHER_FIELDS) {
    const acc = accumulators[field];
    summary[field] = {
      min: acc.count > 0 ? acc.min : null,
      max: acc.count > 0 ? acc.max : null,
      avg: acc.count > 0 ? acc.sum / acc.count : null,
    };
  }

  const series = Array.from(seriesMap.values()).sort((a, b) =>
    a.time < b.time ? -1 : 1,
  );

  return { series, summary, window };
}

interface LatestRow {
  device: string;
  site: string;
  _field: WeatherField;
  _value: number;
  _time: string;
}

/** Latest value per field/device plus registry metadata. */
export async function queryDevices(): Promise<DeviceInfo[]> {
  const latestFlux = `from(bucket: ${fluxString(INFLUX_BUCKET)})
  |> range(start: -90d)
  |> filter(fn: (r) => r._measurement == ${fluxString(WEATHER_MEASUREMENT)})
  |> group(columns: ["device", "site", "_field"])
  |> last()`;

  const [latestRows, registry] = await Promise.all([
    queryRows<LatestRow>(latestFlux),
    queryRegistry(),
  ]);

  const map = new Map<string, DeviceInfo>();

  for (const row of latestRows) {
    const key = `${row.device}|${row.site}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        device: row.device,
        site: row.site,
        lastSeen: null,
        online: false,
        latest: {},
      };
      map.set(key, entry);
    }
    entry.latest[row._field] = row._value;
    if (!entry.lastSeen || row._time > entry.lastSeen) {
      entry.lastSeen = row._time;
    }
  }

  // Merge registry entries that have not reported yet.
  for (const reg of registry.values()) {
    const existing = Array.from(map.values()).find((d) => d.device === reg.device);
    if (existing) {
      existing.label = reg.label;
      existing.location = reg.location;
      existing.active = reg.active;
      continue;
    }
    map.set(`${reg.device}|${reg.site ?? ""}`, {
      device: reg.device,
      site: reg.site ?? "",
      lastSeen: null,
      online: false,
      label: reg.label,
      location: reg.location,
      active: reg.active,
      latest: {},
    });
  }

  const now = Date.now();
  const devices = Array.from(map.values()).map((entry) => ({
    ...entry,
    online:
      entry.lastSeen !== null &&
      now - new Date(entry.lastSeen).getTime() < ONLINE_THRESHOLD_MS,
  }));

  devices.sort((a, b) => a.device.localeCompare(b.device));
  return devices;
}

function rowToReading(row: Record<string, unknown>): Reading {
  const reading: Reading = {
    time: String(row._time),
    device: String(row.device ?? ""),
    site: String(row.site ?? ""),
  };
  for (const field of WEATHER_FIELDS) {
    const value = row[field];
    if (typeof value === "number") {
      reading[field] = value;
    }
  }
  return reading;
}

/** Write (or update) a registry entry. Latest write wins. */
export async function writeRegistry(entry: DeviceRegistryEntry): Promise<void> {
  const point = new Point(REGISTRY_MEASUREMENT)
    .tag("device", entry.device)
    .stringField("site", entry.site ?? "")
    .stringField("label", entry.label ?? "")
    .stringField("location", entry.location ?? "")
    .booleanField("active", entry.active ?? true)
    .booleanField("deleted", false)
    .timestamp(new Date());

  const writeApi = influx.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, "ms");
  writeApi.writePoint(point);
  await writeApi.close();
}

/** Soft-delete a registry entry. */
export async function deleteRegistry(device: string): Promise<void> {
  const point = new Point(REGISTRY_MEASUREMENT)
    .tag("device", device)
    .booleanField("deleted", true)
    .timestamp(new Date());

  const writeApi = influx.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, "ms");
  writeApi.writePoint(point);
  await writeApi.close();
}

export async function queryRegistry(): Promise<Map<string, DeviceRegistryEntry>> {
  const flux = `from(bucket: ${fluxString(INFLUX_BUCKET)})
  |> range(start: -3650d)
  |> filter(fn: (r) => r._measurement == ${fluxString(REGISTRY_MEASUREMENT)})
  |> pivot(rowKey: ["_time", "device"], columnKey: ["_field"], valueColumn: "_value")
  |> group(columns: ["device"])
  |> last(column: "_time")`;

  const rows = await queryRows<Record<string, unknown>>(flux);
  const result = new Map<string, DeviceRegistryEntry>();

  for (const row of rows) {
    if (row.deleted === true) continue;
    const device = String(row.device ?? "");
    if (!device) continue;
    result.set(device, {
      device,
      site: typeof row.site === "string" ? row.site : "",
      label: typeof row.label === "string" ? row.label : "",
      location: typeof row.location === "string" ? row.location : "",
      active: row.active !== false,
    });
  }

  return result;
}
