"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { SettingsPanelHeader } from "@/components/settings/settingsUi";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { formatMoney } from "@/lib/format";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type FepRow = {
  id: string;
  name: string;
  commissionEarned: number;
  paid: number;
};

const INITIAL: FepRow[] = [
  { id: "f1", name: "A. Khan", commissionEarned: 12400, paid: 8000 },
  { id: "f2", name: "M. Ali", commissionEarned: 9800, paid: 9800 },
  { id: "f3", name: "S. Noor", commissionEarned: 15200, paid: 5000 },
];

/** FEP & commission tracking panel. */
export function SettingsFepPanel() {
  const { pushToast } = useAppNotifications();
  const todayIso = useHydratedTodayIso();
  const [rows, setRows] = useState<FepRow[]>(INITIAL);
  const [payOpen, setPayOpen] = useState<FepRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  useEffect(() => {
    if (todayIso) setPayDate((p) => p || todayIso);
  }, [todayIso]);

  const monthlyTotal = useMemo(() => rows.reduce((s, r) => s + r.commissionEarned, 0), [rows]);

  function balance(r: FepRow) {
    return r.commissionEarned - r.paid;
  }

  function submitPay() {
    if (!payOpen) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      pushToast("Enter a valid amount.", "error");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === payOpen.id ? { ...r, paid: r.paid + amt } : r)));
    setPayOpen(null);
    setPayAmount("");
    pushToast("Demo: Dr FEP Payable · Cr Cash. Connect API.", "info");
  }

  return (
    <>
      <SettingsPanelHeader
        title="FEP & commission"
        description={
          <>
            Commission 4% of COGS from sales; track earned vs paid. Sales flow:{" "}
            <Link href="/sales" className="font-semibold text-[var(--gs-accent)] hover:underline">
              Invoices
            </Link>
            .
          </>
        }
      />
      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Commission (demo)</p>
            <p className="mt-2 text-2xl font-bold text-[var(--gs-text)]">{formatMoney(monthlyTotal, "PKR")}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/35 sm:col-span-2">
            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">Rule</p>
            <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100/90">
              Commission = 4% × COGS per sale; payment clears FEP payable.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--gs-border)]">
          <div className="gs-table-scroll overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-5 py-3">FEP</th>
                  <th className="px-5 py-3 text-right">Earned</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--gs-hover)]/80">
                    <td className="px-5 py-3 font-medium text-[var(--gs-text)]">{r.name}</td>
                    <td className="px-5 py-3 text-right text-[var(--gs-text)]">{formatMoney(r.commissionEarned, "PKR")}</td>
                    <td className="px-5 py-3 text-right text-[var(--gs-text)]">{formatMoney(r.paid, "PKR")}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--gs-text)]">{formatMoney(balance(r), "PKR")}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPayOpen(r);
                            setPayAmount(String(Math.max(0, balance(r))));
                            setPayDate(new Date().toISOString().slice(0, 10));
                          }}
                          className="text-sm font-semibold text-[var(--gs-accent)] hover:underline"
                        >
                          Pay
                        </button>
                        <RowActionsMenu items={["View", "Payment history", "Disable payouts"]} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {payOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 pt-6 sm:items-center sm:p-4 sm:py-8">
          <div className="w-full max-w-md max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--gs-text)]">Pay commission</h3>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">{payOpen.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPayOpen(null)}
                className="rounded-full p-2 text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Date *</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Amount (PKR) *</label>
                <input
                  inputMode="decimal"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayOpen(null)}
                  className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)]"
                >
                  Cancel
                </button>
                <button type="button" onClick={submitPay} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
                  Record payment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
