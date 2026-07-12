"use client";

import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";

import { ReportModalShell } from "@/components/reports/ReportModalShell";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { formatMoney } from "@/lib/format";

import type { TbDisplayRow, TbMiniLine } from "./types";

type Props = {
  open: boolean;
  row: TbDisplayRow | null;
  openingBalance: number;
  lines: TbMiniLine[];
  loading?: boolean;
  onClose: () => void;
  onActivityRowClick?: (journalEntryId: string) => void;
};

export function AccountDrawer({
  open,
  row,
  openingBalance,
  lines,
  loading = false,
  onClose,
  onActivityRowClick,
}: Props) {
  const { pushToast } = useAppNotifications();
  if (!open || !row) return null;

  const cur: "PKR" | "USD" = row.currency === "USD" ? "USD" : "PKR";

  return (
    <ReportModalShell
      open={open}
      title="Account drill-down"
      subtitle={`${row.code} · ${row.name} · ${row.type} · ${row.branch} · ${row.currency}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/reports/general-ledger"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] sm:flex-none"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View full ledger
          </Link>
          <button
            type="button"
            onClick={() => pushToast(`Demo: export account ${row.code} to Excel / PDF`, "info")}
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
      }
    >
      <section className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Opening balance</h3>
        <p className="mt-2 font-mono text-xl font-bold text-[var(--gs-text)]">{formatMoney(openingBalance, cur)}</p>
        <p className="mt-1 text-xs text-[var(--gs-muted)]">Posted activity through as-of (opening not rolled forward).</p>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account ledger (posted)</h3>
        {loading ? (
          <p className="mt-3 text-sm text-[var(--gs-muted)]">Loading activity…</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-xl border border-[var(--gs-border)]">
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
                {lines.map((l) => {
                  const net = l.debit - l.credit;
                  return (
                    <tr
                      key={l.id}
                      onClick={() => onActivityRowClick?.(l.journalEntryId)}
                      className={onActivityRowClick ? "cursor-pointer hover:bg-[var(--gs-accent-soft)]/40" : ""}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-[var(--gs-text)]">{l.date}</td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-[var(--gs-text)]">{l.ref}</div>
                        <div className="text-xs text-[var(--gs-muted)]">{l.memo}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{l.debit > 0 ? formatMoney(l.debit, cur) : ""}</td>
                      <td className="px-3 py-2 text-right font-mono text-rose-800 dark:text-rose-200">
                        {l.credit > 0 ? formatMoney(l.credit, cur) : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{formatMoney(net, cur)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {onActivityRowClick ? <p className="mt-2 text-xs text-[var(--gs-muted)]">Click a row to open the journal entry.</p> : null}
      </section>

      <section className="mt-6 rounded-xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-card)] p-3 text-xs text-[var(--gs-muted)]">
        TB line balance:{" "}
        <span className="font-mono font-semibold text-[var(--gs-text)]">
          {row.debit > 0 ? `${formatMoney(row.debit, cur)} DR` : `${formatMoney(row.credit, cur)} CR`}
        </span>
      </section>
    </ReportModalShell>
  );
}
