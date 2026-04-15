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

type CardDef = {
  label: string;
  value: string;
  sub: string;
  icon: typeof TrendingUp;
  leftBar: string;
  iconWrap: string;
  valueClass: string;
};

export function SummaryCards({ totalRevenue, grossProfit, netProfit, netProfitPct, currency, rounding, compact }: Props) {
  const pad = compact ? "p-4" : "p-5";
  const cards: CardDef[] = [
    {
      label: "Total revenue",
      value: formatPlAmount(totalRevenue, currency, rounding),
      sub: "Period total",
      icon: TrendingUp,
      leftBar: "border-l-emerald-500",
      iconWrap:
        "bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20",
      valueClass: "text-[var(--gs-text)]",
    },
    {
      label: "Gross profit",
      value: formatPlAmount(grossProfit, currency, rounding),
      sub: "Revenue − COGS",
      icon: Scale,
      leftBar: "border-l-sky-500",
      iconWrap:
        "bg-sky-500/12 text-sky-800 ring-1 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20",
      valueClass: "text-[var(--gs-text)]",
    },
    {
      label: "Net profit",
      value: formatPlAmount(netProfit, currency, rounding),
      sub: netProfit >= 0 ? "After all expenses" : "Net loss",
      icon: PiggyBank,
      leftBar: netProfit >= 0 ? "border-l-emerald-600" : "border-l-red-500",
      iconWrap: netProfit >= 0
        ? "bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20"
        : "bg-red-500/12 text-red-800 ring-1 ring-red-500/25 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-400/20",
      valueClass: netProfit >= 0 ? "text-emerald-900 dark:text-emerald-100" : "text-red-800 dark:text-red-100",
    },
    {
      label: "Net profit %",
      value: formatPlPercent(netProfitPct, rounding),
      sub: "Of total revenue",
      icon: Percent,
      leftBar: "border-l-[var(--gs-accent)]",
      iconWrap: "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)] ring-1 ring-[var(--gs-accent)]/30",
      valueClass: netProfitPct >= 0 ? "text-[var(--gs-text)]" : "text-red-800 dark:text-red-100",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl border border-[var(--gs-border)] border-l-4 bg-[var(--gs-card)] shadow-sm ${c.leftBar} ${pad}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">{c.label}</p>
              <p
                className={`mt-2 font-mono font-bold tracking-tight ${c.valueClass} ${compact ? "text-lg" : "text-xl"}`}
              >
                {c.value}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--gs-muted)]">{c.sub}</p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconWrap}`}>
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
