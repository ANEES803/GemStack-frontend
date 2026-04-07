"use client";

import { FileDown, FileSpreadsheet, Printer, RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AccountDrawer } from "./AccountDrawer";
import { DEFAULT_TB_FILTERS, FilterPanel, type TbFilterState } from "./FilterPanel";
import {
  applyRounding,
  buildTrialBalanceSource,
  miniLedgerForAccount,
  netToDebitCredit,
} from "./mockData";
import { SettingsModal } from "./SettingsModal";
import { SummaryCards } from "./SummaryCards";
import { TrialBalanceTable } from "./TrialBalanceTable";
import type { TbAccountSource, TbColumnId, TbDisplayRow, TbSettings, SortDirTB, SortKeyTB } from "./types";
import { DEFAULT_TB_SETTINGS } from "./types";

const STORAGE_SAVED = "gemstack-tb-saved-view";

function compareDisplay(a: TbDisplayRow, b: TbDisplayRow, key: SortKeyTB, dir: SortDirTB): number {
  const m = dir === "asc" ? 1 : -1;
  const cs = (x: string, y: string) => m * x.localeCompare(y);
  const cn = (x: number, y: number) => m * (x - y);
  switch (key) {
    case "code":
      return cs(a.code, b.code);
    case "name":
      return cs(a.name, b.name);
    case "type":
      return cs(a.type, b.type) || cs(a.code, b.code);
    case "debit":
      return cn(a.debit, b.debit);
    case "credit":
      return cn(a.credit, b.credit);
    case "priorDebit":
      return cn(a.priorDebit, b.priorDebit);
    case "priorCredit":
      return cn(a.priorCredit, b.priorCredit);
    default:
      return 0;
  }
}

function filterSource(list: TbAccountSource[], f: TbFilterState): TbAccountSource[] {
  return list.filter((r) => {
    if (f.accountFrom.trim() && r.code.localeCompare(f.accountFrom.trim()) < 0) return false;
    if (f.accountTo.trim() && r.code.localeCompare(f.accountTo.trim()) > 0) return false;
    if (f.accountType !== "All" && r.type !== f.accountType) return false;
    if (f.branch && r.branch !== f.branch) return false;
    if (f.currency !== "All" && r.currency !== f.currency) return false;
    return true;
  });
}

function toDisplayRow(src: TbAccountSource, includeUnposted: boolean, rounding: TbSettings["rounding"]): TbDisplayRow {
  const pdr = src.postedDebit + (includeUnposted ? src.draftDebit : 0);
  const pcr = src.postedCredit + (includeUnposted ? src.draftCredit : 0);
  const cur = netToDebitCredit(pdr, pcr);
  const prior = netToDebitCredit(src.priorPostedDebit, src.priorPostedCredit);
  return {
    id: src.id,
    code: src.code,
    name: src.name,
    type: src.type,
    branch: src.branch,
    currency: src.currency,
    debit: applyRounding(cur.debit, rounding),
    credit: applyRounding(cur.credit, rounding),
    priorDebit: applyRounding(prior.debit, rounding),
    priorCredit: applyRounding(prior.credit, rounding),
    openingBalance: src.openingBalance,
  };
}

const DEFAULT_COL_PICK: Record<TbColumnId, boolean> = {
  code: true,
  name: true,
  type: true,
  debit: true,
  credit: true,
  priorDebit: true,
  priorCredit: true,
};

