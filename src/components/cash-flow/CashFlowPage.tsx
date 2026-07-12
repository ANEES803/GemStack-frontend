"use client";

import { Download, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchCashFlowReport, type CashFlowReportDto } from "@/lib/glApi";
import { defaultReportPeriod, periodFromSearchParams } from "@/lib/reportPeriod";
import { formatMoney } from "@/lib/format";

import { CashFlowDrawer } from "./CashFlowDrawer";
import { CashFlowTable } from "./CashFlowTable";

import type { CfRow, CfTx } from "./types";

function buildRowsFromReport(rep: CashFlowReportDto): CfRow[] {
  const rows: CfRow[] = [];
  for (const s of rep.sections) {
    rows.push({ id: `sec-${s.id}`, kind: "section", label: s.label, depth: 0, amount: null });
    rows.push({
      id: `t-${s.id}`,
      kind: "total",
      label: `Net cash — ${s.label}`,
      depth: 1,
      amount: Number.parseFloat(s.amount) || 0,
    });
  }
  const net = Number.parseFloat(rep.net_change) || 0;
  const open = Number.parseFloat(rep.opening_cash) || 0;
  const close = Number.parseFloat(rep.closing_cash) || 0;
  rows.push({ id: "sum-net", kind: "grand_total", label: "Net increase (decrease) in cash", depth: 0, amount: net });
  rows.push({ id: "sum-open", kind: "summary", label: "Opening cash balance", depth: 0, amount: open });
  rows.push({ id: "sum-close", kind: "grand_total", label: "Closing cash balance", depth: 0, amount: close });
  rows.push({
    id: "check",
    kind: "check",
    label: "Reconciliation (opening + net change − closing)",
    depth: 0,
    amount: open + net - close,
  });
  return rows;
}

function bucketFromRowId(id: string | undefined): string | null {
  if (!id) return null;
  if (id.startsWith("sec-")) return id.slice("sec-".length);
  if (id.startsWith("t-")) return id.slice("t-".length);
  return null;
}

export function CashFlowPage() {
  const searchParams = useSearchParams();
  const initial = defaultReportPeriod();
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [report, setReport] = useState<CashFlowReportDto | null>(null);
  const [cfError, setCfError] = useState<string | null>(null);
  const [cfLoading, setCfLoading] = useState(false);
  const [selected, setSelected] = useState<CfRow | null>(null);

  useEffect(() => {
    const { from, to } = periodFromSearchParams(searchParams);
    setDateFrom(from);
    setDateTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
  }, [searchParams]);

  const load = useCallback(async () => {
    setCfLoading(true);
    setCfError(null);
    try {
      const r = await fetchCashFlowReport(appliedFrom, appliedTo);
      setReport(r);
    } catch (e) {
      setCfError(e instanceof Error ? e.message : "Could not load cash flow");
      setReport(null);
    } finally {
      setCfLoading(false);
    }
  }, [appliedFrom, appliedTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => (report ? buildRowsFromReport(report) : []), [report]);

  const { opening, netChange, closing, reconciliationDiff } = useMemo(() => {
    const o = rows.find((r) => r.id === "sum-open")?.amount ?? 0;
    const n = rows.find((r) => r.id === "sum-net")?.amount ?? 0;
    const c = rows.find((r) => r.id === "sum-close")?.amount ?? 0;
    const diff = (rows.find((r) => r.id === "check")?.amount ?? o + n - c) ?? 0;
    return { opening: o ?? 0, netChange: n ?? 0, closing: c ?? 0, reconciliationDiff: diff ?? 0 };
  }, [rows]);

  const txs = useMemo((): CfTx[] => {
    if (!selected?.id || !report) return [];
    const bucket = bucketFromRowId(selected.id);
    if (!bucket) return [];
    return report.detail_lines
      .filter((l) => l.bucket === bucket)
      .map((l) => ({
        id: String(l.journal_id),
        date: l.entry_date,
        ref: l.reference,
        memo: l.memo || l.description,
        amount: Number.parseFloat(l.net_cash) || 0,
      }));
  }, [selected, report]);

  const applyRange = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl">Cash Flow</h1>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Simplified direct method (default bank GL account)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!report) return;
              const lines = [
                ["entry_date", "reference", "memo", "net_cash", "bucket"],
                ...report.detail_lines.map((l) => [l.entry_date, l.reference, l.memo, l.net_cash, l.bucket]),
              ];
              const csv = lines.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `cash-flow-${report.date_from}-${report.date_to}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Export"
            title="Export CSV"
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
            <RefreshCw className={`h-4 w-4 shrink-0 ${cfLoading ? "animate-spin" : ""}`} aria-hidden />
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
        <button
          type="button"
          onClick={applyRange}
          className="mt-4 rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
        >
          Apply range
        </button>
        {report?.note ? <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">{report.note}</p> : null}
        <p className="mt-3 text-xs text-[var(--gs-muted)]">Amounts use your functional currency from GL settings.</p>
      </div>

      {cfError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          {cfError}
        </p>
      ) : null}

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

      {cfLoading && !report ? <p className="text-sm text-[var(--gs-muted)]">Loading…</p> : null}

      <CashFlowTable rows={rows} reconciliationDiff={reconciliationDiff} onLineClick={setSelected} />

      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>

      <CashFlowDrawer open={!!selected} lineLabel={selected?.label ?? null} transactions={txs} onClose={() => setSelected(null)} />
    </div>
  );
}
