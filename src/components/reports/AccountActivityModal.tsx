"use client";

import { ReportModalShell } from "./ReportModalShell";
import { formatMoney } from "@/lib/format";

export type AccountActivityRow = {
  lineId: string;
  journalEntryId: string;
  entryDate: string;
  reference: string;
  memo: string;
  debit: number;
  credit: number;
};

type Props = {
  open: boolean;
  accountTitle: string | null;
  rows: AccountActivityRow[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  currency: "PKR" | "USD";
  onClose: () => void;
  onRowClick: (row: AccountActivityRow) => void;
  onLoadMore: () => void;
};

/**
 * Posted lines for one GL account (debit/credit) with optional pagination.
 */
export function AccountActivityModal({
  open,
  accountTitle,
  rows,
  loading,
  loadingMore,
  hasMore,
  currency,
  onClose,
  onRowClick,
  onLoadMore,
}: Props) {
  if (!open || !accountTitle) return null;

  return (
    <ReportModalShell
      open={open}
      title="Account activity"
      subtitle={`${accountTitle} · posted journal lines`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          {hasMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={onLoadMore}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] disabled:opacity-50 sm:flex-none"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] sm:flex-none"
          >
            Close
          </button>
        </div>
      }
    >
      {loading && rows.length === 0 ? (
        <p className="text-sm text-[var(--gs-muted)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--gs-muted)]">No posted activity for this account in range.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--gs-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Ref</th>
                <th className="px-3 py-2 text-right">Debit</th>
                <th className="px-3 py-2 text-right">Credit</th>
                <th className="px-3 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
              {rows.map((r) => {
                const net = r.debit - r.credit;
                return (
                  <tr
                    key={r.lineId}
                    onClick={() => onRowClick(r)}
                    className="cursor-pointer hover:bg-[var(--gs-accent-soft)]/40"
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-[var(--gs-text)]">{r.entryDate}</td>
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs text-[var(--gs-text)]">{r.reference}</div>
                      <div className="text-xs text-[var(--gs-muted)]">{r.memo}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">
                      {r.debit > 0 ? formatMoney(r.debit, currency) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-rose-800 dark:text-rose-200">
                      {r.credit > 0 ? formatMoney(r.credit, currency) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{formatMoney(net, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--gs-muted)]">Click a row to open the full journal entry.</p>
    </ReportModalShell>
  );
}
