"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type ExpenseRow = {
  id: string;
  dateIso: string;
  category: string;
  amount: number;
  method: string;
  description: string;
};

const INITIAL: ExpenseRow[] = [
  { id: "e1", dateIso: "2026-03-28", category: "Rent", amount: 45000, method: "Bank", description: "Office rent March" },
  { id: "e2", dateIso: "2026-03-26", category: "Utilities", amount: 8200, method: "Cash", description: "Electricity" },
  { id: "e3", dateIso: "2026-03-22", category: "Marketing", amount: 15000, method: "Bank", description: "Facebook ads" },
];

const CATEGORIES = ["Rent", "Utilities", "Marketing", "Travel", "Professional fees", "Other"];

export default function ExpensesPage() {
  const todayIso = useHydratedTodayIso();
  const [rows, setRows] = useState<ExpenseRow[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    dateIso: "",
    category: "Rent",
    amount: "",
    method: "Bank",
    description: "",
  });

  useEffect(() => {
    if (todayIso) setForm((f) => ({ ...f, dateIso: f.dateIso || todayIso }));
  }, [todayIso]);

  const totalMtd = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

  function saveExpense() {
    const amt = Number(form.amount);
    if (!form.dateIso || !Number.isFinite(amt) || amt <= 0) {
      window.alert("Enter a valid date and amount.");
      return;
    }
    setRows((prev) => [
      {
        id: `e-${Date.now()}`,
        dateIso: form.dateIso,
        category: form.category,
        amount: amt,
        method: form.method,
        description: form.description.trim() || "—",
      },
      ...prev,
    ]);
    setForm({
      dateIso: todayIso || form.dateIso,
      category: form.category,
      amount: "",
      method: form.method,
      description: "",
    });
    setOpen(false);
    window.alert("Demo: Dr expense · Cr Cash/Bank. Connect API for live posting.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--gs-muted)]">
          SRS: record expenses with category and method; immediate Dr expense / Cr cash or bank.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/accounting"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Accounting setup
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Record expense
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total (demo list)</p>
          <p className="mt-2 text-2xl font-bold text-[var(--gs-navy)]">{formatMoney(totalMtd, "PKR")}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Recent expenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 text-slate-700">{r.dateIso}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{r.category}</td>
                  <td className="px-5 py-3 text-slate-600">{r.description}</td>
                  <td className="px-5 py-3 text-slate-600">{r.method}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatMoney(r.amount, "PKR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 pt-6 sm:items-center sm:p-4 sm:py-8">
          <div className="w-full max-w-lg max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--gs-navy)]">Record expense</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date *</label>
                <input
                  type="date"
                  value={form.dateIso}
                  onChange={(e) => setForm((f) => ({ ...f, dateIso: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Amount * (PKR)</label>
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Payment method *</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option>Cash</option>
                  <option>Bank</option>
                  <option>PayPal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button type="button" onClick={saveExpense} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
