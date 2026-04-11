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

export function SummaryCards({ totalDebit, totalCredit, difference, currency, compact }: Props) {
  const pad = compact ? "p-4" : "p-5";
  const isBalanced = Math.abs(difference) < 0.005;

  const cards: {
    label: string;
    value: string;
    icon: typeof TrendingUp;
    tint: string;
    iconBg: string;
    valueClass?: string;
    sub?: string;
  }[] = [
    {
      label: "Total debit",
      value: formatMoney(totalDebit, currency),
      icon: TrendingUp,
      tint: "from-emerald-50/90 to-white ring-emerald-200/60",
      iconBg: "bg-emerald-100 text-[var(--gs-text)]",
    },
    {
      label: "Total credit",
      value: formatMoney(totalCredit, currency),
      icon: TrendingDown,
      tint: "from-rose-50/90 to-white ring-rose-200/60",
      iconBg: "bg-rose-100 text-rose-800",
    },
    {
      label: "Difference",
      value: formatMoney(difference, currency),
      icon: isBalanced ? Equal : AlertTriangle,
      tint: isBalanced
        ? "from-[var(--gs-card)] to-[var(--gs-card)] ring-[var(--gs-border)]/80"
        : "from-red-50/95 to-white ring-red-200/80",
      iconBg: isBalanced ? "bg-[var(--gs-hover)] text-[var(--gs-text)]" : "bg-red-100 text-red-700",
      valueClass: isBalanced ? "text-[var(--gs-text)]" : "text-red-700",
      sub: isBalanced ? "Balanced" : "Out of balance — review",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl border border-[var(--gs-border)] bg-gradient-to-br ${c.tint} shadow-sm ring-1 ${pad}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">{c.label}</p>
              <p
                className={`mt-2 font-mono font-bold tracking-tight ${c.valueClass ?? "text-[var(--gs-text)]"} ${compact ? "text-lg" : "text-xl"}`}
              >
                {c.value}
              </p>
              {c.sub ? <p className="mt-1 text-xs font-semibold text-[var(--gs-muted)]">{c.sub}</p> : null}
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