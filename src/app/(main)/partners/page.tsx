"use client";

import { useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type PartnerRow = {
  id: string;
  name: string;
  profitRatioPct: number;
  capitalBalance: number;
};

const INITIAL_PARTNERS: PartnerRow[] = [
  { id: "p1", name: "Partner A", profitRatioPct: 50, capitalBalance: 1250000 },
  { id: "p2", name: "Partner B", profitRatioPct: 35, capitalBalance: 820000 },
  { id: "p3", name: "Partner C", profitRatioPct: 15, capitalBalance: 410000 },
];

type WithdrawalRow = {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  dateIso: string;
};

const INITIAL_W: WithdrawalRow[] = [
  { id: "w1", partnerId: "p1", partnerName: "Partner A", amount: 100000, dateIso: "2026-03-15" },
];

export default function PartnersPage() {
  const todayIso = useHydratedTodayIso();
  const [partners, setPartners] = useState<PartnerRow[]>(INITIAL_PARTNERS);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>(INITIAL_W);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawForm, setDrawForm] = useState({ partnerId: "p1", amount: "", dateIso: "" });

  useEffect(() => {
    if (todayIso) setDrawForm((f) => ({ ...f, dateIso: f.dateIso || todayIso }));
  }, [todayIso]);

  const profitToDistribute = 240000;
  const ratioTotals = useMemo(() => partners.reduce((s, p) => s + p.profitRatioPct, 0), [partners]);

  function addWithdrawal() {
    const amt = Number(drawForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      window.alert("Enter a valid amount.");
      return;
    }
    const p = partners.find((x) => x.id === drawForm.partnerId);
    if (!p) return;
    setWithdrawals((prev) => [
      {
        id: `w-${Date.now()}`,
        partnerId: p.id,
        partnerName: p.name,
        amount: amt,
        dateIso: drawForm.dateIso,
      },
      ...prev,
    ]);
    setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, capitalBalance: x.capitalBalance - amt } : x)));
    setDrawOpen(false);
    setDrawForm({ partnerId: drawForm.partnerId, amount: "", dateIso: todayIso || drawForm.dateIso });
    window.alert("Demo: Dr Capital · Cr Cash. Connect API.");
  }

  function runProfitDistribution() {
    if (Math.abs(ratioTotals - 100) > 0.01) {
      window.alert("Profit ratios should sum to 100%.");
      return;
    }
    setPartners((prev) =>
      prev.map((p) => ({
        ...p,
        capitalBalance: p.capitalBalance + (profitToDistribute * p.profitRatioPct) / 100,
      })),
    );
    window.alert("Demo: Dr profit summary · Cr partner capital. Connect API.");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <p className="text-sm leading-relaxed text-[var(--gs-muted)]">
        SRS §4.8 / §13: capital per partner, drawings, profit split by ratio.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Partners</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Profit ratio</th>
                  <th className="px-4 py-3 text-right">Capital balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{p.profitRatioPct}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--gs-navy)]">{formatMoney(p.capitalBalance, "PKR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Ratios sum: {ratioTotals}%</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 shadow-sm">
          <h3 className="font-bold text-emerald-900">Profit distribution</h3>
          <p className="mt-2 text-sm text-emerald-800/90">Demo net profit: {formatMoney(profitToDistribute, "PKR")}</p>
          <ul className="mt-3 space-y-1 text-sm text-emerald-900">
            {partners.map((p) => (
              <li key={p.id}>
                {p.name}: <strong>{formatMoney((profitToDistribute * p.profitRatioPct) / 100, "PKR")}</strong>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={runProfitDistribution}
            className="mt-4 w-full rounded-full bg-[var(--gs-navy)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Post distribution (demo)
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Withdrawals</h2>
          <button
            type="button"
            onClick={() => setDrawOpen(true)}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Record withdrawal
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Partner</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className="px-5 py-3 text-slate-700">{w.dateIso}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{w.partnerName}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatMoney(w.amount, "PKR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 pt-6 sm:items-center sm:p-4 sm:py-8">
          <div className="w-full max-w-md max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--gs-navy)]">Record withdrawal</h3>
              <button
                type="button"
                onClick={() => setDrawOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Partner *</label>
                <select
                  value={drawForm.partnerId}
                  onChange={(e) => setDrawForm((f) => ({ ...f, partnerId: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date *</label>
                <input
                  type="date"
                  value={drawForm.dateIso}
                  onChange={(e) => setDrawForm((f) => ({ ...f, dateIso: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Amount (PKR) *</label>
                <input
                  inputMode="decimal"
                  value={drawForm.amount}
                  onChange={(e) => setDrawForm((f) => ({ ...f, amount: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDrawOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={addWithdrawal} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
