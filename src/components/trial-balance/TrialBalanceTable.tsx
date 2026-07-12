"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns3,
  Download,
  Mail,
  Search,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";

import type { AccountTypeTB, SortDirTB, SortKeyTB, TbColumnId, TbDisplayRow } from "./types";
import { TB_COLUMN_LABELS } from "./types";

const TYPE_ORDER: AccountTypeTB[] = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

type Props = {
  rows: TbDisplayRow[];
  sortKey: SortKeyTB;
  sortDir: SortDirTB;
  onSort: (k: SortKeyTB) => void;
  visibleColumns: Record<TbColumnId, boolean>;
  onToggleColumn: (id: TbColumnId) => void;
  showComparison: boolean;
  comparisonLabel: string;
  compact: boolean;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onRowClick: (row: TbDisplayRow) => void;
  /** Full-report totals (not page slice). */
  footerTotals: { debit: number; credit: number; difference: number };
  displayCurrency: "PKR" | "USD";
  onDownload: () => void;
  onEmail: () => void;
};

function sortIndicator(active: boolean, dir: SortDirTB) {
  if (!active) return <span className="inline-block w-4" />;
  return dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

export function TrialBalanceTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  visibleColumns,
  onToggleColumn,
  showComparison,
  comparisonLabel,
  compact,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  footerTotals,
  displayCurrency,
  onDownload,
  onEmail,
}: Props) {
  const [search, setSearch] = useState("");
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountTypeTB>>(() => new Set(TYPE_ORDER));

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.code} ${r.name}`.toLowerCase().includes(q));
  }, [rows, search]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return searched.slice(start, start + pageSize);
  }, [searched, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(searched.length / pageSize));

  const labelColSpan = Math.max(
    1,
    (visibleColumns.code ? 1 : 0) + (visibleColumns.name ? 1 : 0) + (visibleColumns.type ? 1 : 0),
  );
  const moneyColCount =
    (visibleColumns.debit ? 1 : 0) +
    (visibleColumns.credit ? 1 : 0) +
    (showComparison && visibleColumns.priorDebit ? 1 : 0) +
    (showComparison && visibleColumns.priorCredit ? 1 : 0);
  const tableColCount = labelColSpan + moneyColCount;

  const grouped = useMemo(() => {
    const m = new Map<AccountTypeTB, TbDisplayRow[]>();
    for (const t of TYPE_ORDER) m.set(t, []);
    for (const r of pageRows) {
      m.get(r.type)?.push(r);
    }
    return TYPE_ORDER.map((t) => [t, m.get(t) ?? []] as const).filter(([, list]) => list.length > 0);
  }, [pageRows]);

  const cell = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const th = compact ? "px-2 py-2" : "px-3 py-3";

  const expandAll = () => setExpandedTypes(new Set(TYPE_ORDER));
  const collapseAll = () => setExpandedTypes(new Set());

  const toggleType = (t: AccountTypeTB) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  function headerButton(label: string, key: SortKeyTB, col: TbColumnId) {
    if (!visibleColumns[col]) return null;
    const active = sortKey === key;
    return (
      <th className={`${th} text-left`}>
        <button
          type="button"
          onClick={() => onSort(key)}
          className="inline-flex items-center gap-1 font-bold text-[var(--gs-muted)] hover:text-[var(--gs-text)]"
        >
          {label}
          {sortIndicator(active, sortDir)}
        </button>
      </th>
    );
  }

  function renderDataRow(r: TbDisplayRow, zebraIdx: number) {
    return (
      <tr
        key={r.id}
        onClick={() => onRowClick(r)}
        className={`cursor-pointer border-b border-[var(--gs-border)] transition-colors hover:bg-[var(--gs-hover)] ${zebraIdx % 2 === 1 ? "bg-[var(--gs-table-row-alt)]" : "bg-[var(--gs-table-row)]"}`}
      >
        {visibleColumns.code && <td className={`${cell} font-mono text-sm font-semibold text-[var(--gs-text)]`}>{r.code}</td>}
        {visibleColumns.name && <td className={`${cell} font-medium text-[var(--gs-text)]`}>{r.name}</td>}
        {visibleColumns.type && (
          <td className={`${cell}`}>
            <span className="rounded-full bg-[var(--gs-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]/80">
              {r.type}
            </span>
          </td>
        )}
        {visibleColumns.debit && (
          <td className={`${cell} text-right font-mono text-sm text-[var(--gs-text)]`}>{r.debit > 0 ? formatMoney(r.debit, displayCurrency) : ""}</td>
        )}
        {visibleColumns.credit && (
          <td className={`${cell} text-right font-mono text-sm text-rose-900 dark:text-rose-200`}>{r.credit > 0 ? formatMoney(r.credit, displayCurrency) : ""}</td>
        )}
        {showComparison && visibleColumns.priorDebit && (
          <td className={`${cell} text-right font-mono text-xs text-[var(--gs-muted)]`}>
            {r.priorDebit > 0 ? formatMoney(r.priorDebit, displayCurrency) : ""}
          </td>
        )}
        {showComparison && visibleColumns.priorCredit && (
          <td className={`${cell} text-right font-mono text-xs text-[var(--gs-muted)]`}>
            {r.priorCredit > 0 ? formatMoney(r.priorCredit, displayCurrency) : ""}
          </td>
        )}
      </tr>
    );
  }

  const diffBad = Math.abs(footerTotals.difference) >= 0.01;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <ChevronsDownUp className="h-4 w-4" aria-hidden />
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <ChevronsUpDown className="h-4 w-4" aria-hidden />
            Collapse all
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download report
          </button>
          <button
            type="button"
            onClick={onEmail}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Email report
          </button>
        </div>
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gs-muted)]" aria-hidden />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onPageChange(1);
            }}
            placeholder="Search account code or name..."
            className="w-full rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] py-2.5 pl-10 pr-4 text-sm outline-none ring-[var(--gs-border)] placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="relative">
            <button
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
                  {(Object.keys(TB_COLUMN_LABELS) as TbColumnId[])
                    .filter((c) => {
                      if (c === "priorDebit" || c === "priorCredit") return showComparison;
                      return true;
                    })
                    .map((id) => (
                      <label
                        key={id}
                        className={`flex items-center gap-2 px-4 py-2 text-sm ${id === "name" ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[var(--gs-hover)]"}`}
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[id]}
                          disabled={id === "name"}
                          onChange={() => onToggleColumn(id)}
                          className="rounded border-[var(--gs-border-strong)]"
                        />
                        {TB_COLUMN_LABELS[id]}
                        {id === "name" ? <span className="text-[10px] text-[var(--gs-muted)]">(required)</span> : null}
                      </label>
                    ))}
                </div>
              </>
            ) : null}
          </div>
          <p className="text-xs text-[var(--gs-muted)]">
            {searched.length} account{searched.length !== 1 ? "s" : ""} · Page {page} of {totalPages}
            {showComparison ? ` · ${comparisonLabel}` : ""}
          </p>
        </div>

        <div className="gs-table-scroll max-h-[min(520px,62vh)] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)] shadow-sm">
              <tr>
                {headerButton(TB_COLUMN_LABELS.code, "code", "code")}
                {headerButton(TB_COLUMN_LABELS.name, "name", "name")}
                {headerButton(TB_COLUMN_LABELS.type, "type", "type")}
                {headerButton(TB_COLUMN_LABELS.debit, "debit", "debit")}
                {headerButton(TB_COLUMN_LABELS.credit, "credit", "credit")}
                {showComparison && headerButton(TB_COLUMN_LABELS.priorDebit, "priorDebit", "priorDebit")}
                {showComparison && headerButton(TB_COLUMN_LABELS.priorCredit, "priorCredit", "priorCredit")}
              </tr>
            </thead>
            <tbody>
              {(() => {
                let zebra = 0;
                return grouped.map(([type, list]) => {
                  const open = expandedTypes.has(type);
                  return (
                    <Fragment key={type}>
                      <tr className="bg-[var(--gs-hover)]/90">
                        <td colSpan={tableColCount} className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleType(type)}
                            className="flex w-full items-center gap-2 text-left text-xs font-bold uppercase tracking-wide text-[var(--gs-text)]"
                          >
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {type}s
                            <span className="ml-auto font-mono text-[10px] font-semibold text-[var(--gs-muted)]">{list.length}</span>
                          </button>
                        </td>
                      </tr>
                      {open ? list.map((r) => renderDataRow(r, zebra++)) : null}
                    </Fragment>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--gs-border-strong)] bg-[var(--gs-hover)]/95 font-bold">
                <td colSpan={labelColSpan} className={`${cell} text-[var(--gs-text)]`}>
                  Report totals
                </td>
                {visibleColumns.debit && (
                  <td className={`${cell} text-right font-mono text-[var(--gs-text)]`}>{formatMoney(footerTotals.debit, displayCurrency)}</td>
                )}
                {visibleColumns.credit && (
                  <td className={`${cell} text-right font-mono text-rose-900 dark:text-rose-200`}>
                    {formatMoney(footerTotals.credit, displayCurrency)}
                  </td>
                )}
                {showComparison && visibleColumns.priorDebit && <td className={`${cell} text-right text-xs text-[var(--gs-muted)]`}></td>}
                {showComparison && visibleColumns.priorCredit && <td className={`${cell} text-right text-xs text-[var(--gs-muted)]`}></td>}
              </tr>
              <tr className={`border-t border-[var(--gs-border)] ${diffBad ? "bg-red-50/90 dark:bg-red-950/45" : "bg-[var(--gs-table-head)]"}`}>
                <td
                  colSpan={labelColSpan}
                  className={`${cell} text-sm ${diffBad ? "font-bold text-red-900 dark:text-red-100" : "font-medium text-[var(--gs-text)]"}`}
                >
                  Difference (debit → credit)
                </td>
                <td
                  colSpan={Math.max(1, moneyColCount)}
                  className={`${cell} text-right font-mono text-sm ${diffBad ? "font-bold text-red-800 dark:text-red-100" : "font-semibold text-[var(--gs-text)]"}`}
                >
                  {formatMoney(footerTotals.difference, displayCurrency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--gs-border)] p-4">
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
      </div>
    </div>
  );
}