"use client";

import { AlertTriangle, Equal, TrendingDown, TrendingUp } from "lucide-react";

import { formatMoney } from "@/lib/format";

type Props = {
  totalDebit: number;
  totalCredit: number;
  difference: number;
  currency: "PKR" | "USD";
  compact?: boolean;
};

type CardDef = {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  /** Left accent — same card shell as the app, semantic stripe only */
  leftBar: string;
  iconWrap: string;
  valueClass: string;
  labelClass: string;
  subClass: string;
  sub?: string;
};

export function SummaryCards({ totalDebit, totalCredit, difference, currency, compact }: Props) {
  const pad = compact ? "p-4" : "p-5";
  const isBalanced = Math.abs(difference) < 0.005;

  const cards: CardDef[] = [
    {
      label: "Total debit",
      value: formatMoney(totalDebit, currency),
      icon: TrendingUp,
      leftBar: "border-l-emerald-500",
      iconWrap:
        "bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20",
      valueClass: "text-[var(--gs-text)]",
      labelClass: "text-[var(--gs-muted)]",
      subClass: "text-[var(--gs-muted)]",
    },
    {
      label: "Total credit",
      value: formatMoney(totalCredit, currency),
      icon: TrendingDown,
      leftBar: "border-l-rose-500",
      iconWrap:
        "bg-rose-500/12 text-rose-800 ring-1 ring-rose-500/25 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20",
      valueClass: "text-[var(--gs-text)]",
      labelClass: "text-[var(--gs-muted)]",
      subClass: "text-[var(--gs-muted)]",
    },
    {
      label: "Difference",
      value: formatMoney(difference, currency),
      icon: isBalanced ? Equal : AlertTriangle,
      leftBar: isBalanced ? "border-l-[var(--gs-border-strong)]" : "border-l-red-500",
      iconWrap: isBalanced
        ? "bg-[var(--gs-hover)] text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]"
        : "bg-red-500/12 text-red-800 ring-1 ring-red-500/25 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-400/25",
      valueClass: isBalanced ? "text-[var(--gs-text)]" : "text-red-800 dark:text-red-100",
      labelClass: "text-[var(--gs-muted)]",
      subClass: isBalanced ? "text-[var(--gs-muted)]" : "text-red-700 dark:text-red-200/90",
      sub: isBalanced ? "Balanced" : "Out of balance — review",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl border border-[var(--gs-border)] border-l-4 bg-[var(--gs-card)] shadow-sm ${c.leftBar} ${pad}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wide ${c.labelClass}`}>{c.label}</p>
              <p
                className={`mt-2 font-mono font-bold tracking-tight ${c.valueClass} ${compact ? "text-lg" : "text-xl"}`}
              >
                {c.value}
              </p>
              {c.sub ? <p className={`mt-1 text-xs font-semibold ${c.subClass}`}>{c.sub}</p> : null}
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
