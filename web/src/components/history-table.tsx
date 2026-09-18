"use client";

import { METRIC_META, compass, formatNumber, formatTime } from "@/lib/format";
import { WEATHER_FIELDS, type Reading } from "@/lib/types";

export function HistoryTable({ readings }: { readings: Reading[] }) {
  if (readings.length === 0) {
    return (
      <div className="grid h-32 place-items-center text-sm text-slate-500">
        Belum ada riwayat data.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2 font-medium">Waktu</th>
            <th className="px-3 py-2 font-medium">Device</th>
            {WEATHER_FIELDS.map((field) => (
              <th key={field} className="px-3 py-2 font-medium">
                {METRIC_META[field].short}
                <span className="ml-1 text-slate-600">
                  ({METRIC_META[field].unit})
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {readings.map((reading, index) => (
            <tr
              key={`${reading.time}-${reading.device}-${index}`}
              className="border-b border-white/5 transition hover:bg-white/[0.03]"
            >
              <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                {formatTime(reading.time)}
              </td>
              <td className="px-3 py-2">
                <span className="font-mono text-xs text-cyan-200">
                  {reading.device}
                </span>
                <span className="block text-[11px] text-slate-500">
                  {reading.site}
                </span>
              </td>
              {WEATHER_FIELDS.map((field) => {
                const value = reading[field];
                const display =
                  field === "wind_direction" && value !== undefined
                    ? `${compass(value)} ${formatNumber(value, 0)}`
                    : formatNumber(value ?? null);
                return (
                  <td
                    key={field}
                    className="whitespace-nowrap px-3 py-2 text-slate-200"
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
