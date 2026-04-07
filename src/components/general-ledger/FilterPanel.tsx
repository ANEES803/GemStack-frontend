"use client";

import { Filter, RotateCcw, Save, Upload } from "lucide-react";

import type { AccountTypeFilter, TransactionType } from "./types";

export type GlFilterState = {
  dateFrom: string;
  dateTo: string;
  accountSearch: string;
  accountCode: string;
  accountType: AccountTypeFilter | "All";
  contact: string;
  branch: string;
  currency: "All" | "PKR" | "USD";
  status: "All" | "Posted" | "Draft";
  transactionType: "All" | TransactionType;
  minAmount: string;
  maxAmount: string;
};

type Props = {
  value: GlFilterState;
  onChange: (next: GlFilterState) => void;
  accountOptions: { code: string; name: string }[];
  branchOptions: string[];
  onApply: () => void;
  onReset: () => void;
  onSaveView: () => void;
  onLoadView: () => void;
};

export const DEFAULT_GL_FILTERS: GlFilterState = {
  dateFrom: "2026-03-01",
  dateTo: "2026-03-31",
  accountSearch: "",
  accountCode: "",
  accountType: "All",
  contact: "",
  branch: "",
  currency: "All",
  status: "All",
  transactionType: "All",
  minAmount: "",
  maxAmount: "",
};

export function FilterPanel({
  value: f,
  onChange,
  accountOptions,
  branchOptions,
  onApply,
  onReset,
  onSaveView,
  onLoadView,
}: Props) {
  const filteredAccounts = accountOptions.filter(
    (a) =>
      !f.accountSearch.trim() ||
      `${a.code} ${a.name}`.toLowerCase().includes(f.accountSearch.trim().toLowerCase()),
  );

  function patch<K extends keyof GlFilterState>(k: K, v: GlFilterState[K]) {
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
          <p className="text-xs text-[var(--gs-muted)]">Narrow ledger lines before export or print</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">From</label>
          <input
            type="date"
            value={f.dateFrom}
            onChange={(e) => patch("dateFrom", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">To</label>
          <input
            type="date"
            value={f.dateTo}
            onChange={(e) => patch("dateTo", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Account (search)</label>
          <input
            value={f.accountSearch}
            onChange={(e) => patch("accountSearch", e.target.value)}
            placeholder="Code or name…"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
          <select
            value={f.accountCode}
            onChange={(e) => patch("accountCode", e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="">All accounts</option>
            {filteredAccounts.slice(0, 40).map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Account type</label>
          <select
            value={f.accountType}
            onChange={(e) => patch("accountType", e.target.value as GlFilterState["accountType"])}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
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
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Contact / party</label>
          <input
            value={f.contact}
            onChange={(e) => patch("contact", e.target.value)}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Branch / location</label>
          <select
            value={f.branch}
            onChange={(e) => patch("branch", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
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
            onChange={(e) => patch("currency", e.target.value as GlFilterState["currency"])}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="All">All</option>
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</label>
          <select
            value={f.status}
            onChange={(e) => patch("status", e.target.value as GlFilterState["status"])}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="All">All</option>
            <option value="Posted">Posted</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Transaction type</label>
          <select
            value={f.transactionType}
            onChange={(e) => patch("transactionType", e.target.value as GlFilterState["transactionType"])}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          >
            <option value="All">All</option>
            <option value="Invoice">Invoice</option>
            <option value="Bill">Bill</option>
            <option value="Payment">Payment</option>
            <option value="Journal">Journal</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Min amount</label>
          <input
            inputMode="decimal"
            value={f.minAmount}
            onChange={(e) => patch("minAmount", e.target.value)}
            placeholder="0"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Max amount</label>
          <input
            inputMode="decimal"
            value={f.maxAmount}
            onChange={(e) => patch("maxAmount", e.target.value)}
            placeholder="No max"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-orange-100"
          />
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
          Load saved view
        </button>
      </div>
    </div>
  );
}
