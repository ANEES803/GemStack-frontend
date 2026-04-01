"use client";

import { useState } from "react";

const REPORTS = [
  { id: "pl", title: "Profit & loss", desc: "Revenue, COGS, expenses, net profit." },
  { id: "bs", title: "Balance sheet", desc: "Assets, liabilities, equity snapshot." },
  { id: "ledger", title: "Ledger", desc: "Account running balance." },
  { id: "inv", title: "Inventory", desc: "Parcel and FEP-wise (SRS §14.2)." },
  { id: "sales", title: "Sales (FEP-wise)", desc: "Channel and FEP attribution." },
  { id: "trial", title: "Trial balance", desc: "All accounts — debits vs credits." },
] as const;

export default function ReportsPage() {
  const [from, setFrom] = useState("2026-03-01");
  const [to, setTo] = useState("2026-03-31");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <p className="text-sm leading-relaxed text-[var(--gs-muted)]">
        SRS §14: date range filters and export to Excel/PDF when the API is connected.
      </p>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[var(--gs-navy)]">Report period</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">From *</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">To *</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          <button
            type="button"
            onClick={() => window.alert(`Demo: run reports for ${from} → ${to}`)}
            className="rounded-full bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Apply range
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-[var(--gs-navy)]">Available reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((r) => (
            <div
              key={r.id}
              className="flex flex-col rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <h3 className="font-bold text-[var(--gs-navy)]">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--gs-muted)]">{r.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.alert(`Demo: preview ${r.title}`)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => window.alert(`Demo: Excel export — ${r.title}`)}
                  className="rounded-full bg-[var(--gs-accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--gs-accent)] ring-1 ring-[var(--gs-accent)]/30 hover:bg-orange-100/80"
                >
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => window.alert(`Demo: PDF export — ${r.title}`)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
