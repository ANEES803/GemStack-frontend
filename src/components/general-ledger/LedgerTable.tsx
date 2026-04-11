"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Columns3,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { formatMoney } from "@/lib/format";

import type { ColumnId, GroupByMode, LedgerRow, SortDir, SortKey } from "./types";
import { COLUMN_LABELS } from "./types";

export type LedgerRowView = LedgerRow & { runningBalance: number };

type Props = {
  rows: LedgerRowView[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  visibleColumns: Record<ColumnId, boolean>;
  onToggleColumn: (id: ColumnId) => void;
  showRunningBalance: boolean;
  compact: boolean;
  onRowClick: (row: LedgerRow) => void;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  groupBy: GroupByMode;
  expandedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
};

function sortIndicator(active: boolean, dir: SortDir) {
  if (!active) return <span className="inline-block w-4" />;
  return dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

export function LedgerTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  visibleColumns,
  onToggleColumn,
  showRunningBalance,
  compact,
  onRowClick,
  page,
  pageSize,
  onPageChange,
  groupBy,
  expandedGroups,
  onToggleGroup,
}: Props) {
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colBtnRef = useRef<HTMLButtonElement>(null);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const m = new Map<string, LedgerRowView[]>();
    for (const r of pageRows) {
      const key = groupBy === "account" ? `${r.accountCode}  ${r.accountName}` : groupBy === "date" ? r.date : r.transactionType;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [groupBy, pageRows]);

  const cell = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const th = compact ? "px-2 py-2" : "px-3 py-3";

  function renderRow(r: LedgerRowView, idx: number) {
    const cur: "PKR" | "USD" = r.currency === "USD" ? "USD" : "PKR";
    return (
      <tr
        key={r.id}
        onClick={() => onRowClick(r)}
        className={`cursor-pointer border-b border-[var(--gs-border)] transition-colors hover:bg-[var(--gs-accent-soft)]/60 ${idx % 2 === 1 ? "bg-[var(--gs-hover)]/70" : "bg-[var(--gs-card)]"}`}
      >
        {visibleColumns.date && <td className={`${cell} whitespace-nowrap text-[var(--gs-text)]`}>{r.date}</td>}
        {visibleColumns.journalNo && (
          <td className={`${cell} font-mono text-sm font-semibold text-[var(--gs-text)]`}>{r.journalNo}</td>
        )}
        {visibleColumns.transactionType && (
          <td className={`${cell}`}>
            <span className="rounded-full bg-[var(--gs-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]/80">
              {r.transactionType}
            </span>
          </td>
        )}
        {visibleColumns.account && (
          <td className={`${cell}`}>
            <span className="font-mono text-xs text-[var(--gs-muted)]">{r.accountCode}</span>
            <div className="text-sm font-medium text-[var(--gs-text)]">{r.accountName}</div>
          </td>
        )}
        {visibleColumns.description && <td className={`${cell} max-w-[220px] truncate text-[var(--gs-text)]`}>{r.description}</td>}
        {visibleColumns.reference && <td className={`${cell} font-mono text-xs text-[var(--gs-muted)]`}>{r.reference}</td>}
        {visibleColumns.debit && (
          <td className={`${cell} text-right font-mono text-sm text-[var(--gs-text)]`}>{r.debit > 0 ? formatMoney(r.debit, cur) : ""}</td>
        )}
        {visibleColumns.credit && (
          <td className={`${cell} text-right font-mono text-sm text-rose-800`}>{r.credit > 0 ? formatMoney(r.credit, cur) : ""}</td>
        )}
        {showRunningBalance && visibleColumns.runningBalance && (
          <td className={`${cell} text-right font-mono text-sm font-semibold text-[var(--gs-text)]`}>{formatMoney(r.runningBalance, cur)}</td>
        )}
      </tr>
    );
  }

  function headerCell(id: SortKey, label: string) {
    if (id === "runningBalance" && !showRunningBalance) return null;
    if (!visibleColumns[id as ColumnId]) return null;
    const active = sortKey === id;
    return (
      <th className={`${th} text-left`}>
        <button
          type="button"
          onClick={() => onSort(id)}
          className="inline-flex items-center gap-1 font-bold text-[var(--gs-muted)] hover:text-[var(--gs-text)]"
        >
          {label}
          {sortIndicator(active, sortDir)}
        </button>
      </th>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative">
          <button
            ref={colBtnRef}
            type="button"
            onClick={() => setColMenuOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <Columns3 className="h-4 w-4" aria-hidden />
            Columns
            <ChevronDown className="h-4 w-4 opacity-60" aria-hidden />
          </button>
          {colMenuOpen ? (
            <>
              <button type="button" className="fixed inset-0 z-10 cursor-default" aria-label="Close menu" onClick={() => setColMenuOpen(false)} />
              <div className="absolute left-0 z-20 mt-2 min-w-[220px] rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-2 shadow-xl ring-1 ring-[var(--gs-border)]">
                {(Object.keys(COLUMN_LABELS) as ColumnId[])
                  .filter((c) => c !== "runningBalance" || showRunningBalance)
                  .map((id) => (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--gs-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[id]}
                        onChange={() => onToggleColumn(id)}
                        className="rounded border-[var(--gs-border-strong)]"
                      />
                      {COLUMN_LABELS[id]}
                    </label>
                  ))}
              </div>
            </>
          ) : null}
        </div>
        <p className="text-xs text-[var(--gs-muted)]">
          {rows.length} line{rows.length !== 1 ? "s" : ""} · Page {page} of {totalPages}
        </p>
      </div>

      <div className="max-h-[min(560px,65vh)] overflow-auto">
        {groupBy !== "none" && grouped ? (
          <div className="divide-y divide-[var(--gs-border)]">
            {grouped.map(([gKey, gRows]) => {
              const open = expandedGroups.has(gKey);
              return (
                <div key={gKey}>
                  <button
                    type="button"
                    onClick={() => onToggleGroup(gKey)}
                    className="flex w-full items-center gap-2 bg-[var(--gs-hover)]/90 px-4 py-2.5 text-left text-sm font-bold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]/90"
                  >
                    {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    {gKey}
                    <span className="ml-auto text-xs font-semibold text-[var(--gs-muted)]">{gRows.length}</span>
                  </button>
                  {open ? (
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="sticky top-0 z-[1] border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)] shadow-sm">
                        <tr>
                          {headerCell("date", COLUMN_LABELS.date)}
                          {headerCell("journalNo", COLUMN_LABELS.journalNo)}
                          {headerCell("transactionType", COLUMN_LABELS.transactionType)}
                          {headerCell("account", COLUMN_LABELS.account)}
                          {headerCell("description", COLUMN_LABELS.description)}
                          {headerCell("reference", COLUMN_LABELS.reference)}
                          {headerCell("debit", COLUMN_LABELS.debit)}
                          {headerCell("credit", COLUMN_LABELS.credit)}
                          {showRunningBalance && visibleColumns.runningBalance ? (
                            <th className={`${th} text-left`}>
                              <button
                                type="button"
                                onClick={() => onSort("runningBalance")}
                                className="inline-flex items-center gap-1 font-bold text-[var(--gs-muted)] hover:text-[var(--gs-text)]"
                              >
                                {COLUMN_LABELS.runningBalance}
                                {sortIndicator(sortKey === "runningBalance", sortDir)}
                              </button>
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>{gRows.map((r, i) => renderRow(r, i))}</tbody>
                    </table>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)] shadow-sm">
              <tr>
                {headerCell("date", COLUMN_LABELS.date)}
                {headerCell("journalNo", COLUMN_LABELS.journalNo)}
                {headerCell("transactionType", COLUMN_LABELS.transactionType)}
                {headerCell("account", COLUMN_LABELS.account)}
                {headerCell("description", COLUMN_LABELS.description)}
                {headerCell("reference", COLUMN_LABELS.reference)}
                {headerCell("debit", COLUMN_LABELS.debit)}
                {headerCell("credit", COLUMN_LABELS.credit)}
                {showRunningBalance && visibleColumns.runningBalance ? (
                  <th className={`${th} text-left`}>
                    <button
                      type="button"
                      onClick={() => onSort("runningBalance")}
                      className="inline-flex items-center gap-1 font-bold text-[var(--gs-muted)] hover:text-[var(--gs-text)]"
                    >
                      {COLUMN_LABELS.runningBalance}
                      {sortIndicator(sortKey === "runningBalance", sortDir)}
                    </button>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>{pageRows.map((r, i) => renderRow(r, i))}</tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--gs-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-sm font-semibold text-[var(--gs-text)] disabled:opacity-40 hover:bg-[var(--gs-hover)]"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-sm font-semibold text-[var(--gs-text)] disabled:opacity-40 hover:bg-[var(--gs-hover)]"
          >
            Next
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--gs-muted)]">
          <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
          Sort: {COLUMN_LABELS[sortKey]} ({sortDir})
        </div>
      </div>
    </div>
  );
}

export function LedgerTableToolbar({
  groupBy,
  onGroupByChange,
  onExpandAll,
  onCollapseAll,
  onNewJournal,
  onDownload,
  onEmail,
}: {
  groupBy: GroupByMode;
  onGroupByChange: (g: GroupByMode) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onNewJournal: () => void;
  onDownload: () => void;
  onEmail: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onNewJournal}
          className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
        >
          New journal entry
        </button>
        <div className="flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-1 shadow-sm">
          <span className="pl-2 text-xs font-bold uppercase text-[var(--gs-muted)]">Group</span>
          <select
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as GroupByMode)}
            className="rounded-lg border-0 bg-transparent py-1 pr-2 text-sm font-semibold text-[var(--gs-text)] outline-none"
          >
            <option value="none">None</option>
            <option value="account">Account</option>
            <option value="date">Date</option>
            <option value="type">Type</option>
          </select>
        </div>
        <button
          type="button"
          onClick={onExpandAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
        >
          <ChevronsDownUp className="h-4 w-4" aria-hidden />
          Expand all
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
        >
          <ChevronsUpDown className="h-4 w-4" aria-hidden />
          Collapse all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
        >
          Download ledger
        </button>
        <button
          type="button"
          onClick={onEmail}
          className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
        >
          Email report
        </button>
      </div>
    </div>
  );
}