"use client";

import { FileDown, FileSpreadsheet, Printer, RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { AccountDrawer } from "./AccountDrawer";
import { DEFAULT_PL_FILTERS, FilterPanel, type PlFilterState } from "./FilterPanel";
import { roundPlAmount } from "./formatPl";
import { breakdownWithAmounts, buildPlLines, miniLedgerForPlLine } from "./mockData";
import { ProfitLossTable } from "./ProfitLossTable";
import { SettingsModal } from "./SettingsModal";
import { SummaryCards } from "./SummaryCards";
import type { PlLine } from "./types";
import { DEFAULT_PL_SETTINGS } from "./types";

const STORAGE_SAVED = "gemstack-pl-saved-view";

const BRANCHES = ["Head office", "Karachi", "Dubai"];

function comparisonLabel(mode: PlFilterState["comparisonMode"]): string {
  if (mode === "previous_year") return "Prior year (same length)";
  if (mode === "previous_period") return "Prior period";
  return "";
}

export function ProfitLossPage() {
  const [draftFilters, setDraftFilters] = useState<PlFilterState>(DEFAULT_PL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<PlFilterState>(DEFAULT_PL_FILTERS);
  const [settings, setSettings] = useState(DEFAULT_PL_SETTINGS);
  const [drawerLine, setDrawerLine] = useState<PlLine | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const lines = useMemo(() => {
    const raw = buildPlLines(appliedFilters.comparisonMode);
    const d = settings.roundingDecimals;
    return raw.map((r) => ({
      ...r,
      current: roundPlAmount(r.current, d),
      prior: roundPlAmount(r.prior, d),
    }));
  }, [appliedFilters.comparisonMode, settings.roundingDecimals]);

  const totalRevenue = useMemo(() => lines.find((r) => r.id === "t-rev")?.current ?? 1, [lines]);
  const grossProfit = useMemo(() => lines.find((r) => r.id === "m-gp")?.current ?? 0, [lines]);
  const netProfit = useMemo(() => lines.find((r) => r.id === "m-np")?.current ?? 0, [lines]);
  const netProfitPct = totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0;

  const displayCurrency: "PKR" | "USD" =
    appliedFilters.currency === "USD" ? "USD" : appliedFilters.currency === "PKR" ? "PKR" : "PKR";

  const showComparison = appliedFilters.comparisonMode !== "none" && settings.showComparison;
  const showPct = appliedFilters.showPercentages && settings.showPercentages;

  const breakdown = useMemo(() => {
    if (!drawerLine) return [];
    return breakdownWithAmounts(drawerLine.id, drawerLine.current);
  }, [drawerLine]);

  const miniTx = useMemo(() => {
    if (!drawerLine) return [];
    return miniLedgerForPlLine(drawerLine.id, drawerLine.label);
  }, [drawerLine]);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(DEFAULT_PL_FILTERS);
    setAppliedFilters(DEFAULT_PL_FILTERS);
  }, []);

  const saveView = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_SAVED, JSON.stringify(draftFilters));
      window.alert("P&L view saved in this browser.");
    } catch {
      window.alert("Could not save view.");
    }
  }, [draftFilters]);

  const loadView = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED);
      if (!raw) {
        window.alert("No saved view found.");
        return;
      }
      const parsed = JSON.parse(raw) as PlFilterState;
      setDraftFilters({ ...DEFAULT_PL_FILTERS, ...parsed });
      setAppliedFilters({ ...DEFAULT_PL_FILTERS, ...parsed });
      window.alert("Loaded saved view.");
    } catch {
      window.alert("Could not load view.");
    }
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl">Profit & Loss</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--gs-muted)]">Revenue, COGS, expenses, net profit</p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--gs-muted)]">
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
            onClick={() => window.alert("Demo: export P&L PDF")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Export PDF"
            title="Export PDF"
          >
            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => window.alert("Demo: export Excel")}
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
              window.alert("Refreshed (demo).");
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
        onDownload={() => window.alert("Demo: download P&L")}
        onEmail={() => window.alert("Demo: email P&L")}
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