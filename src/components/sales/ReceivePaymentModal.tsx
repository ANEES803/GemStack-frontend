"use client";

import { useEffect, useState } from "react";

import { AppDialog } from "@/components/ui/AppDialog";

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

  function submit() {
    window.alert(
      `Demo: Record payment\nMethod: ${method}\nInvoice: ${invoiceId || "—"}\nCustomer: ${customerName || "—"}\nAmount: ${amount || "—"}\nConnect API to post.`,
    );
    onClose();
  }

  const fieldLabel = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500";
  const inputClass =
    "w-full min-h-[42px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20";

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      titleId="receive-payment-title"
      title={title}
      description="Choose how the customer paid and confirm details."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="w-full rounded-lg bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
          >
            Record payment
          </button>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        <fieldset className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 shadow-sm sm:p-3.5">
          <legend className="sr-only">Payment method</legend>
          <p id="receive-payment-method-label" className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Payment method *
          </p>
          <div
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2"
            role="radiogroup"
            aria-labelledby="receive-payment-method-label"
          >
            {PAYMENT_OPTIONS.map((opt) => {
              const selected = method === opt;
              return (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 shadow-sm transition sm:px-2.5 sm:py-2 ${
                    selected
                      ? "border-[var(--gs-accent)] bg-white ring-1 ring-[var(--gs-accent)]/30"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="receive-payment-method"
                    value={opt}
                    checked={selected}
                    onChange={() => setMethod(opt)}
                    className="h-3.5 w-3.5 shrink-0 border-slate-300 text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]"
                  />
                  <span
                    className={`min-w-0 flex-1 text-left text-[11px] font-semibold leading-snug sm:text-xs ${
                      selected ? "text-[var(--gs-navy)]" : "text-slate-600"
                    }`}
                  >
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Invoice &amp; payer</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Invoice #</label>
              <input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} placeholder="INV-1041" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Customer name *</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={fieldLabel}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={fieldLabel}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Amount received</label>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Notes / detail</label>
              <textarea
                rows={2}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className={`${inputClass} min-h-[72px] resize-y py-2`}
              />
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
