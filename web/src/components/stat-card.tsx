"use client";

import { METRIC_META, formatNumber } from "@/lib/format";
import type { FieldSummary, WeatherField } from "@/lib/types";
import { MetricIcon } from "./metric-icon";

interface StatCardProps {
  field: WeatherField;
  summary?: FieldSummary;
  active?: boolean;
  onClick?: () => void;
}

export function StatCard({ field, summary, active, onClick }: StatCardProps) {
  const meta = METRIC_META[field];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card card-hover animate-fade-up p-4 text-left ${
        active ? "ring-1 ring-cyan-300/40" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="label">{meta.label}</span>
        <span
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
        >
          <MetricIcon field={field} className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-white">
          {formatNumber(summary?.avg ?? null)}
        </span>
        <span className="text-xs font-medium text-slate-400">{meta.unit}</span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
        <span>
          min{" "}
          <span className="font-medium text-slate-300">
            {formatNumber(summary?.min ?? null)}
          </span>
        </span>
        <span className="text-white/10">|</span>
        <span>
          max{" "}
          <span className="font-medium text-slate-300">
            {formatNumber(summary?.max ?? null)}
          </span>
        </span>
      </div>
    </button>
  );
}
