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

type CardDef = {
  label: string;
  value: string;
  icon: typeof Wallet;
  leftBar: string;
  iconWrap: string;
};

export function SummaryCards({ opening, totalDebit, totalCredit, closing, currency, compact }: Props) {
  const pad = compact ? "p-4" : "p-5";
  const cards: CardDef[] = [
    {
      label: "Opening balance",
      value: formatMoney(opening, currency),
      icon: Wallet,
      leftBar: "border-l-[var(--gs-border-strong)]",
      iconWrap:
        "bg-[var(--gs-hover)] text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]",
    },
    {
      label: "Total debit",
      value: formatMoney(totalDebit, currency),
      icon: TrendingUp,
      leftBar: "border-l-emerald-500",
      iconWrap:
        "bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20",
    },
    {
      label: "Total credit",
      value: formatMoney(totalCredit, currency),
      icon: TrendingDown,
      leftBar: "border-l-rose-500",
      iconWrap:
        "bg-rose-500/12 text-rose-800 ring-1 ring-rose-500/25 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20",
    },
    {
      label: "Closing balance",
      value: formatMoney(closing, currency),
      icon: Scale,
      leftBar: "border-l-[var(--gs-accent)]",
      iconWrap:
        "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)] ring-1 ring-[var(--gs-accent)]/30",
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
                className={`mt-2 font-mono font-bold tracking-tight text-[var(--gs-text)] ${compact ? "text-lg" : "text-xl"}`}
              >
                {c.value}
              </p>
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
