"use client";

import { BarChart3, Download, ExternalLink, X } from "lucide-react";
import Link from "next/link";

import { formatPlAmount } from "./formatPl";

import type { PlBreakdownLine, PlLine, PlMiniTx, PlRounding } from "./types";

type Props = {
  open: boolean;
  line: PlLine | null;
  breakdown: PlBreakdownLine[];
  transactions: PlMiniTx[];
  displayCurrency: "PKR" | "USD";
  rounding: PlRounding;
  onClose: () => void;
};

export function AccountDrawer({ open, line, breakdown, transactions, displayCurrency, rounding, onClose }: Props) {
  if (!open || !line) return null;

  const bdTotal = breakdown.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="fixed inset-0 z-[190] flex justify-end bg-slate-900/40">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">P&amp;L line detail</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--gs-navy)]">{line.label}</h2>
            <p className="mt-0.5 font-mono text-sm text-slate-700">{formatPlAmount(line.current, displayCurrency, rounding)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Account breakdown</h3>
            <ul className="mt-2 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              {breakdown.map((b) => (
                <li key={b.id} className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-700">{b.name}</span>
                  <span className="shrink-0 font-mono font-semibold text-slate-900">{formatPlAmount(b.amount, displayCurrency, rounding)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-[var(--gs-navy)]">
                <span>Subtotal</span>
                <span className="font-mono">{formatPlAmount(bdTotal || line.current, displayCurrency, rounding)}</span>
              </li>
            </ul>
          </section>

          <section className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Transactions (sample)</h3>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Ref</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">{t.date}</td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs">{t.ref}</div>
                        <div className="text-xs text-slate-500">{t.memo}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-900">{formatPlAmount(t.amount, displayCurrency, rounding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              Monthly trend (placeholder)
            </h3>
            <div className="mt-3 flex h-28 items-end gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 pb-2 pt-4">
              {["Jan", "Feb", "Mar"].map((m, i) => {
                const h = 35 + i * 18 + (line.id.length % 5) * 8;
                return (
                  <div key={m} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full max-w-[36px] rounded-t-md bg-[var(--gs-accent)]/80"
                      style={{ height: `${Math.min(h, 100)}%` }}
                    />
                    <span className="text-[10px] font-semibold text-slate-500">{m}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[var(--gs-muted)]">Chart connects when analytics API is available.</p>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          <Link
            href="/reports/general-ledger"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gs-navy)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:flex-none"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View ledger
          </Link>
          <button
            type="button"
            onClick={() => window.alert(`Demo: export — ${line.label}`)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:flex-none"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export account
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
