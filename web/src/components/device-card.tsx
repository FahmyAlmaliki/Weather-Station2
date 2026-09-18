"use client";

import { MapPin, Radio } from "lucide-react";
import { METRIC_META, compass, formatNumber, relativeTime } from "@/lib/format";
import { WEATHER_FIELDS, type DeviceInfo } from "@/lib/types";
import { MetricIcon } from "./metric-icon";

export function DeviceCard({ device }: { device: DeviceInfo }) {
  return (
    <div className="card card-hover animate-fade-up p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">
              {device.label || device.device}
            </h3>
            {device.active === false && (
              <span className="chip border-amber-300/20 bg-amber-400/10 text-amber-200">
                nonaktif
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
            {device.device}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            {device.location || device.site || "lokasi belum diisi"}
          </p>
        </div>

        <span
          className={`chip shrink-0 ${
            device.online
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
              : "border-slate-300/10 bg-white/5 text-slate-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              device.online ? "animate-pulse-dot bg-emerald-400" : "bg-slate-500"
            }`}
          />
          {device.online ? "online" : "offline"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {WEATHER_FIELDS.map((field) => {
          const meta = METRIC_META[field];
          const value = device.latest[field];
          const display =
            field === "wind_direction" && value !== undefined
              ? `${compass(value)} ${formatNumber(value, 0)}`
              : formatNumber(value ?? null);
          return (
            <div
              key={field}
              className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <div
                className="flex items-center gap-1.5 text-[11px] font-medium"
                style={{ color: meta.color }}
              >
                <MetricIcon field={field} className="h-3.5 w-3.5" />
                {meta.short}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {display}
                <span className="ml-1 text-[10px] font-normal text-slate-500">
                  {meta.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-500">
        <Radio className="h-3.5 w-3.5" />
        Update terakhir: {relativeTime(device.lastSeen)}
      </p>
    </div>
  );
}
