"use client";

import { Download, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";

import { CashFlowDrawer } from "./CashFlowDrawer";
import { CashFlowTable } from "./CashFlowTable";
import { CASH_FLOW_ROWS, transactionsForCashLine } from "./mockData";

import type { CfRow } from "./types";

export function CashFlowPage() {
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-31");
  const [selected, setSelected] = useState<CfRow | null>(null);

  const { opening, netChange, closing, reconciliationDiff } = useMemo(() => {
    const o = CASH_FLOW_ROWS.find((r) => r.id === "sum-open")?.amount ?? 0;
    const n = CASH_FLOW_ROWS.find((r) => r.id === "sum-net")?.amount ?? 0;
    const c = CASH_FLOW_ROWS.find((r) => r.id === "sum-close")?.amount ?? 0;
    const diff = o + n - c;
    return { opening: o, netChange: n, closing: c, reconciliationDiff: diff };
  }, []);

  const txs = useMemo(() => (selected?.id ? transactionsForCashLine(selected.id) : []), [selected]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl">Cash Flow</h1>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Operating, investing, financing activities</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.alert("Demo: export cash flow statement")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Export"
            title="Export"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Print"
            title="Print"
          >
            <Printer className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => window.alert("Refreshed (demo).")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gs-accent)] text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--gs-muted)]">
          Period is for display only (demo). Amounts are PKR.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Net change in cash</p>
          <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(netChange, "PKR")}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Opening cash</p>
          <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(opening, "PKR")}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Closing cash</p>
          <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(closing, "PKR")}</p>
        </div>
      </div>

      <CashFlowTable rows={CASH_FLOW_ROWS} reconciliationDiff={reconciliationDiff} onLineClick={setSelected} />

      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>

      <CashFlowDrawer open={!!selected} lineLabel={selected?.label ?? null} transactions={txs} onClose={() => setSelected(null)} />
    </div>
  );
}