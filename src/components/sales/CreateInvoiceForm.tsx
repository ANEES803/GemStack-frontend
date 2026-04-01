"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { appendDemoInvoice, rowFromInvoicePayload } from "@/lib/demoInvoices";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

function parseMoney(v: string): number {
  const n = Number(v.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function CreateInvoiceForm() {
  const router = useRouter();
  const todayIso = useHydratedTodayIso();

  const [invoiceNo, setInvoiceNo] = useState("INV-NEW");
  const [parcelNo, setParcelNo] = useState("");
  const [fbInvoiceLink, setFbInvoiceLink] = useState("");
  const [dateIso, setDateIso] = useState("");
  const [customer, setCustomer] = useState("");
  const [holder, setHolder] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"Paid" | "Pending">("Pending");

  useEffect(() => {
    if (todayIso) setDateIso((d) => d || todayIso);
  }, [todayIso]);

  function onSave() {
    if (!invoiceNo.trim()) return window.alert("Invoice # is required.");
    if (!parcelNo.trim()) return window.alert("Parcel No. is required.");
    if (!dateIso) return window.alert("Date is required.");
    if (!customer.trim()) return window.alert("Customer is required.");
    if (!holder.trim()) return window.alert("Holder is required.");
    if (parseMoney(amount) <= 0) return window.alert("Amount must be greater than 0.");

    const payload = {
      invoiceNo: invoiceNo.trim(),
      parcelNo: parcelNo.trim(),
      fbInvoiceLink: fbInvoiceLink.trim() || undefined,
      dateIso,
      customer: customer.trim(),
      holder: holder.trim(),
      paymentMethod,
      amount: parseMoney(amount),
      status,
    };

    console.log("[CreateInvoice] demo save", payload);
    appendDemoInvoice(rowFromInvoicePayload(payload));
    router.push("/sales");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gs-accent)] transition hover:text-[var(--gs-accent-hover)]"
        >
          ← Back to invoices
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--gs-navy)] md:text-3xl">Create invoice</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--gs-muted)]">
          Frontend demo form. Save currently logs payload and returns to the invoice list.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_28px_rgba(15,23,42,0.05)] md:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500"># Invoice *</label>
            <input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Parcel No. *</label>
            <input
              value={parcelNo}
              onChange={(e) => setParcelNo(e.target.value)}
              placeholder="P-228"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">FB Invoice Link</label>
            <input
              value={fbInvoiceLink}
              onChange={(e) => setFbInvoiceLink(e.target.value)}
              placeholder="https://facebook.com/invoice/..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date *</label>
            <input
              type="date"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Customer *</label>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">FEP / Holder *</label>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            >
              <option>Bank</option>
              <option>Cash</option>
              <option>PayPal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Amount *</label>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "Paid" | "Pending")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <Link
            href="/sales"
            className="inline-flex justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex justify-center rounded-full bg-[var(--gs-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Save invoice
          </button>
        </div>
      </div>
    </div>
  );
}

