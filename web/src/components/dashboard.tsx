"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, LineChart, Server } from "lucide-react";
import { METRIC_META } from "@/lib/format";
import type {
  DeviceInfo,
  Reading,
  StatsResponse,
  WeatherField,
} from "@/lib/types";
import { WEATHER_FIELDS } from "@/lib/types";
import type { RangeOption } from "@/lib/validation";
import { DeviceCard } from "./device-card";
import { FilterBar } from "./filter-bar";
import { HistoryTable } from "./history-table";
import { StatCard } from "./stat-card";
import { WeatherChart } from "./weather-chart";

const POLL_INTERVAL = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL ?? 10000);

export function Dashboard() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [filters, setFilters] = useState<{
    device: string;
    site: string;
    range: RangeOption;
  }>({ device: "", site: "", range: "24h" });
  const [metric, setMetric] = useState<WeatherField>("temperature");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inflight = useRef(false);

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.device) qs.set("device", filters.device);
      if (filters.site) qs.set("site", filters.site);
      qs.set("range", filters.range);

      const [devRes, statsRes, weatherRes] = await Promise.all([
        fetch("/api/devices", { cache: "no-store" }),
        fetch(`/api/stats?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/weather?${qs.toString()}&limit=100`, { cache: "no-store" }),
      ]);

      if (!devRes.ok || !statsRes.ok || !weatherRes.ok) {
        throw new Error("Gagal memuat data dari server");
      }

      const devJson = (await devRes.json()) as { devices?: DeviceInfo[] };
      const statsJson = (await statsRes.json()) as StatsResponse;
      const weatherJson = (await weatherRes.json()) as { readings?: Reading[] };

      setDevices(devJson.devices ?? []);
      setStats(statsJson);
      setReadings(weatherJson.readings ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const visibleDevices = useMemo(
    () =>
      devices.filter(
        (d) =>
          (!filters.device || d.device === filters.device) &&
          (!filters.site || d.site === filters.site),
      ),
    [devices, filters.device, filters.site],
  );

  const onlineCount = visibleDevices.filter((d) => d.online).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Weather Monitoring
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Data stasiun cuaca realtime &mdash; suhu, kelembapan, tekanan, angin,
            dan curah hujan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-emerald-400" />
            {onlineCount} online
          </span>
          <span className="chip">
            <Server className="h-3.5 w-3.5" />
            {visibleDevices.length} device
          </span>
          <span className="chip">
            <Activity className="h-3.5 w-3.5" />
            {lastUpdated
              ? `diperbarui ${lastUpdated.toLocaleTimeString("id-ID")}`
              : "memuat..."}
          </span>
        </div>
      </section>

      {error && (
        <div className="card flex items-center gap-3 border-amber-300/20 bg-amber-400/5 p-4 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <FilterBar
        devices={devices}
        device={filters.device}
        site={filters.site}
        range={filters.range}
        loading={loading}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onRefresh={load}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {WEATHER_FIELDS.map((field) => (
          <StatCard
            key={field}
            field={field}
            summary={stats?.summary?.[field]}
            active={metric === field}
            onClick={() => setMetric(field)}
          />
        ))}
      </section>

      <section className="card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl"
              style={{
                backgroundColor: `${METRIC_META[metric].color}1f`,
                color: METRIC_META[metric].color,
              }}
            >
              <LineChart className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Grafik {METRIC_META[metric].label}
              </h2>
              <p className="text-xs text-slate-400">
                Satuan {METRIC_META[metric].unit} &middot; jendela{" "}
                {stats?.window ?? "-"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-ink-900/70 p-1">
            {WEATHER_FIELDS.map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => setMetric(field)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  metric === field
                    ? "bg-gradient-to-r from-cyan-400 to-sky-500 text-ink-950"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {METRIC_META[field].short}
              </button>
            ))}
          </div>
        </div>

        <WeatherChart series={stats?.series ?? []} metric={metric} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white">Device</h2>
        {visibleDevices.length === 0 ? (
          <div className="card grid h-32 place-items-center text-sm text-slate-500">
            Belum ada device yang mengirim data.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleDevices.map((device) => (
              <DeviceCard key={`${device.device}-${device.site}`} device={device} />
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Riwayat Data</h2>
          <span className="text-xs text-slate-400">
            {readings.length} baris terakhir
          </span>
        </div>
        <HistoryTable readings={readings} />
      </section>
    </div>
  );
}
