"use client";

import { BarChart3, Download, ExternalLink } from "lucide-react";
import Link from "next/link";

import { ReportModalShell } from "@/components/reports/ReportModalShell";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
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
  const { pushToast } = useAppNotifications();
  if (!open || !line) return null;

  const bdTotal = breakdown.reduce((s, b) => s + b.amount, 0);

  return (
    <ReportModalShell
      open={open}
      title="P&L line detail"
      subtitle={line.label}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/reports/general-ledger"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] sm:flex-none"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View ledger
          </Link>
          <button
            type="button"
            onClick={() => pushToast(`Demo: export ${line.label}`, "info")}
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
      <p className="mb-4 font-mono text-sm text-[var(--gs-text)]">{formatPlAmount(line.current, displayCurrency, rounding)}</p>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account breakdown</h3>
        <ul className="mt-2 space-y-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-3">
          {breakdown.map((b) => (
            <li key={b.id} className="flex justify-between gap-2 text-sm">
              <span className="text-[var(--gs-text)]">{b.name}</span>
              <span className="shrink-0 font-mono font-semibold text-[var(--gs-text)]">{formatPlAmount(b.amount, displayCurrency, rounding)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-[var(--gs-border)] pt-2 text-sm font-bold text-[var(--gs-text)]">
            <span>Subtotal</span>
            <span className="font-mono">{formatPlAmount(bdTotal || line.current, displayCurrency, rounding)}</span>
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Transactions (sample)</h3>
        <div className="mt-2 overflow-hidden rounded-xl border border-[var(--gs-border)]">
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
                    <div className="font-mono text-xs">{t.ref}</div>
                    <div className="text-xs text-[var(--gs-muted)]">{t.memo}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--gs-text)]">{formatPlAmount(t.amount, displayCurrency, rounding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          Monthly trend (placeholder)
        </h3>
        <div className="mt-3 flex h-28 items-end gap-1.5 rounded-xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-3 pb-2 pt-4">
          {["Jan", "Feb", "Mar"].map((m, i) => {
            const h = 35 + i * 18 + (line.id.length % 5) * 8;
            return (
              <div key={m} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[36px] rounded-t-md bg-[var(--gs-accent)]/80"
                  style={{ height: `${Math.min(h, 100)}%` }}
                />
                <span className="text-[10px] font-semibold text-[var(--gs-muted)]">{m}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--gs-muted)]">Chart connects when analytics API is available.</p>
      </section>
    </ReportModalShell>
  );
}
