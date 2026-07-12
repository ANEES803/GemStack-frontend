"use client";

import { FileDown, FileSpreadsheet, Printer, RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import {
  downloadGeneralLedgerCsv,
  fetchGeneralLedgerLines,
  getGlSettings,
  getJournalEntry,
  type GeneralLedgerLineDto,
  type JournalDetailDto,
} from "@/lib/glApi";
import { defaultReportPeriod, periodFromSearchParams } from "@/lib/reportPeriod";
import { DEFAULT_GL_FILTERS, FilterPanel, type GlFilterState } from "./FilterPanel";
import { LedgerDrawer } from "./LedgerDrawer";
import { LedgerTable, LedgerTableToolbar, type LedgerRowView } from "./LedgerTable";
import { SettingsModal } from "./SettingsModal";
import { SummaryCards } from "./SummaryCards";
import type {
  AccountTypeFilter,
  ColumnId,
  GlSettings,
  GroupByMode,
  LedgerRow,
  PostingStatus,
  SortDir,
  SortKey,
  TransactionType,
} from "./types";
import { DEFAULT_GL_SETTINGS } from "./types";

const STORAGE_SAVED_VIEW = "gemstack-gl-saved-view";
const STORAGE_DEFAULT_FILTERS = "gemstack-gl-default-filters";
const OPENING_BALANCE = 0;

function mapApiAccountTypeToFilter(raw: string): AccountTypeFilter {
  const s = (raw || "").trim().toLowerCase();
  if (s === "asset") return "Asset";
  if (s === "liability") return "Liability";
  if (s === "equity") return "Equity";
  if (s === "revenue") return "Revenue";
  if (s === "expense") return "Expense";
  return "Expense";
}

function mapGlLineToRow(ln: GeneralLedgerLineDto, currency: "PKR" | "USD"): LedgerRow {
  const tt: TransactionType =
    ln.source_type === "purchase_lot_receipt" ? "Bill" : ln.source_type === "lot_payment" ? "Payment" : "Journal";
  const st: PostingStatus = ln.status === "posted" ? "Posted" : "Draft";
  return {
    id: `${ln.journal_entry_id}-${ln.line_id}`,
    journalEntryId: ln.journal_entry_id,
    date: ln.entry_date,
    journalNo: ln.reference,
    transactionType: tt,
    accountCode: ln.account_code,
    accountName: ln.account_name,
    accountType: mapApiAccountTypeToFilter(ln.account_type),
    description: ln.description || ln.memo || "",
    reference: ln.reference,
    debit: Number.parseFloat(ln.debit) || 0,
    credit: Number.parseFloat(ln.credit) || 0,
    contact: "",
    branch: "Main",
    currency,
    status: st,
  };
}

function initialGlFilters(): GlFilterState {
  const { from, to } = defaultReportPeriod();
  return { ...DEFAULT_GL_FILTERS, dateFrom: from, dateTo: to };
}

const DEFAULT_VISIBLE: Record<ColumnId, boolean> = {
  date: true,
  journalNo: true,
  transactionType: true,
  account: true,
  description: true,
  reference: true,
  debit: true,
  credit: true,
  runningBalance: true,
};

function lineAmount(r: LedgerRow): number {
  return r.debit + r.credit;
}

function filterRows(rows: LedgerRow[], f: GlFilterState, showZeroBalances: boolean): LedgerRow[] {
  const min = f.minAmount.trim() === "" ? null : Number(f.minAmount);
  const max = f.maxAmount.trim() === "" ? null : Number(f.maxAmount);
  const contactQ = f.contact.trim().toLowerCase();

  return rows.filter((r) => {
    if (r.date < f.dateFrom || r.date > f.dateTo) return false;
    if (f.accountCode && r.accountCode !== f.accountCode) return false;
    if (f.accountType !== "All" && r.accountType !== f.accountType) return false;
    if (f.currency !== "All" && r.currency !== f.currency) return false;
    if (f.status !== "All" && r.status !== f.status) return false;
    if (f.transactionType !== "All" && r.transactionType !== f.transactionType) return false;
    if (f.branch && r.branch !== f.branch) return false;
    if (contactQ && !r.contact.toLowerCase().includes(contactQ)) return false;
    const amt = lineAmount(r);
    if (min !== null && !Number.isNaN(min) && amt < min) return false;
    if (max !== null && !Number.isNaN(max) && amt > max) return false;
    if (!showZeroBalances && r.debit === 0 && r.credit === 0) return false;
    return true;
  });
}

function compareLedger(a: LedgerRow, b: LedgerRow, key: SortKey, dir: SortDir): number {
  const m = dir === "asc" ? 1 : -1;
  const cmpStr = (x: string, y: string) => m * x.localeCompare(y);
  const cmpNum = (x: number, y: number) => m * (x - y);

  switch (key) {
    case "date":
      return cmpStr(a.date, b.date) || cmpStr(a.journalNo, b.journalNo);
    case "journalNo":
      return cmpStr(a.journalNo, b.journalNo);
    case "transactionType":
      return cmpStr(a.transactionType, b.transactionType);
    case "account":
      return cmpStr(`${a.accountCode} ${a.accountName}`, `${b.accountCode} ${b.accountName}`);
    case "description":
      return cmpStr(a.description, b.description);
    case "reference":
      return cmpStr(a.reference, b.reference);
    case "debit":
      return cmpNum(a.debit, b.debit);
    case "credit":
      return cmpNum(a.credit, b.credit);
    case "runningBalance":
      return 0;
    default:
      return 0;
  }
}

function sortRows(rows: LedgerRow[], key: SortKey, dir: SortDir): LedgerRow[] {
  return [...rows].sort((a, b) => compareLedger(a, b, key, dir) || a.id.localeCompare(b.id));
}

function attachRunningBalance(rows: LedgerRow[], opening: number): LedgerRowView[] {
  let bal = opening;
  return rows.map((r) => {
    bal += r.debit - r.credit;
    return { ...r, runningBalance: bal };
  });
}

function processLedgerRows(
  rows: LedgerRow[],
  f: GlFilterState,
  showZeroBalances: boolean,
  sortKey: SortKey,
  sortDir: SortDir,
  opening: number,
): LedgerRowView[] {
  const base = filterRows(rows, f, showZeroBalances);
  if (sortKey === "runningBalance") {
    const chron = sortRows(base, "date", "asc");
    const withRb = attachRunningBalance(chron, opening);
    return [...withRb].sort(
      (a, b) =>
        (sortDir === "asc" ? a.runningBalance - b.runningBalance : b.runningBalance - a.runningBalance) ||
        a.date.localeCompare(b.date) ||
        a.journalNo.localeCompare(b.journalNo),
    );
  }
  const ordered = sortRows(base, sortKey, sortDir);
  return attachRunningBalance(ordered, opening);
}

function groupKey(r: LedgerRow, mode: GroupByMode): string {
  if (mode === "account") return `${r.accountCode}  ${r.accountName}`;
  if (mode === "date") return r.date;
  return r.transactionType;
}

export function GeneralLedgerPage() {
  const { pushToast } = useAppNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourceRows, setSourceRows] = useState<LedgerRow[]>([]);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [drawerJournal, setDrawerJournal] = useState<JournalDetailDto | null>(null);
  const [drawerJournalLoading, setDrawerJournalLoading] = useState(false);

  const [draftFilters, setDraftFilters] = useState<GlFilterState>(initialGlFilters);
  const [appliedFilters, setAppliedFilters] = useState<GlFilterState>(initialGlFilters);

  useEffect(() => {
    const { from, to } = periodFromSearchParams(searchParams);
    setDraftFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
    setAppliedFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, [searchParams]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const settings = await getGlSettings();
      const fc = (settings.functional_currency || "USD").toUpperCase();
      const currency: "PKR" | "USD" = fc === "PKR" ? "PKR" : "USD";
      const statusFilter =
        appliedFilters.status === "Posted" ? "posted" : appliedFilters.status === "Draft" ? "draft" : null;
      const page = await fetchGeneralLedgerLines({
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        status: statusFilter,
        limit: 2000,
        offset: 0,
      });
      setSourceRows(page.lines.map((ln) => mapGlLineToRow(ln, currency)));
    } catch (e) {
      setLedgerError(e instanceof Error ? e.message : "Could not load general ledger");
      setSourceRows([]);
    } finally {
      setLedgerLoading(false);
    }
  }, [appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.status]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const accountOptions = useMemo(() => {
    const m = new Map<string, { code: string; name: string }>();
    for (const r of sourceRows) {
      if (!m.has(r.accountCode)) m.set(r.accountCode, { code: r.accountCode, name: r.accountName });
    }
    return [...m.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [sourceRows]);

  const branchOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of sourceRows) {
      if (r.branch && r.branch !== "") s.add(r.branch);
    }
    return [...s].sort();
  }, [sourceRows]);

  const [settings, setSettings] = useState<GlSettings>(DEFAULT_GL_SETTINGS);
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_GL_SETTINGS.defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_GL_SETTINGS.defaultSortDir);
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnId, boolean>>(DEFAULT_VISIBLE);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [groupBy, setGroupBy] = useState<GroupByMode>("none");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [drawerRow, setDrawerRow] = useState<LedgerRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!drawerRow?.journalEntryId) {
      setDrawerJournal(null);
      return;
    }
    let cancelled = false;
    setDrawerJournalLoading(true);
    void getJournalEntry(drawerRow.journalEntryId)
      .then((j) => {
        if (!cancelled) setDrawerJournal(j);
      })
      .catch(() => {
        if (!cancelled) setDrawerJournal(null);
      })
      .finally(() => {
        if (!cancelled) setDrawerJournalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drawerRow?.journalEntryId]);

  const displayCurrency: "PKR" | "USD" =
    appliedFilters.currency === "USD" ? "USD" : appliedFilters.currency === "PKR" ? "PKR" : "PKR";

  const processedRows = useMemo(
    () => processLedgerRows(sourceRows, appliedFilters, settings.showZeroBalances, sortKey, sortDir, OPENING_BALANCE),
    [sourceRows, appliedFilters, settings.showZeroBalances, sortKey, sortDir],
  );

  const totals = useMemo(() => {
    let td = 0;
    let tc = 0;
    for (const r of processedRows) {
      if (appliedFilters.currency !== "All" && r.currency !== appliedFilters.currency) continue;
      td += r.debit;
      tc += r.credit;
    }
    const net = td - tc;
    return {
      totalDebit: td,
      totalCredit: tc,
      closing: OPENING_BALANCE + net,
    };
  }, [processedRows, appliedFilters.currency]);

  const handleSort = useCallback((key: SortKey) => {
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

  const toggleColumn = useCallback((id: ColumnId) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const visibleCount = (Object.keys(next) as ColumnId[]).filter((k) => next[k]).length;
      if (visibleCount === 0) return prev;
      return next;
    });
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }, [draftFilters]);

  const resetFilters = useCallback(() => {
    const next = initialGlFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
  }, []);

  const saveView = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_VIEW, JSON.stringify(draftFilters));
      pushToast("Saved view stored in this browser.", "success");
    } catch {
      pushToast("Could not save view (storage unavailable).", "error");
    }
  }, [draftFilters, pushToast]);

  const loadView = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_VIEW);
      if (!raw) {
        pushToast("No saved view found.", "info");
        return;
      }
      const parsed = JSON.parse(raw) as GlFilterState;
      setDraftFilters({ ...initialGlFilters(), ...parsed });
      setAppliedFilters({ ...initialGlFilters(), ...parsed });
      setPage(1);
      pushToast("Loaded saved view.", "success");
    } catch {
      pushToast("Could not load saved view.", "error");
    }
  }, [pushToast]);

  const saveDefaultFilters = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_DEFAULT_FILTERS, JSON.stringify(draftFilters));
      pushToast("Current filters saved as default for this browser.", "success");
    } catch {
      pushToast("Could not save defaults.", "error");
    }
  }, [draftFilters, pushToast]);

  const applyDefaultFilters = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DEFAULT_FILTERS);
      if (!raw) {
        pushToast("No default filters saved yet.", "info");
        return;
      }
      const parsed = JSON.parse(raw) as GlFilterState;
      setDraftFilters({ ...initialGlFilters(), ...parsed });
      setAppliedFilters({ ...initialGlFilters(), ...parsed });
      setPage(1);
      pushToast("Applied default filters.", "success");
    } catch {
      pushToast("Could not load default filters.", "error");
    }
  }, [pushToast]);

  const closeSettings = useCallback(() => {
    setSortKey(settings.defaultSortKey);
    setSortDir(settings.defaultSortDir);
    setSettingsOpen(false);
  }, [settings.defaultSortKey, settings.defaultSortDir]);

  const expandAll = useCallback(() => {
    if (groupBy === "none") return;
    const start = (page - 1) * pageSize;
    const slice = processedRows.slice(start, start + pageSize);
    const keys = new Set<string>();
    for (const r of slice) keys.add(groupKey(r, groupBy));
    setExpandedGroups(keys);
  }, [groupBy, page, pageSize, processedRows]);

  const collapseAll = useCallback(() => setExpandedGroups(new Set()), []);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-[var(--gs-border)]/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--gs-text)] sm:text-3xl md:text-4xl">General Ledger</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--gs-muted)] md:text-base">
            Account activity with running balance and drill-down
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => pushToast("Demo: export general ledger as PDF", "info")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Export PDF"
            title="Export PDF"
          >
            <FileDown className="h-4 w-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => pushToast("Demo: export as Excel", "info")}
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
              void loadLedger();
              setPage(1);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${ledgerLoading ? "animate-spin" : ""}`} aria-hidden />
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

      {ledgerError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          {ledgerError}
        </p>
      ) : null}

      <FilterPanel
        value={draftFilters}
        onChange={setDraftFilters}
        accountOptions={accountOptions}
        branchOptions={branchOptions}
        onApply={applyFilters}
        onReset={resetFilters}
        onSaveView={saveView}
        onLoadView={loadView}
      />

      <SummaryCards
        opening={OPENING_BALANCE}
        totalDebit={totals.totalDebit}
        totalCredit={totals.totalCredit}
        closing={totals.closing}
        currency={displayCurrency}
        compact={settings.compactView}
      />

      {appliedFilters.currency === "All" ? (
        <p className="text-xs text-[var(--gs-muted)]">
          Totals include all currencies shown as a single column (demo). Filter by PKR or USD for a single-currency view.
        </p>
      ) : null}

      <LedgerTableToolbar
        groupBy={groupBy}
        onGroupByChange={(g) => {
          setGroupBy(g);
          setPage(1);
          setExpandedGroups(new Set());
        }}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onNewJournal={() => router.push("/accounting?tab=journal_list")}
        onDownload={() => {
          const st =
            appliedFilters.status === "Posted" ? "posted" : appliedFilters.status === "Draft" ? "draft" : null;
          void downloadGeneralLedgerCsv({
            dateFrom: appliedFilters.dateFrom,
            dateTo: appliedFilters.dateTo,
            status: st,
          }).catch((e) => pushToast(e instanceof Error ? e.message : "Export failed", "error"));
        }}
        onEmail={() => pushToast("Demo: email ledger report", "info")}
      />

      <LedgerTable
        rows={processedRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        showRunningBalance={settings.showRunningBalance}
        compact={settings.compactView}
        onRowClick={setDrawerRow}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        groupBy={groupBy}
        expandedGroups={expandedGroups}
        onToggleGroup={toggleGroup}
      />

      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>

      <LedgerDrawer
        open={!!drawerRow}
        row={drawerRow}
        journalDetail={drawerJournal}
        journalLoading={drawerJournalLoading}
        onClose={() => setDrawerRow(null)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={closeSettings}
        settings={settings}
        onChange={setSettings}
        onSaveDefaultFilters={saveDefaultFilters}
        onApplyDefaultFilters={applyDefaultFilters}
      />
    </div>
  );
}