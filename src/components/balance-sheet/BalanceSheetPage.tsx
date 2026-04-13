"use client";

import { Download, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BalanceSheetDrawer } from "./BalanceSheetDrawer";
import { BalanceSheetTable } from "./BalanceSheetTable";
import { transactionsForAccount } from "./mockData";
import { LoadingBlock } from "@/components/ui/LoadingBlock";

import type { BsRow } from "./types";

import { fetchBalanceSheet, getGlSettings, type BalanceSheetLineDto } from "@/lib/glApi";
import { formatMoney } from "@/lib/format";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildRows(lines: BalanceSheetLineDto[]): {
  rows: BsRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
} {
  const posting = (t: string) => lines.filter((l) => l.account_type === t && !l.is_group);
  const assets = posting("Asset");
  const liabs = posting("Liability");
  const equity = posting("Equity");

  const sum = (xs: BalanceSheetLineDto[]) => xs.reduce((s, x) => s + (Number.parseFloat(x.balance) || 0), 0);
  const ta = sum(assets);
  const tl = sum(liabs);
  const te = sum(equity);

  const rows: BsRow[] = [];
  rows.push({ id: "sec-assets", kind: "section", label: "Assets", depth: 0, amount: null });
  for (const a of assets.sort((x, y) => x.code.localeCompare(y.code))) {
    rows.push({
      id: a.account_id,
      kind: "detail",
      label: `${a.code}  ${a.name}`,
      depth: 1,
      amount: Number.parseFloat(a.balance) || 0,
    });
  }
  rows.push({ id: "t-assets", kind: "grand_total", label: "Total assets", depth: 0, amount: ta });

  rows.push({ id: "sec-liab", kind: "section", label: "Liabilities", depth: 0, amount: null });
  for (const a of liabs.sort((x, y) => x.code.localeCompare(y.code))) {
    rows.push({
      id: a.account_id,
      kind: "detail",
      label: `${a.code}  ${a.name}`,
      depth: 1,
      amount: Number.parseFloat(a.balance) || 0,
    });
  }
  rows.push({ id: "t-liab", kind: "grand_total", label: "Total liabilities", depth: 0, amount: tl });

  rows.push({ id: "sec-eq", kind: "section", label: "Equity", depth: 0, amount: null });
  for (const a of equity.sort((x, y) => x.code.localeCompare(y.code))) {
    rows.push({
      id: a.account_id,
      kind: "detail",
      label: `${a.code}  ${a.name}`,
      depth: 1,
      amount: Number.parseFloat(a.balance) || 0,
    });
  }
  rows.push({ id: "t-eq", kind: "grand_total", label: "Total equity", depth: 0, amount: te });

  return { rows, totalAssets: ta, totalLiabilities: tl, totalEquity: te };
}

export function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(todayIso);
  const [selected, setSelected] = useState<BsRow | null>(null);
  const [ccy, setCcy] = useState("USD");
  const [apiLines, setApiLines] = useState<BalanceSheetLineDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [s, lines] = await Promise.all([getGlSettings(), fetchBalanceSheet(asOfDate)]);
      setCcy(s.functional_currency || "USD");
      setApiLines(lines);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load balance sheet");
      setApiLines([]);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const { rows, totalAssets, totalLiabilities, totalEquity } = useMemo(() => buildRows(apiLines), [apiLines]);
  const balanceDifference = useMemo(() => totalAssets - totalLiabilities - totalEquity, [totalAssets, totalLiabilities, totalEquity]);

  const txs = useMemo(() => {
    if (!selected?.id) return [];
    return transactionsForAccount(selected.id);
  }, [selected]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl">Balance Sheet</h1>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">From posted journals (functional currency)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.alert("Export is not available yet.")}
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
            onClick={() => void load()}
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
        <p className="mt-2 text-xs text-[var(--gs-muted)]">
          Includes journal lines on or before this date. Currency: <strong>{ccy}</strong>.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{loadError}</div>
      ) : null}

      {loading ? (
        <LoadingBlock label="Loading balance sheet…" />
      ) : loadError ? null : (
        <>
          <div className="grid gap-3 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total assets</p>
              <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalAssets, ccy)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total liabilities</p>
              <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalLiabilities, ccy)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total equity</p>
              <p className="mt-1 font-mono font-bold text-[var(--gs-text)]">{formatMoney(totalEquity, ccy)}</p>
            </div>
          </div>
          <BalanceSheetTable rows={rows} balanceDifference={balanceDifference} onAccountClick={setSelected} />
        </>
      )}

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
