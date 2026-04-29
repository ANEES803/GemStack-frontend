"use client";

import { FileText, Pencil, Paperclip, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";

import { ReportModalShell } from "@/components/reports/ReportModalShell";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { formatMoney } from "@/lib/format";
import type { JournalDetailDto } from "@/lib/glApi";

import type { JournalLine, LedgerRow } from "./types";

type Props = {
  open: boolean;
  row: LedgerRow | null;
  journalDetail: JournalDetailDto | null;
  journalLoading: boolean;
  onClose: () => void;
};

function mapJournalLines(je: JournalDetailDto): JournalLine[] {
  return je.lines.map((ln) => ({
    id: ln.id,
    account: `${ln.account_code} ${ln.account_name}`.trim(),
    debit: Number.parseFloat(String(ln.debit)) || 0,
    credit: Number.parseFloat(String(ln.credit)) || 0,
    memo: ln.description || "",
  }));
}

export function LedgerDrawer({ open, row, journalDetail, journalLoading, onClose }: Props) {
  const { pushToast } = useAppNotifications();
  if (!open || !row) return null;

  const cur: "PKR" | "USD" = row.currency === "USD" ? "USD" : "PKR";
  const lines: JournalLine[] = journalDetail ? mapJournalLines(journalDetail) : [];
  const notes = journalDetail?.memo?.trim() || row.description || "—";
  const attachments: { id: string; name: string; size: string }[] = [];

  return (
    <ReportModalShell
      open={open}
      title={row.journalNo}
      subtitle={`${row.date} · ${row.transactionType} · ${row.status}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => pushToast("Demo: edit journal entry", "info")}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:flex-none"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            onClick={() => pushToast("Demo: delete line (soft delete in production)", "info")}
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
            View journal entry
          </Link>
        </div>
      }
    >
      <section className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Summary</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--gs-muted)]">Account</dt>
            <dd className="text-right font-medium text-[var(--gs-text)]">
              {row.accountCode} {row.accountName}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--gs-muted)]">Reference</dt>
            <dd className="font-mono text-[var(--gs-text)]">{row.reference}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--gs-muted)]">Debit / Credit</dt>
            <dd className="text-right font-mono text-sm">
              <span className="text-[var(--gs-text)]">{formatMoney(row.debit, cur)}</span>
              {" / "}
              <span className="text-rose-800">{formatMoney(row.credit, cur)}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--gs-muted)]">Description</dt>
            <dd className="max-w-[60%] text-right text-[var(--gs-text)]">{row.description}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Journal lines
        </h3>
        {journalLoading ? (
          <p className="mt-3 text-sm text-[var(--gs-muted)]">Loading journal…</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-xl border border-[var(--gs-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--gs-text)]">{l.account}</div>
                      <div className="text-xs text-[var(--gs-muted)]">{l.memo}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{l.debit > 0 ? formatMoney(l.debit, cur) : ""}</td>
                    <td className="px-3 py-2 text-right font-mono text-rose-800">{l.credit > 0 ? formatMoney(l.credit, cur) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
          Attachments
        </h3>
        <ul className="mt-2 space-y-2">
          {attachments.length === 0 ? (
            <li className="text-xs text-[var(--gs-muted)]">No attachments on this journal.</li>
          ) : (
            attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm shadow-sm"
              >
                <span className="truncate font-medium text-[var(--gs-text)]">{a.name}</span>
                <span className="shrink-0 text-xs text-[var(--gs-muted)]">{a.size}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
          <StickyNote className="h-3.5 w-3.5" aria-hidden />
          Notes
        </h3>
        <p className="mt-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-3 text-sm text-[var(--gs-text)]">{notes}</p>
      </section>
    </ReportModalShell>
  );
}
