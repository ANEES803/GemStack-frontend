"use client";

import { Download, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";

import { BalanceSheetDrawer } from "./BalanceSheetDrawer";
import { BalanceSheetTable } from "./BalanceSheetTable";
import { BALANCE_SHEET_ROWS, transactionsForAccount } from "./mockData";

import type { BsRow } from "./types";

export function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState("2026-03-31");
  const [selected, setSelected] = useState<BsRow | null>(null);

  const { totalAssets, totalLiabilities, totalEquity, balanceDifference } = useMemo(() => {
    const ta = BALANCE_SHEET_ROWS.find((r) => r.id === "t-assets")?.amount ?? 0;
    const tl = BALANCE_SHEET_ROWS.find((r) => r.id === "t-liab")?.amount ?? 0;
    const te = BALANCE_SHEET_ROWS.find((r) => r.id === "t-eq")?.amount ?? 0;
    const diff = ta - tl - te;
    return { totalAssets: ta, totalLiabilities: tl, totalEquity: te, balanceDifference: diff };
  }, []);

  const txs = useMemo(() => (selected?.id ? transactionsForAccount(selected.id) : []), [selected]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl">Balance Sheet</h1>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Assets vs Liabilities + Equity snapshot</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.alert("Demo: export balance sheet")}
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
        <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">As of date</label>
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="mt-2 max-w-xs rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
        />
        <p className="mt-2 text-xs text-[var(--gs-muted)]">Figures are demo data in PKR. Date selection is for display only.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total assets</p>
          <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalAssets, "PKR")}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total liabilities</p>
          <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalLiabilities, "PKR")}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total equity</p>
          <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalEquity, "PKR")}</p>
        </div>
      </div>

      <BalanceSheetTable rows={BALANCE_SHEET_ROWS} balanceDifference={balanceDifference} onAccountClick={setSelected} />

      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>

      <BalanceSheetDrawer
        open={!!selected}
        accountLabel={selected?.label ?? null}
        transactions={txs}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}