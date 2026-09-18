"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { METRIC_META } from "@/lib/format";
import type { Reading, WeatherField } from "@/lib/types";

const PALETTE = ["#22d3ee", "#a78bfa", "#f472b6", "#34d399", "#facc15", "#60a5fa"];

interface WeatherChartProps {
  series: Reading[];
  metric: WeatherField;
}

export function WeatherChart({ series, metric }: WeatherChartProps) {
  const meta = METRIC_META[metric];
  const devices = Array.from(new Set(series.map((r) => r.device)));

  const dataMap = new Map<string, Record<string, string | number>>();
  for (const reading of series) {
    const value = reading[metric];
    if (typeof value !== "number") continue;
    let row = dataMap.get(reading.time);
    if (!row) {
      row = { time: reading.time };
      dataMap.set(reading.time, row);
    }
    row[reading.device] = value;
  }

  const data = Array.from(dataMap.values()).sort((a, b) =>
    String(a.time) < String(b.time) ? -1 : 1,
  );

  if (data.length === 0) {
    return (
      <div className="grid h-[320px] place-items-center text-sm text-slate-500">
        Belum ada data pada rentang ini.
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <defs>
            {devices.map((device, index) => {
              const color = PALETTE[index % PALETTE.length];
              const id = `grad-${metric}-${index}`;
              return (
                <linearGradient key={device} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tickFormatter={(value: string) =>
              new Date(value).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(10,19,34,0.95)",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: 12,
              color: "#e2e8f0",
              fontSize: 12,
            }}
            labelFormatter={(value) =>
              new Date(value as string).toLocaleString("id-ID")
            }
            formatter={(value) => [
              `${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${meta.unit}`,
              meta.label,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
            iconType="circle"
          />
          {devices.map((device, index) => {
            const color = PALETTE[index % PALETTE.length];
            return (
              <Area
                key={device}
                type="monotone"
                dataKey={device}
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${metric}-${index})`}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
