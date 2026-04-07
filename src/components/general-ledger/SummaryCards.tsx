"use client";

import { Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { formatMoney } from "@/lib/format";

type Props = {
  opening: number;
  totalDebit: number;
  totalCredit: number;
  closing: number;
  currency: "PKR" | "USD";
  compact?: boolean;
};

export function SummaryCards({ opening, totalDebit, totalCredit, closing, currency, compact }: Props) {
  const pad = compact ? "p-4" : "p-5";
  const cards = [
    {
      label: "Opening balance",
      value: formatMoney(opening, currency),
      icon: Wallet,
      tint: "from-slate-50 to-white ring-slate-200/80",
      iconBg: "bg-slate-100 text-slate-700",
    },
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
      label: "Closing balance",
      value: formatMoney(closing, currency),
      icon: Scale,
      tint: "from-orange-50/90 to-white ring-orange-200/70",
      iconBg: "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)]",
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
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.label}</p>
              <p className={`mt-2 font-mono font-bold tracking-tight text-slate-900 ${compact ? "text-lg" : "text-xl"}`}>
                {c.value}
              </p>
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
