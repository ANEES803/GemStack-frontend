"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

const SUPPLIERS_SEED = ["Sapphire Co.", "Global Gems Ltd", "Ceylon Traders", "Antwerp BV"];

const PAYMENT_METHODS = ["Cash", "Bank", "PayPal", "Partner"] as const;

const PAID_FROM_ACCOUNTS = [
  "1000 · Operating cash",
  "1010 · Bank — primary",
  "1020 · PayPal clearing",
  "2000 · Partner capital",
];

function parseMoney(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function CreateLotForm() {
  const router = useRouter();
  const todayIso = useHydratedTodayIso();

  const [lotIdPreview, setLotIdPreview] = useState("LO-········");
  useEffect(() => {
    const t = Date.now().toString(36).toUpperCase();
    setLotIdPreview(`LO-${t.slice(-8)}`);
  }, []);

  const [receivedDate, setReceivedDate] = useState("");
  useEffect(() => {
    if (todayIso) setReceivedDate((d) => d || todayIso);
  }, [todayIso]);
  const [isThirdParty, setIsThirdParty] = useState(false);

  const [supplierChoice, setSupplierChoice] = useState<string>(SUPPLIERS_SEED[0] ?? "");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [useNewSupplier, setUseNewSupplier] = useState(false);

  const [thirdPartyName, setThirdPartyName] = useState("");
  const [thirdPartyNote, setThirdPartyNote] = useState("");

  const [totalWeightCt, setTotalWeightCt] = useState("");
  const [totalCost, setTotalCost] = useState("");

  const [shipping, setShipping] = useState("");
  const [dutyTax, setDutyTax] = useState("");
  const [otherCharges, setOtherCharges] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("Bank");
  const [paidFromAccount, setPaidFromAccount] = useState(PAID_FROM_ACCOUNTS[1] ?? PAID_FROM_ACCOUNTS[0]);

  const { totalCostNum, shippingNum, dutyNum, otherNum, weightNum, finalCost, costPerCt } = useMemo(() => {
    const w = parseMoney(totalWeightCt);
    const tc = parseMoney(totalCost);
    const sh = parseMoney(shipping);
    const du = parseMoney(dutyTax);
    const ot = parseMoney(otherCharges);
    const fc = tc + sh + du + ot;
    const cpc = w > 0 ? fc / w : 0;
    return {
      totalCostNum: tc,
      shippingNum: sh,
      dutyNum: du,
      otherNum: ot,
      weightNum: w,
      finalCost: fc,
      costPerCt: cpc,
    };
  }, [totalWeightCt, totalCost, shipping, dutyTax, otherCharges]);

  const supplierLabel = isThirdParty ? "Third party (stock owner)" : "Supplier";
  const resolvedSupplier = useNewSupplier ? newSupplierName.trim() : supplierChoice;

  function validate(): string | null {
    if (!receivedDate) return "Date is required.";
    if (isThirdParty) {
      if (!thirdPartyName.trim()) return "Third party name is required.";
      if (totalCostNum < 0) return "Total cost cannot be negative.";
    } else {
      if (!resolvedSupplier) return `${supplierLabel} is required.`;
      if (totalCostNum <= 0) return "Total cost must be greater than 0 for a standard purchase.";
    }
    if (weightNum <= 0) return "Total weight must be greater than 0.";
    return null;
  }

  function buildPayload() {
    return {
      lotIdPreview,
      receivedDate,
      isThirdParty,
      supplierOrThirdParty: isThirdParty ? thirdPartyName.trim() : resolvedSupplier,
      thirdPartyNote: isThirdParty ? thirdPartyNote.trim() : undefined,
      totalWeightCarats: weightNum,
      totalCost: totalCostNum,
      shipping: shippingNum,
      dutyTax: dutyNum,
      otherCharges: otherNum,
      finalCost,
      costPerCarat: costPerCt,
      paymentMethod,
      paidFromAccount,
    };
  }

  function onSave(goParcels: boolean) {
    const err = validate();
    if (err) {
      window.alert(err);
      return;
    }
    const payload = buildPayload();
    console.log("[CreateLot] demo save", payload);
    window.alert(
      goParcels
        ? "Demo: lot saved. Next step — create parcels (wire API later)."
        : "Demo: lot saved (frontend only). Check the console for the payload.",
    );
    if (goParcels) {
      router.push(`/parcels?fromLot=${encodeURIComponent(lotIdPreview)}`);
    } else {
      router.push("/lots");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/lots"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gs-accent)] transition hover:text-[var(--gs-accent-hover)]"
        >
          ← Back to lots
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--gs-navy)] md:text-3xl">Create lot</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--gs-muted)]">
          Frontend-only form aligned with your SRS. Intended for <strong>Admin</strong> and{" "}
          <strong>Accountant</strong> roles until auth is connected.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_28px_rgba(15,23,42,0.05)] md:p-8">
        <div className="space-y-8">
          {/* Lot ID + date */}
          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Lot ID</label>
              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-slate-700">
                {lotIdPreview}
              </p>
              <p className="mt-1 text-xs text-[var(--gs-muted)]">Auto-generated; not editable (per SRS).</p>
            </div>
            <div>
              <label htmlFor="lot-date" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="lot-date"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4"
                required
              />
            </div>
          </section>

          {/* Third-party mode */}
          <section className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 ring-1 ring-amber-100/60">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isThirdParty}
                onChange={(e) => setIsThirdParty(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]"
              />
              <span>
                <span className="font-semibold text-slate-900">Third-party stock</span>
                <span className="mt-1 block text-sm font-normal leading-relaxed text-[var(--gs-muted)]">
                  The goods are supplied by another party; you sell on their behalf and earn profit (e.g. consignment).
                  Cost can be $0 until you recognise payout or commission rules in the backend.
                </span>
              </span>
            </label>

            {isThirdParty ? (
              <div className="mt-4 space-y-4 border-t border-amber-200/60 pt-4">
                <div>
                  <label htmlFor="tp-name" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Third party name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="tp-name"
                    type="text"
                    value={thirdPartyName}
                    onChange={(e) => setThirdPartyName(e.target.value)}
                    placeholder="Company or person who owns the stock"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 placeholder:text-slate-400 focus:border-[var(--gs-accent)] focus:ring-4"
                  />
                </div>
                <div>
                  <label htmlFor="tp-note" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Notes (optional)
                  </label>
                  <textarea
                    id="tp-note"
                    value={thirdPartyNote}
                    onChange={(e) => setThirdPartyNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. settlement terms, expected margin, payout schedule…"
                    className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 placeholder:text-slate-400 focus:border-[var(--gs-accent)] focus:ring-4"
                  />
                </div>
              </div>
            ) : null}
          </section>

          {/* Supplier */}
          {!isThirdParty ? (
            <section>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                {supplierLabel} <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={!useNewSupplier}
                    onChange={() => setUseNewSupplier(false)}
                    className="text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]"
                  />
                  Choose existing
                </label>
                <select
                  value={supplierChoice}
                  onChange={(e) => setSupplierChoice(e.target.value)}
                  disabled={useNewSupplier}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4 disabled:opacity-50"
                >
                  {SUPPLIERS_SEED.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    checked={useNewSupplier}
                    onChange={() => setUseNewSupplier(true)}
                    className="text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]"
                  />
                  Add new supplier
                </label>
                {useNewSupplier ? (
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="New supplier name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 placeholder:text-slate-400 focus:border-[var(--gs-accent)] focus:ring-4"
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Weight & cost */}
          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="weight" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Total weight (carats) <span className="text-red-500">*</span>
              </label>
              <input
                id="weight"
                inputMode="decimal"
                value={totalWeightCt}
                onChange={(e) => setTotalWeightCt(e.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 placeholder:text-slate-400 focus:border-[var(--gs-accent)] focus:ring-4"
              />
            </div>
            <div>
              <label htmlFor="total-cost" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Total cost <span className="text-red-500">*</span>
                {isThirdParty ? (
                  <span className="ml-1 font-normal normal-case text-slate-400">(optional 0 for pure consignment)</span>
                ) : null}
              </label>
              <input
                id="total-cost"
                inputMode="decimal"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                placeholder="0.00"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 placeholder:text-slate-400 focus:border-[var(--gs-accent)] focus:ring-4"
              />
            </div>
          </section>

          {/* Additional costs */}
          <section>
            <h2 className="text-sm font-bold text-[var(--gs-navy)]">Additional costs</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="ship" className="block text-xs font-semibold text-slate-500">
                  Shipping
                </label>
                <input
                  id="ship"
                  inputMode="decimal"
                  value={shipping}
                  onChange={(e) => setShipping(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4"
                />
              </div>
              <div>
                <label htmlFor="duty" className="block text-xs font-semibold text-slate-500">
                  Duty / tax
                </label>
                <input
                  id="duty"
                  inputMode="decimal"
                  value={dutyTax}
                  onChange={(e) => setDutyTax(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4"
                />
              </div>
              <div>
                <label htmlFor="other" className="block text-xs font-semibold text-slate-500">
                  Other charges
                </label>
                <input
                  id="other"
                  inputMode="decimal"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(e.target.value)}
                  placeholder="0.00"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4"
                />
              </div>
            </div>
          </section>

          {/* Calculations */}
          <section className="rounded-2xl bg-[var(--gs-table-head)]/50 p-5 ring-1 ring-indigo-100/80">
            <h2 className="text-sm font-bold text-[var(--gs-navy)]">Calculations</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                <dt className="text-[var(--gs-muted)]">Final cost</dt>
                <dd className="font-semibold text-slate-900">{formatMoney(finalCost, "USD")}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-xl bg-white/80 px-4 py-3 ring-1 ring-slate-100">
                <dt className="text-[var(--gs-muted)]">Cost per carat</dt>
                <dd className="font-semibold text-slate-900">
                  {weightNum > 0 ? formatMoney(costPerCt, "USD") : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-[var(--gs-muted)]">Final cost = total cost + shipping + duty + other (per SRS).</p>
          </section>

          {/* Payment */}
          <section className={isThirdParty && finalCost === 0 ? "opacity-60" : ""}>
            <h2 className="text-sm font-bold text-[var(--gs-navy)]">Payment</h2>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">
              SRS: Cash, Bank, PayPal, or Partner — paid-from account posts Dr Inventory / Cr payment account on save.
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="pay-meth" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payment method
                </label>
                <select
                  id="pay-meth"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
                  disabled={isThirdParty && finalCost === 0}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4 disabled:cursor-not-allowed"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pay-from" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Paid from account
                </label>
                <select
                  id="pay-from"
                  value={paidFromAccount}
                  onChange={(e) => setPaidFromAccount(e.target.value)}
                  disabled={isThirdParty && finalCost === 0}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4 disabled:cursor-not-allowed"
                >
                  {PAID_FROM_ACCOUNTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {isThirdParty && finalCost === 0 ? (
              <p className="mt-3 text-xs font-medium text-amber-800">
                No payment line needed while final cost is $0 — your accountant can link settlement entries later.
              </p>
            ) : null}
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              href="/lots"
              className="inline-flex justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => onSave(false)}
              className="inline-flex justify-center rounded-full bg-[var(--gs-navy)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Save lot
            </button>
            <button
              type="button"
              onClick={() => onSave(true)}
              className="inline-flex justify-center rounded-full bg-[var(--gs-accent)] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition hover:bg-[var(--gs-accent-hover)]"
            >
              Save &amp; create parcels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