export function TrialBalancePage() {
  const source = useMemo(() => buildTrialBalanceSource(), []);
  const branchOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of source) s.add(r.branch);
    return [...s].sort();
  }, [source]);

  const [draftFilters, setDraftFilters] = useState<TbFilterState>(DEFAULT_TB_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<TbFilterState>(DEFAULT_TB_FILTERS);
  const [settings, setSettings] = useState<TbSettings>(DEFAULT_TB_SETTINGS);
  const [sortKey, setSortKey] = useState<SortKeyTB>(DEFAULT_TB_SETTINGS.defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDirTB>(DEFAULT_TB_SETTINGS.defaultSortDir);
  const [columnPick, setColumnPick] = useState<Record<TbColumnId, boolean>>(DEFAULT_COL_PICK);
  const [page, setPage] = useState(1);
  const [drawerRow, setDrawerRow] = useState<TbDisplayRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setColumnPick((p) => ({
      ...p,
      code: settings.showAccountCodes,
      type: settings.showAccountType,
    }));
  }, [settings.showAccountCodes, settings.showAccountType]);

  useEffect(() => {
    if (!appliedFilters.useComparison && (sortKey === "priorDebit" || sortKey === "priorCredit")) {
      setSortKey("code");
      setSortDir("asc");
    }
  }, [appliedFilters.useComparison, sortKey]);

  const displayCurrency: "PKR" | "USD" =
    appliedFilters.currency === "USD" ? "USD" : appliedFilters.currency === "PKR" ? "PKR" : "PKR";

  const processedRows = useMemo(() => {
    const filtered = filterSource(source, appliedFilters);
    let rows = filtered.map((s) => toDisplayRow(s, appliedFilters.includeUnposted, settings.rounding));
    if (!appliedFilters.includeZeroBalances) {
      rows = rows.filter((r) => r.debit > 0 || r.credit > 0);
    }
    return [...rows].sort((a, b) => compareDisplay(a, b, sortKey, sortDir) || a.code.localeCompare(b.code));
  }, [source, appliedFilters, settings.rounding, sortKey, sortDir]);

  const footerTotals = useMemo(() => {
    let td = 0;
    let tc = 0;
    for (const r of processedRows) {
      if (appliedFilters.currency !== "All" && r.currency !== appliedFilters.currency) continue;
      td += r.debit;
      tc += r.credit;
    }
    return { debit: td, credit: tc, difference: td - tc };
  }, [processedRows, appliedFilters.currency]);

  const drawerLines = useMemo(() => {
    if (!drawerRow) return [];
    return miniLedgerForAccount(drawerRow.id, drawerRow.code).lines;
  }, [drawerRow]);

  const handleSort = useCallback((key: SortKeyTB) => {
    setPage(1);
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const toggleColumn = useCallback((id: TbColumnId) => {
    setColumnPick((prev) => {
      if (id === "name") return prev;
      if (id === "code" || id === "type") {
        const next = { ...prev, [id]: !prev[id] };
        const n = (next.code ? 1 : 0) + (next.name ? 1 : 0) + (next.type ? 1 : 0);
        if (n === 0) return prev;
        return next;
      }
      const next = { ...prev, [id]: !prev[id] };
      if (!next.debit && !next.credit && !next.priorDebit && !next.priorCredit) return prev;
      return next;
    });
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    setDraftFilters(DEFAULT_TB_FILTERS);
    setAppliedFilters(DEFAULT_TB_FILTERS);
    setPage(1);
  }, []);

  const saveView = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_SAVED, JSON.stringify(draftFilters));
      window.alert("Trial balance view saved in this browser.");
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
      const parsed = JSON.parse(raw) as TbFilterState;
      setDraftFilters({ ...DEFAULT_TB_FILTERS, ...parsed });
      setAppliedFilters({ ...DEFAULT_TB_FILTERS, ...parsed });
      setPage(1);
      window.alert("Loaded saved view.");
    } catch {
      window.alert("Could not load view.");
    }
  }, []);

  const closeSettings = useCallback(() => {
    setSortKey(settings.defaultSortKey);
    setSortDir(settings.defaultSortDir);
    setSettingsOpen(false);
  }, [settings.defaultSortKey, settings.defaultSortDir]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-navy)] sm:text-3xl">Trial Balance</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--gs-muted)]">
            All accounts — debits vs credits (as of date)
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            As of{" "}
            <span className="font-mono text-slate-800">
              {appliedFilters.asOfDate}
              {appliedFilters.useDateRange
                ? ` · Activity ${appliedFilters.dateFrom} → ${appliedFilters.dateTo}`
                : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.alert("Demo: export trial balance PDF")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
            aria-label="Export PDF"
            title="Export PDF"
          >
            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => window.alert("Demo: export Excel")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
            aria-label="Export Excel"
            title="Export Excel"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
            aria-label="Print"
            title="Print"
          >
            <Printer className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setAppliedFilters({ ...draftFilters });
              setPage(1);
              window.alert("Refreshed (demo).");
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gs-navy)] text-white shadow-sm hover:bg-slate-800"
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
        branchOptions={branchOptions}
        onApply={applyFilters}
        onReset={resetFilters}
        onSaveView={saveView}
        onLoadView={loadView}
      />

      <SummaryCards
        totalDebit={footerTotals.debit}
        totalCredit={footerTotals.credit}
        difference={footerTotals.difference}
        currency={displayCurrency}
        compact={settings.compactView}
      />

      {appliedFilters.currency === "All" ? (
        <p className="text-xs text-[var(--gs-muted)]">
          Totals include all currencies as one column (demo). Filter by PKR or USD for a single-currency total.
        </p>
      ) : null}

      <TrialBalanceTable
        rows={processedRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        visibleColumns={{ ...columnPick, name: true }}
        onToggleColumn={toggleColumn}
        showComparison={appliedFilters.useComparison}
        comparisonLabel={appliedFilters.comparisonPeriodLabel}
        compact={settings.compactView}
        page={page}
        pageSize={14}
        onPageChange={setPage}
        onRowClick={setDrawerRow}
        footerTotals={footerTotals}
        displayCurrency={displayCurrency}
        onDownload={() => window.alert("Demo: download trial balance report")}
        onEmail={() => window.alert("Demo: email trial balance")}
      />

      <p className="text-center text-xs text-slate-400">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>

      <AccountDrawer
        open={!!drawerRow}
        row={drawerRow}
        openingBalance={drawerRow?.openingBalance ?? 0}
        lines={drawerLines}
        onClose={() => setDrawerRow(null)}
      />

      <SettingsModal open={settingsOpen} onClose={closeSettings} settings={settings} onChange={setSettings} />
    </div>
  );
}
