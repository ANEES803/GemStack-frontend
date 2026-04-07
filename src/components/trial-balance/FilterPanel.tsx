"use client";

import { Filter, RotateCcw, Save, Upload } from "lucide-react";

import type { AccountTypeTB } from "./types";

export type TbFilterState = {
  asOfDate: string;
  useDateRange: boolean;
  dateFrom: string;
  dateTo: string;
  accountFrom: string;
  accountTo: string;
  accountType: AccountTypeTB | "All";
  branch: string;
  currency: "All" | "PKR" | "USD";
  includeZeroBalances: boolean;
  includeUnposted: boolean;
  useComparison: boolean;
  comparisonPeriodLabel: string;
};

type Props = {
  value: TbFilterState;
  onChange: (next: TbFilterState) => void;
  branchOptions: string[];
  onApply: () => void;
  onReset: () => void;
  onSaveView: () => void;
  onLoadView: () => void;
};

export const DEFAULT_TB_FILTERS: TbFilterState = {
  asOfDate: "2026-03-31",
  useDateRange: false,
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
  accountFrom: "",
  accountTo: "",
  accountType: "All",
  branch: "",
  currency: "All",
  includeZeroBalances: false,
  includeUnposted: false,
  useComparison: false,
  comparisonPeriodLabel: "Feb 2026 (prior month-end)",
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
  function patch<K extends keyof TbFilterState>(k: K, v: TbFilterState[K]) {
    onChange({ ...f, [k]: v });
  }

  return (
    <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Filter className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[var(--gs-navy)]">Filters</h2>
          <p className="text-xs text-[var(--gs-muted)]">Scope the trial balance before export or review</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">As of date</label>
          <input
            type="date"
            value={f.asOfDate}
            onChange={(e) => patch("asOfDate", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="flex flex-col justify-end gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 sm:col-span-2 lg:col-span-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={f.useDateRange}
              onChange={(e) => patch("useDateRange", e.target.checked)}
              className="rounded border-slate-300"
            />
            Optional date range (activity window)
          </label>
          {f.useDateRange ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">From</span>
                <input
                  type="date"
                  value={f.dateFrom}
                  onChange={(e) => patch("dateFrom", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">To</span>
                <input
                  type="date"
                  value={f.dateTo}
                  onChange={(e) => patch("dateTo", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Account from</label>
          <input
            value={f.accountFrom}
            onChange={(e) => patch("accountFrom", e.target.value)}
            placeholder="e.g. 1000"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Account to</label>
          <input
            value={f.accountTo}
            onChange={(e) => patch("accountTo", e.target.value)}
            placeholder="e.g. 5999"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Account type</label>
          <select
            value={f.accountType}
            onChange={(e) => patch("accountType", e.target.value as TbFilterState["accountType"])}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="All">All types</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expense</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Branch / location</label>
          <select
            value={f.branch}
            onChange={(e) => patch("branch", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
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
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Currency</label>
          <select
            value={f.currency}
            onChange={(e) => patch("currency", e.target.value as TbFilterState["currency"])}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="All">All</option>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Include</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={f.includeZeroBalances}
              onChange={(e) => patch("includeZeroBalances", e.target.checked)}
              className="rounded border-slate-300"
            />
            Zero-balance accounts
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={f.includeUnposted}
              onChange={(e) => patch("includeUnposted", e.target.checked)}
              className="rounded border-slate-300"
            />
            Unposted entries (draft)
          </label>
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 sm:col-span-2 xl:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[var(--gs-navy)]">
            <input
              type="checkbox"
              checked={f.useComparison}
              onChange={(e) => patch("useComparison", e.target.checked)}
              className="rounded border-slate-300"
            />
            Comparison period (optional)
          </label>
          {f.useComparison ? (
            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase text-slate-500">Label (audit trail)</label>
              <input
                value={f.comparisonPeriodLabel}
                onChange={(e) => patch("comparisonPeriodLabel", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
              <p className="mt-2 text-xs text-[var(--gs-muted)]">Shows prior-period debit/credit columns from demo data (no backend).</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
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
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset
        </button>
        <button
          type="button"
          onClick={onSaveView}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          Save view
        </button>
        <button
          type="button"
          onClick={onLoadView}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Load view
        </button>
      </div>
    </div>
  );
}
