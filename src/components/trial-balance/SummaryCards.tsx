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
      iconBg: "bg-emerald-100 text-emerald-800",
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
        ? "from-slate-50 to-white ring-slate-200/80"
        : "from-red-50/95 to-white ring-red-200/80",
      iconBg: isBalanced ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-700",
      valueClass: isBalanced ? "text-slate-900" : "text-red-700",
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
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.label}</p>
              <p
                className={`mt-2 font-mono font-bold tracking-tight ${c.valueClass ?? "text-slate-900"} ${compact ? "text-lg" : "text-xl"}`}
              >
                {c.value}
              </p>
              {c.sub ? <p className="mt-1 text-xs font-semibold text-slate-600">{c.sub}</p> : null}
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
