"use client";

import { Filter, RotateCcw, Save, Upload } from "lucide-react";

import type { AccountingMethod, ComparisonMode } from "./types";

export type PlFilterState = {
  dateFrom: string;
  dateTo: string;
  comparisonMode: ComparisonMode;
  branch: string;
  currency: "All" | "PKR" | "USD";
  accountingMethod: AccountingMethod;
  showPercentages: boolean;
  showZeroBalances: boolean;
};

type Props = {
  value: PlFilterState;
  onChange: (next: PlFilterState) => void;
  branchOptions: string[];
  onApply: () => void;
  onReset: () => void;
  onSaveView: () => void;
  onLoadView: () => void;
};

export const DEFAULT_PL_FILTERS: PlFilterState = {
  dateFrom: "2026-01-01",
  dateTo: "2026-03-31",
  comparisonMode: "previous_period",
  branch: "",
  currency: "All",
  accountingMethod: "Accrual",
  showPercentages: true,
  showZeroBalances: false,
};

export function FilterPanel({
  value: f,
  onChange,
  branchOptions,
  onApply,
  onReset,
  onSaveView,
  onLoadView,
}: Props) {
  function patch<K extends keyof PlFilterState>(k: K, v: PlFilterState[K]) {
    onChange({ ...f, [k]: v });
  }

  return (
    <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--gs-border)] pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gs-hover)] text-[var(--gs-muted)]">
          <Filter className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[var(--gs-text)]">Filters</h2>
          <p className="text-xs text-[var(--gs-muted)]">Period, comparison, and presentation</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">From</label>
          <input
            type="date"
            value={f.dateFrom}
            onChange={(e) => patch("dateFrom", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">To</label>
          <input
            type="date"
            value={f.dateTo}
            onChange={(e) => patch("dateTo", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Comparison period</label>
          <select
            value={f.comparisonMode}
            onChange={(e) => patch("comparisonMode", e.target.value as ComparisonMode)}
            className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="none">No comparison</option>
            <option value="previous_period">Previous period</option>
            <option value="previous_year">Previous year</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Branch / location</label>
          <select
            value={f.branch}
            onChange={(e) => patch("branch", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="">All branches</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Currency</label>
          <select
            value={f.currency}
            onChange={(e) => patch("currency", e.target.value as PlFilterState["currency"])}
            className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="All">All</option>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Accounting method</label>
          <select
            value={f.accountingMethod}
            onChange={(e) => patch("accountingMethod", e.target.value as AccountingMethod)}
            className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="Accrual">Accrual</option>
            <option value="Cash">Cash</option>
          </select>
        </div>
        <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Show</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--gs-text)]">
            <input
              type="checkbox"
              checked={f.showPercentages}
              onChange={(e) => patch("showPercentages", e.target.checked)}
              className="rounded border-[var(--gs-border-strong)]"
            />
            Percentages (% of revenue)
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--gs-text)]">
            <input
              type="checkbox"
              checked={f.showZeroBalances}
              onChange={(e) => patch("showZeroBalances", e.target.checked)}
              className="rounded border-[var(--gs-border-strong)]"
            />
            Zero-balance lines
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--gs-border)] pt-5">
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
        >
          Apply filters
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset
        </button>
        <button
          type="button"
          onClick={onSaveView}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
        >
          <Save className="h-4 w-4" aria-hidden />
          Save view
        </button>
        <button
          type="button"
          onClick={onLoadView}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Load view
        </button>
      </div>
    </div>
  );
}