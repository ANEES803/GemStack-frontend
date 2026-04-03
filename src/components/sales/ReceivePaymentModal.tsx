"use client";

import { useEffect, useState } from "react";

export const PAYMENT_OPTIONS = ["Bank transfer", "Cash", "PayPal", "Credit / debit card", "Wire (SWIFT)", "Other"] as const;

export type ReceivePaymentInitial = {
  invoiceId?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  detail?: string;
  amount?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: ReceivePaymentInitial;
  title?: string;
};

export function ReceivePaymentModal({ open, onClose, initial, title = "Receive payment" }: Props) {
  const [invoiceId, setInvoiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_OPTIONS)[number]>("Bank transfer");

  useEffect(() => {
    if (!open) return;
    setInvoiceId(initial?.invoiceId ?? "");
    setCustomerName(initial?.customerName ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setDetail(initial?.detail ?? "");
    setAmount(initial?.amount ?? "");
    setMethod("Bank transfer");
  }, [open, initial]);

  if (!open) return null;

  function submit() {
    window.alert(
      `Demo: Record payment\nMethod: ${method}\nInvoice: ${invoiceId || "—"}\nCustomer: ${customerName || "—"}\nAmount: ${amount || "—"}\nConnect API to post.`,
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 pt-8 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--gs-navy)]">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">Choose how the customer paid and confirm details.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment method *</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMethod(opt)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${
                    method === opt
                      ? "border-[var(--gs-accent)] bg-[var(--gs-accent-soft)] text-[var(--gs-navy)] ring-2 ring-[var(--gs-accent)]/30"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Invoice #</label>
              <input
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="INV-1041"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer name *</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Amount received</label>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes / detail</label>
              <textarea
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
          >
            Record payment
          </button>
        </div>
      </div>
    </div>
  );
}
