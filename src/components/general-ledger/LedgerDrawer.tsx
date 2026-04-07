"use client";

import { FileText, Pencil, Paperclip, StickyNote, Trash2, X } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/lib/format";

import type { LedgerDrawerData } from "./types";

type Props = {
  open: boolean;
  data: LedgerDrawerData | null;
  onClose: () => void;
};

export function LedgerDrawer({ open, data, onClose }: Props) {
  if (!open || !data) return null;

  const { row, lines, attachments, notes } = data;
  const cur: "PKR" | "USD" = row.currency === "USD" ? "USD" : "PKR";

  return (
    <div className="fixed inset-0 z-[190] flex justify-end bg-slate-900/40">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Transaction</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--gs-navy)]">{row.journalNo}</h2>
            <p className="mt-0.5 text-sm text-[var(--gs-muted)]">
              {row.date} · {row.transactionType} · {row.status}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Summary</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Account</dt>
                <dd className="text-right font-medium text-slate-900">
                  {row.accountCode} — {row.accountName}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-mono text-slate-800">{row.reference}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Debit / Credit</dt>
                <dd className="text-right font-mono text-sm">
                  <span className="text-emerald-800">{formatMoney(row.debit, cur)}</span>
                  {" / "}
                  <span className="text-rose-800">{formatMoney(row.credit, cur)}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Description</dt>
                <dd className="max-w-[60%] text-right text-slate-800">{row.description}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Journal lines
            </h3>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{l.account}</div>
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

          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              Attachments
            </h3>
            <ul className="mt-2 space-y-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <span className="truncate font-medium text-slate-800">{a.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{a.size}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <StickyNote className="h-3.5 w-3.5" aria-hidden />
              Notes
            </h3>
            <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700">{notes}</p>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => window.alert("Demo: edit journal entry")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 sm:flex-none"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            onClick={() => window.alert("Demo: delete line (soft delete in production)")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100 sm:flex-none"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </button>
          <Link
            href="/accounting?tab=journal_list"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] sm:flex-none"
          >
            <FileText className="h-4 w-4" aria-hidden />
            View source document
          </Link>
        </div>
      </aside>
    </div>
  );
}
