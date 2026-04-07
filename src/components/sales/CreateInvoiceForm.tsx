"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddCustomerModal } from "@/components/sales/AddCustomerModal";
import { InvoicePrintDialog } from "@/components/sales/InvoicePrintDialog";
import { ReceivePaymentModal } from "@/components/sales/ReceivePaymentModal";
import { addCustomer, loadCustomers, type DemoCustomer } from "@/lib/demoCustomers";
import { appendDemoInvoice, rowFromInvoicePayload } from "@/lib/demoInvoices";
import { revenueAccountLabel } from "@/lib/demoRevenueAccounts";
import { loadServiceItemsForSelect } from "@/lib/itemCatalogStorage";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

function parseMoney(v: string): number {
  const n = Number(String(v).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

const ADD_NEW_VALUE = "__add_new__";

export function CreateInvoiceForm() {
  const router = useRouter();
  const todayIso = useHydratedTodayIso();

  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [customerPick, setCustomerPick] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const [invoiceNo, setInvoiceNo] = useState("INV-NEW");
  const [parcelNo, setParcelNo] = useState("");
  const [fbInvoiceLink, setFbInvoiceLink] = useState("");
  const [dateIso, setDateIso] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerDetail, setCustomerDetail] = useState("");
  const [holder, setHolder] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"Paid" | "Pending">("Pending");
  const [serviceCatalog, setServiceCatalog] = useState<ReturnType<typeof loadServiceItemsForSelect>>([]);
  const [invoiceServicePick, setInvoiceServicePick] = useState("");

  useEffect(() => {
    setCustomers(loadCustomers());
  }, []);

  useEffect(() => {
    setServiceCatalog(loadServiceItemsForSelect());
  }, []);

  useEffect(() => {
    if (todayIso) setDateIso((d) => d || todayIso);
  }, [todayIso]);

  const receiveInitial = useMemo(
    () => ({
      invoiceId: invoiceNo.trim() || undefined,
      customerName: customer.trim() || undefined,
      email: customerEmail.trim() || undefined,
      phone: customerPhone.trim() || undefined,
      detail: customerDetail.trim() || undefined,
      amount: amount.trim() || undefined,
    }),
    [invoiceNo, customer, customerEmail, customerPhone, customerDetail, amount],
  );

  const invoicePdfData = useMemo(
    () => ({
      invoiceNo: invoiceNo.trim() || "DRAFT",
      dateIso: dateIso || "—",
      customer: customer.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      customerDetail: customerDetail.trim(),
      holder: holder.trim(),
      paymentMethod,
      amountDisplay: (() => {
        const t = amount.trim();
        if (!t) return "$0.00";
        return t.includes("$") ? t : `$${t}`;
      })(),
      status,
      parcelNo: parcelNo.trim(),
      fbInvoiceLink: fbInvoiceLink.trim(),
    }),
    [
      invoiceNo,
      dateIso,
      customer,
      customerEmail,
      customerPhone,
      customerDetail,
      holder,
      paymentMethod,
      amount,
      status,
      parcelNo,
      fbInvoiceLink,
    ],
  );

  function applyCustomer(c: DemoCustomer) {
    setCustomer(c.name);
    setCustomerEmail(c.email);
    setCustomerPhone(c.phone);
    setCustomerDetail(c.detail);
  }

  function onCustomerSelect(value: string) {
    if (value === ADD_NEW_VALUE) {
      setAddCustomerOpen(true);
      setCustomerPick("");
      return;
    }
    setCustomerPick(value);
    const c = customers.find((x) => x.id === value);
    if (c) applyCustomer(c);
  }

  function onNewCustomerSaved(payload: Omit<DemoCustomer, "id">) {
    const created = addCustomer(payload);
    setCustomers(loadCustomers());
    setCustomerPick(created.id);
    applyCustomer(created);
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gs-accent)] transition hover:text-[var(--gs-accent-hover)]"
          >
            ← Back to invoices
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--gs-navy)] md:text-3xl">Create invoice</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--gs-muted)]">
            Select an existing customer or add a new one. Receive payment opens the same payment flow used on the invoice list.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.72 13.829v-.75a.75.75 0 011.5 0v.75m0 0V18a.75.75 0 01-.75.75H4.5a.75.75 0 01-.75-.75v-4.171m9 0V18A.75.75 0 0113.5 19.5h-3a.75.75 0 01-.75-.75v-4.171M3 11.25h18M3.75 4.5h16.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75v-4.5a.75.75 0 01.75-.75z"
              />
            </svg>
            Print invoice
          </button>
          <button
            type="button"
            onClick={() => setReceiveOpen(true)}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Receive payment
          </button>
        </div>
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

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Customer *</label>
            <select
              value={customerPick}
              onChange={(e) => onCustomerSelect(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={ADD_NEW_VALUE}>+ Add new customer…</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-500">Choosing a customer fills the fields below. You can edit them anytime.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Customer name *</label>
            <input
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setCustomerPick("");
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
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
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Customer detail / notes</label>
            <textarea
              rows={2}
              value={customerDetail}
              onChange={(e) => setCustomerDetail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
            />
          </div>

          {serviceCatalog.length > 0 ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Service item (from catalog — optional)
              </label>
              <select
                value={invoiceServicePick}
                onChange={(e) => {
                  const id = e.target.value;
                  setInvoiceServicePick(id);
                  const s = serviceCatalog.find((x) => x.id === id);
                  if (s) setAmount(String(s.rate));
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-4"
              >
                <option value="">— None —</option>
                {serviceCatalog.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.itemName} · {s.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ·{" "}
                    {revenueAccountLabel(s.revenueAccountId)}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                Pulls default rate from Inventory → Items → Service catalog. Services are not stock-tracked.
              </p>
            </div>
          ) : null}

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

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link
            href="/sales"
            className="inline-flex justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="inline-flex justify-center rounded-full border-2 border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            Print invoice
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex justify-center rounded-full bg-[var(--gs-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Save invoice
          </button>
        </div>
      </div>

      <AddCustomerModal open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} onSave={onNewCustomerSaved} />

      <ReceivePaymentModal open={receiveOpen} onClose={() => setReceiveOpen(false)} initial={receiveInitial} />

      <InvoicePrintDialog open={printOpen} onClose={() => setPrintOpen(false)} data={invoicePdfData} />
    </div>
  );
}
