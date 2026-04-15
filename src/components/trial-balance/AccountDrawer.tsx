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
    <div className="fixed inset-0 z-[190] flex justify-end bg-black/45">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--gs-border)] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account drill-down</p>
            <h2 className="mt-1 font-mono text-lg font-bold text-[var(--gs-text)]">
              {row.code}  {row.name}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--gs-muted)]">
              {row.type} · {row.branch} · {row.currency}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Opening balance</h3>
            <p className="mt-2 font-mono text-xl font-bold text-[var(--gs-text)]">{formatMoney(openingBalance, cur)}</p>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">As of period start (demo).</p>
          </section>

          <section className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account ledger (sample)</h3>
            <div className="mt-2 overflow-hidden rounded-xl border border-[var(--gs-border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Ref</th>
                    <th className="px-3 py-2 text-right">Dr</th>
                    <th className="px-3 py-2 text-right">Cr</th>
                  </tr>
                </thead>
                <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-[var(--gs-text)]">{l.date}</td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-[var(--gs-text)]">{l.ref}</div>
                        <div className="text-xs text-[var(--gs-muted)]">{l.memo}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{l.debit > 0 ? formatMoney(l.debit, cur) : ""}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-800 dark:text-rose-200">
                        {l.credit > 0 ? formatMoney(l.credit, cur) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-card)] p-3 text-xs text-[var(--gs-muted)]">
            TB line balance:{" "}
            <span className="font-mono font-semibold text-[var(--gs-text)]">
              {row.debit > 0 ? `${formatMoney(row.debit, cur)} DR` : `${formatMoney(row.credit, cur)} CR`}
            </span>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-[var(--gs-border)] px-5 py-4">
          <Link
            href={`/reports/general-ledger`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] sm:flex-none"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View full ledger
          </Link>
          <button
            type="button"
            onClick={() => window.alert(`Demo: export account ${row.code} to Excel / PDF`)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:flex-none"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export account
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:flex-none"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}