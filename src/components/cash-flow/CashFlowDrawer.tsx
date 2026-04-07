"use client";

import { X } from "lucide-react";

import { formatMoney } from "@/lib/format";

import type { CfTx } from "./types";

type Props = {
  open: boolean;
  lineLabel: string | null;
  transactions: CfTx[];
  onClose: () => void;
};

export function CashFlowDrawer({ open, lineLabel, transactions, onClose }: Props) {
  if (!open || !lineLabel) return null;

  return (
    <div className="fixed inset-0 z-[190] flex justify-end bg-slate-900/40">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Cash flow detail</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--gs-navy)]">{lineLabel}</h2>
            <p className="mt-0.5 text-xs text-[var(--gs-muted)]">Related cash transactions (demo)</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="overflow-hidden rounded-xl border border-slate-200">
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
                      <div className="font-mono text-xs text-slate-800">{t.ref}</div>
                      <div className="text-xs text-slate-500">{t.memo}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900">{formatMoney(t.amount, "PKR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
