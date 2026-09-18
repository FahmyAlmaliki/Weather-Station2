"use client";

import { RefreshCw, Filter } from "lucide-react";
import type { DeviceInfo } from "@/lib/types";
import { RANGE_OPTIONS, type RangeOption } from "@/lib/validation";

interface FilterBarProps {
  devices: DeviceInfo[];
  device: string;
  site: string;
  range: RangeOption;
  loading: boolean;
  onChange: (patch: {
    device?: string;
    site?: string;
    range?: RangeOption;
  }) => void;
  onRefresh: () => void;
}

const RANGE_LABEL: Record<RangeOption, string> = {
  "1h": "1 jam",
  "6h": "6 jam",
  "24h": "24 jam",
  "7d": "7 hari",
  "30d": "30 hari",
  "90d": "90 hari",
};

export function FilterBar({
  devices,
  device,
  site,
  range,
  loading,
  onChange,
  onRefresh,
}: FilterBarProps) {
  const sites = Array.from(
    new Set(devices.map((d) => d.site).filter(Boolean)),
  ).sort();

  return (
    <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </span>

        <select
          className="input w-auto min-w-[9rem]"
          value={device}
          onChange={(e) => onChange({ device: e.target.value })}
        >
          <option value="">Semua device</option>
          {devices.map((d) => (
            <option key={d.device} value={d.device}>
              {d.label ? `${d.label} (${d.device})` : d.device}
            </option>
          ))}
        </select>

        <select
          className="input w-auto min-w-[9rem]"
          value={site}
          onChange={(e) => onChange({ site: e.target.value })}
        >
          <option value="">Semua site</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-900/70 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ range: option })}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                range === option
                  ? "bg-gradient-to-r from-cyan-400 to-sky-500 text-ink-950"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {RANGE_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="btn-ghost shrink-0"
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
