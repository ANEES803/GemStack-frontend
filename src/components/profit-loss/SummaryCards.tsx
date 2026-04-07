"use client";

import { Percent, PiggyBank, Scale, TrendingUp } from "lucide-react";

import { formatPlAmount, formatPlPercent } from "./formatPl";

import type { PlRounding } from "./types";

type Props = {
  totalRevenue: number;
  grossProfit: number;
  netProfit: number;
  netProfitPct: number;
  currency: "PKR" | "USD";
  rounding: PlRounding;
  compact?: boolean;
};

export function SummaryCards({ totalRevenue, grossProfit, netProfit, netProfitPct, currency, rounding, compact }: Props) {
  const pad = compact ? "p-4" : "p-5";
  const cards = [
    {
      label: "Total revenue",
      value: formatPlAmount(totalRevenue, currency, rounding),
      sub: "Period total",
      icon: TrendingUp,
      tint: "from-emerald-50/90 to-white ring-emerald-200/55",
      iconBg: "bg-emerald-100 text-emerald-800",
    },
    {
      label: "Gross profit",
      value: formatPlAmount(grossProfit, currency, rounding),
      sub: "Revenue − COGS",
      icon: Scale,
      tint: "from-sky-50/90 to-white ring-sky-200/55",
      iconBg: "bg-sky-100 text-sky-800",
    },
    {
      label: "Net profit",
      value: formatPlAmount(netProfit, currency, rounding),
      sub: netProfit >= 0 ? "After all expenses" : "Net loss",
      icon: PiggyBank,
      tint:
        netProfit >= 0
          ? "from-green-50/95 to-white ring-green-200/60"
          : "from-red-50/95 to-white ring-red-200/70",
      iconBg: netProfit >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
      valueClass: netProfit >= 0 ? "text-green-900" : "text-red-800",
    },
    {
      label: "Net profit %",
      value: formatPlPercent(netProfitPct, rounding),
      sub: "Of total revenue",
      icon: Percent,
      tint: "from-orange-50/90 to-white ring-orange-200/60",
      iconBg: "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)]",
      valueClass: netProfitPct >= 0 ? "text-[var(--gs-navy)]" : "text-red-700",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl border border-[var(--gs-border)] bg-gradient-to-br ${c.tint} shadow-sm ring-1 ${pad}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.label}</p>
              <p
                className={`mt-2 font-mono font-bold tracking-tight ${"valueClass" in c ? c.valueClass : "text-slate-900"} ${compact ? "text-lg" : "text-xl"}`}
              >
                {c.value}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-600">{c.sub}</p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
