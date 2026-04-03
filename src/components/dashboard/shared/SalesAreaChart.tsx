"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartMonth = [
  { label: "1", value: 4200 },
  { label: "4", value: 5100 },
  { label: "7", value: 4800 },
  { label: "10", value: 6200 },
  { label: "13", value: 5900 },
  { label: "16", value: 7100 },
  { label: "19", value: 6800 },
  { label: "22", value: 8200 },
  { label: "25", value: 7800 },
  { label: "28", value: 9100 },
  { label: "30", value: 8800 },
];

const chartWeek = chartMonth.slice(-5).map((d, i) => ({ ...d, label: `W${i + 1}` }));
const chartDay = [
  { label: "Mon", value: 2100 },
  { label: "Tue", value: 2600 },
  { label: "Wed", value: 2400 },
  { label: "Thu", value: 3100 },
  { label: "Fri", value: 2900 },
  { label: "Sat", value: 3400 },
  { label: "Sun", value: 3200 },
];

export function SalesAreaChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [range, setRange] = useState<"month" | "week" | "day">("month");
  const gradId = useId().replace(/:/g, "");

  const data = useMemo(() => {
    if (range === "week") return chartWeek;
    if (range === "day") return chartDay;
    return chartMonth;
  }, [range]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--gs-navy)]">Sales volume</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Last period — demo data until API is connected.</p>
        </div>
        <div className="flex gap-1 rounded-full bg-slate-100/90 p-1 ring-1 ring-slate-200/60">
          {(
            [
              ["month", "Month"],
              ["week", "Week"],
              ["day", "Day"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                range === key
                  ? "bg-white text-[var(--gs-accent)] shadow-sm ring-1 ring-slate-200/70"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 h-72 min-h-[288px] w-full min-w-0">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gs-chart-line)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--gs-chart-line)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#eceff5" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(v) => `${v >= 1000 ? `${v / 1000}k` : v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "14px",
                  border: "1px solid #e8ecf1",
                  boxShadow: "0 12px 32px rgba(15,23,42,0.1)",
                  padding: "10px 14px",
                }}
                labelStyle={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--gs-chart-line)"
                strokeWidth={2.5}
                fill={`url(#${gradId})`}
                dot={{ fill: "var(--gs-chart-line)", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50/80 text-sm text-slate-400"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
