"use client";

import { FileDown, FileSpreadsheet, Printer, RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { fetchIncomeStatement, type IncomeStatementReportDto } from "@/lib/glApi";
import { defaultReportPeriod, periodFromSearchParams } from "@/lib/reportPeriod";
import { AccountDrawer } from "./AccountDrawer";
import { DEFAULT_PL_FILTERS, FilterPanel, type PlFilterState } from "./FilterPanel";
import { roundPlAmount } from "./formatPl";
import { ProfitLossTable } from "./ProfitLossTable";
import { SettingsModal } from "./SettingsModal";
import { SummaryCards } from "./SummaryCards";
import type { PlLine, PlRounding } from "./types";
import { DEFAULT_PL_SETTINGS } from "./types";

const STORAGE_SAVED = "gemstack-pl-saved-view";

const BRANCHES = ["Head office", "Karachi", "Dubai"];

function initialPlFilters(): PlFilterState {
  const { from, to } = defaultReportPeriod();
  return { ...DEFAULT_PL_FILTERS, dateFrom: from, dateTo: to, comparisonMode: "none" };
}

function comparisonLabel(mode: PlFilterState["comparisonMode"]): string {
  if (mode === "previous_year") return "Prior year (same length)";
  if (mode === "previous_period") return "Prior period";
  return "";
}

function buildLinesFromIncomeStatement(rep: IncomeStatementReportDto, rounding: PlRounding): PlLine[] {
  const d = rounding;
  const out: PlLine[] = [];
  const revGid = "revenue";
  out.push({ id: "sec-rev", kind: "section", groupId: revGid, label: "Revenue", depth: 0, current: 0, prior: 0 });
  for (const x of rep.revenue_lines) {
    const a = roundPlAmount(Number.parseFloat(x.amount) || 0, d);
    out.push({
      id: `rev-${x.account_id}`,
      kind: "detail",
      groupId: revGid,
      label: `${x.code} ${x.name}`,
      depth: 1,
      current: a,
      prior: 0,
    });
  }
  const tr = roundPlAmount(Number.parseFloat(rep.total_revenue) || 0, d);
  out.push({ id: "t-rev", kind: "total", groupId: revGid, label: "Total revenue", depth: 0, current: tr, prior: 0 });
  out.push({
    id: "m-gp",
    kind: "margin",
    groupId: "gp",
    label: "Gross profit",
    depth: 0,
    current: tr,
    prior: 0,
  });

  const expGid = "expenses";
  out.push({ id: "sec-exp", kind: "section", groupId: expGid, label: "Expenses", depth: 0, current: 0, prior: 0 });
  for (const x of rep.expense_lines) {
    const a = roundPlAmount(Number.parseFloat(x.amount) || 0, d);
    out.push({
      id: `exp-${x.account_id}`,
      kind: "detail",
      groupId: expGid,
      label: `${x.code} ${x.name}`,
      depth: 1,
      current: a,
      prior: 0,
    });
  }
  const te = roundPlAmount(Number.parseFloat(rep.total_expense) || 0, d);
  out.push({ id: "t-exp", kind: "total", groupId: expGid, label: "Total expenses", depth: 0, current: te, prior: 0 });

  const net = roundPlAmount(Number.parseFloat(rep.net_income) || 0, d);
  out.push({ id: "m-np", kind: "margin", groupId: "net", label: "Net income", depth: 0, current: net, prior: 0 });
  return out;
}

export function ProfitLossPage() {
  const { pushToast } = useAppNotifications();
  const searchParams = useSearchParams();
  const [draftFilters, setDraftFilters] = useState<PlFilterState>(initialPlFilters);
  const [appliedFilters, setAppliedFilters] = useState<PlFilterState>(initialPlFilters);
  const [settings, setSettings] = useState(DEFAULT_PL_SETTINGS);
  const [drawerLine, setDrawerLine] = useState<PlLine | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [report, setReport] = useState<IncomeStatementReportDto | null>(null);
  const [plError, setPlError] = useState<string | null>(null);
  const [plLoading, setPlLoading] = useState(false);

  useEffect(() => {
    const { from, to } = periodFromSearchParams(searchParams);
    setDraftFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
    setAppliedFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, [searchParams]);

  const loadPl = useCallback(async () => {
    setPlLoading(true);
    setPlError(null);
    try {
      const r = await fetchIncomeStatement(appliedFilters.dateFrom, appliedFilters.dateTo, { basis: "accrual" });
      setReport(r);
    } catch (e) {
      setPlError(e instanceof Error ? e.message : "Could not load income statement");
      setReport(null);
    } finally {
      setPlLoading(false);
    }
  }, [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.accountingMethod]);

  useEffect(() => {
    void loadPl();
  }, [loadPl]);

  const lines = useMemo(() => {
    if (!report) return [];
    return buildLinesFromIncomeStatement(report, settings.roundingDecimals);
  }, [report, settings.roundingDecimals]);

  const totalRevenue = useMemo(() => Number.parseFloat(report?.total_revenue ?? "0") || 0, [report]);
  const grossProfit = useMemo(() => Number.parseFloat(report?.total_revenue ?? "0") || 0, [report]);
  const netProfit = useMemo(() => Number.parseFloat(report?.net_income ?? "0") || 0, [report]);
  const netProfitPct = totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0;

  const displayCurrency: "PKR" | "USD" =
    appliedFilters.currency === "USD" ? "USD" : appliedFilters.currency === "PKR" ? "PKR" : "PKR";

  const showComparison = appliedFilters.comparisonMode !== "none" && settings.showComparison;
  const showPct = appliedFilters.showPercentages && settings.showPercentages;

  const breakdown = useMemo(() => {
    if (!drawerLine) return [];
    return [];
  }, [drawerLine]);

  const miniTx = useMemo(() => {
    if (!drawerLine) return [];
    return [];
  }, [drawerLine]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    const next = initialPlFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
  }, []);

  const saveView = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_SAVED, JSON.stringify(draftFilters));
      pushToast("P&L view saved in this browser.", "success");
    } catch {
      pushToast("Could not save view.", "error");
    }
  }, [draftFilters, pushToast]);

  const loadView = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED);
      if (!raw) {
        pushToast("No saved view found.", "info");
        return;
      }
      const parsed = JSON.parse(raw) as PlFilterState;
      setDraftFilters({ ...initialPlFilters(), ...parsed });
      setAppliedFilters({ ...initialPlFilters(), ...parsed });
      pushToast("Loaded saved view.", "success");
    } catch {
      pushToast("Could not load view.", "error");
    }
  }, [pushToast]);

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl md:text-4xl">Profit & Loss</h1>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--gs-muted)] md:mt-1 md:text-sm">
            <span>
              Period:{" "}
              <span className="font-mono font-semibold text-[var(--gs-text)]">
                {appliedFilters.dateFrom} → {appliedFilters.dateTo}
              </span>
            </span>
            <span className="text-[var(--gs-muted)]">|</span>
            <span>{appliedFilters.accountingMethod} basis</span>
            {appliedFilters.branch ? (
              <>
                <span className="text-[var(--gs-muted)]">|</span>
                <span>{appliedFilters.branch}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => pushToast("Demo: export P&L PDF", "info")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Export PDF"
            title="Export PDF"
          >
            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => pushToast("Demo: export Excel", "info")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Export Excel"
            title="Export Excel"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
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
            onClick={() => {
              setAppliedFilters({ ...draftFilters });
              void loadPl();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gs-accent)] text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
            aria-label="Settings"
            title="Settings"
          >
            <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        </div>
      </header>

      <FilterPanel
        value={draftFilters}
        onChange={setDraftFilters}
        branchOptions={BRANCHES}
        onApply={applyFilters}
        onReset={resetFilters}
        onSaveView={saveView}
        onLoadView={loadView}
      />

      {plError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          {plError}
        </p>
      ) : null}
      {plLoading ? <p className="text-sm text-[var(--gs-muted)]">Loading income statement…</p> : null}

      <SummaryCards
        totalRevenue={totalRevenue}
        grossProfit={grossProfit}
        netProfit={netProfit}
        netProfitPct={netProfitPct}
        currency={displayCurrency}
        rounding={settings.roundingDecimals}
        compact={settings.compactView}
      />

      {appliedFilters.currency === "All" ? (
        <p className="text-xs text-[var(--gs-muted)]">Currency shown as PKR (demo). Select PKR or USD in filters to fix the label.</p>
      ) : null}

      <ProfitLossTable
        lines={lines}
        totalRevenue={totalRevenue}
        displayCurrency={displayCurrency}
        rounding={settings.roundingDecimals}
        showComparison={showComparison}
        comparisonLabel={comparisonLabel(appliedFilters.comparisonMode)}
        showPercentages={showPct}
        showZeroBalances={appliedFilters.showZeroBalances}
        compact={settings.compactView}
        onLineClick={setDrawerLine}
        onDownload={() => {
          if (!report) return;
          const rows = [
            ["Section", "Label", "Amount"],
            ...lines.filter((l) => l.kind !== "section").map((l) => [l.kind, l.label, String(l.current)]),
          ];
          const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `profit-loss-${report.date_from}-${report.date_to}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onEmail={() => pushToast("Demo: email P&L", "info")}
      />

      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>

      <AccountDrawer
        open={!!drawerLine}
        line={drawerLine}
        breakdown={breakdown}
        transactions={miniTx}
        displayCurrency={displayCurrency}
        rounding={settings.roundingDecimals}
        onClose={() => setDrawerLine(null)}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onChange={setSettings} />
    </div>
  );
}