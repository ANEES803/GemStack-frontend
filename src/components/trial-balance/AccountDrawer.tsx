"use client";

import { Download, ExternalLink, X } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/lib/format";

import type { TbDisplayRow, TbMiniLine } from "./types";

type Props = {
  open: boolean;
  row: TbDisplayRow | null;
  openingBalance: number;
  lines: TbMiniLine[];
  onClose: () => void;
};

export function AccountDrawer({ open, row, openingBalance, lines, onClose }: Props) {
  if (!open || !row) return null;

  const cur: "PKR" | "USD" = row.currency === "USD" ? "USD" : "PKR";

  return (
    <div className="fixed inset-0 z-[190] flex justify-end bg-slate-900/40">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Account drill-down</p>
            <h2 className="mt-1 font-mono text-lg font-bold text-[var(--gs-navy)]">
              {row.code} — {row.name}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--gs-muted)]">
              {row.type} · {row.branch} · {row.currency}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Opening balance</h3>
            <p className="mt-2 font-mono text-xl font-bold text-slate-900">{formatMoney(openingBalance, cur)}</p>
            <p className="mt-1 text-xs text-slate-500">As of period start (demo).</p>
          </section>

          <section className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Account ledger (sample)</h3>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Ref</th>
                    <th className="px-3 py-2 text-right">Dr</th>
                    <th className="px-3 py-2 text-right">Cr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">{l.date}</td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-slate-800">{l.ref}</div>
                        <div className="text-xs text-slate-500">{l.memo}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-800">{l.debit > 0 ? formatMoney(l.debit, cur) : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-800">{l.credit > 0 ? formatMoney(l.credit, cur) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-[var(--gs-muted)]">
            TB line balance:{" "}
            <span className="font-mono font-semibold text-slate-800">
              {row.debit > 0 ? `${formatMoney(row.debit, cur)} DR` : `${formatMoney(row.credit, cur)} CR`}
            </span>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          <Link
            href={`/reports/general-ledger`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gs-navy)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:flex-none"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View full ledger
          </Link>
          <button
            type="button"
            onClick={() => window.alert(`Demo: export account ${row.code} to Excel / PDF`)}
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
