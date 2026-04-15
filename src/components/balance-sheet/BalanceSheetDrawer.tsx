"use client";

import { X } from "lucide-react";

import { formatMoney } from "@/lib/format";

import type { BsTx } from "./types";

type Props = {
  open: boolean;
  accountLabel: string | null;
  transactions: BsTx[];
  onClose: () => void;
};

export function BalanceSheetDrawer({ open, accountLabel, transactions, onClose }: Props) {
  if (!open || !accountLabel) return null;

  return (
    <div className="fixed inset-0 z-[190] flex justify-end bg-black/45">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--gs-border)] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account activity</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--gs-text)]">{accountLabel}</h2>
            <p className="mt-0.5 text-xs text-[var(--gs-muted)]">Sample postings (demo)</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="overflow-hidden rounded-xl border border-[var(--gs-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Ref</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-[var(--gs-text)]">{t.date}</td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-[var(--gs-text)]">{t.ref}</div>
                      <div className="text-xs text-[var(--gs-muted)]">{t.memo}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{formatMoney(t.amount, "PKR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border-t border-[var(--gs-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-[var(--gs-border)] py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}