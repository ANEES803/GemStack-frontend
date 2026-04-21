"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { ReportModalShell } from "./ReportModalShell";
import { resolveGlSourceLink } from "./glSourceLink";
import { formatMoney } from "@/lib/format";
import type { JournalDetailDto } from "@/lib/glApi";

type Props = {
  open: boolean;
  journal: JournalDetailDto | null;
  loading: boolean;
  currency: "PKR" | "USD";
  onClose: () => void;
};

/**
 * Read-only journal lines for drill-down from reports and general ledger.
 */
export function JournalEntryReadOnlyModal({ open, journal, loading, currency, onClose }: Props) {
  if (!open) return null;

  const src = journal ? resolveGlSourceLink(journal.source_type, journal.source_id) : null;

  return (
    <ReportModalShell
      zIndexClass="z-[200]"
      open={open}
      title={journal ? journal.reference || "Journal entry" : "Journal entry"}
      subtitle={
        journal
          ? `${journal.entry_date} · ${journal.status}${journal.tag ? ` · ${journal.tag}` : ""}`
          : loading
            ? "Loading…"
            : null
      }
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/accounting?tab=journal_list"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:flex-none"
          >
            <FileText className="h-4 w-4 shrink-0" aria-hidden />
            Accounting workspace
          </Link>
          {src ? (
            <Link
              href={src.href}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] sm:flex-none"
            >
              {src.label}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:flex-none"
          >
            Close
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--gs-muted)]">Loading journal…</p>
      ) : journal ? (
        <>
          <p className="mb-4 text-sm text-[var(--gs-text)]">{journal.memo?.trim() || "—"}</p>
          <div className="overflow-hidden rounded-xl border border-[var(--gs-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {journal.lines.map((ln) => {
                  const dr = Number.parseFloat(ln.debit) || 0;
                  const cr = Number.parseFloat(ln.credit) || 0;
                  return (
                    <tr key={ln.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--gs-text)]">
                          {ln.account_code} {ln.account_name}
                        </div>
                        {ln.description ? <div className="text-xs text-[var(--gs-muted)]">{ln.description}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{dr > 0 ? formatMoney(dr, currency) : "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-800 dark:text-rose-200">
                        {cr > 0 ? formatMoney(cr, currency) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--gs-muted)]">Could not load this journal.</p>
      )}
    </ReportModalShell>
  );
}
