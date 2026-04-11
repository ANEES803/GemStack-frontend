"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddCustomerModal } from "@/components/sales/AddCustomerModal";
import { ReceivePaymentModal } from "@/components/sales/ReceivePaymentModal";
import { AppDialog } from "@/components/ui/AppDialog";
import { addCustomer, loadCustomers, type DemoCustomer } from "@/lib/demoCustomers";
import { appendDemoInvoice, rowFromInvoicePayload } from "@/lib/demoInvoices";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type InvoiceLine = {
  id: string;
  item: string;
  description: string;
  qty: string;
  rate: string;
};

type InvoiceCustomize = {
  showDescription: boolean;
  showRate: boolean;
  showQty: boolean;
  showNotes: boolean;
  labelItem: string;
  labelDescription: string;
  labelQty: string;
  labelRate: string;
  labelAmount: string;
};

const ADD_NEW_VALUE = "__add_new__";
const CUSTOMIZE_KEY = "invoice-customize-settings";

const DEFAULT_CUSTOMIZE: InvoiceCustomize = {
  showDescription: true,
  showRate: true,
  showQty: true,
  showNotes: true,
  labelItem: "Item / Product",
  labelDescription: "Description",
  labelQty: "Qty",
  labelRate: "Rate",
  labelAmount: "Amount",
};

function num(v: string): number {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CreateInvoiceForm() {
  const router = useRouter();
  const todayIso = useHydratedTodayIso();

  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [customerPick, setCustomerPick] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [invoiceNo, setInvoiceNo] = useState("INV-NEW");
  const [dateIso, setDateIso] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on receipt");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"Draft" | "Pending" | "Paid">("Pending");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customize, setCustomize] = useState<InvoiceCustomize>(DEFAULT_CUSTOMIZE);

  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: crypto.randomUUID(), item: "", description: "", qty: "1", rate: "0" },
  ]);

  useEffect(() => setCustomers(loadCustomers()), []);
  useEffect(() => {
    if (todayIso) setDateIso((d) => d || todayIso);
  }, [todayIso]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(CUSTOMIZE_KEY);
    if (!raw) return;
    try {
      setCustomize({ ...DEFAULT_CUSTOMIZE, ...(JSON.parse(raw) as Partial<InvoiceCustomize>) });
    } catch {
      setCustomize(DEFAULT_CUSTOMIZE);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(customize));
  }, [customize]);

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + num(l.qty) * num(l.rate), 0), [lines]);

  const receiveInitial = useMemo(
    () => ({
      invoiceId: invoiceNo.trim() || undefined,
      customerName: customer.trim() || undefined,
      email: customerEmail.trim() || undefined,
      amount: String(subtotal || ""),
      detail: notes.trim() || undefined,
    }),
    [invoiceNo, customer, customerEmail, subtotal, notes],
  );

  function applyCustomer(c: DemoCustomer) {
    setCustomer(c.name);
    setCustomerEmail(c.email);
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

  function updateLine(id: string, key: keyof InvoiceLine, value: string) {
    setLines((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), item: "", description: "", qty: "1", rate: "0" }]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function validate(): string | null {
    if (!invoiceNo.trim()) return "Invoice number is required.";
    if (!customer.trim()) return "Customer is required.";
    if (!dateIso) return "Date is required.";
    if (subtotal <= 0) return "Invoice total must be greater than 0.";
    return null;
  }

  function save(goBack: boolean) {
    const msg = validate();
    if (msg) {
      setError(msg);
      setSuccess(null);
      return;
    }
    setError(null);

    appendDemoInvoice(
      rowFromInvoicePayload({
        invoiceNo: invoiceNo.trim(),
        parcelNo: referenceNo.trim() || "-",
        dateIso,
        customer: customer.trim(),
        holder: "-",
        paymentMethod: paymentTerms,
        amount: subtotal,
        status: status === "Paid" ? "Paid" : "Pending",
      }),
    );

    setSuccess("Invoice saved successfully.");
    if (goBack) router.push("/sales");
  }

  function openPrint() {
    window.print();
  }

  function updateCustomize<K extends keyof InvoiceCustomize>(key: K, value: InvoiceCustomize[K]) {
    setCustomize((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-32 no-print">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .invoice-print-area,
          .invoice-print-area * {
            visibility: visible !important;
          }
          .invoice-print-area {
            position: fixed;
            inset: 0;
            background: white;
            color: black;
            padding: 24px;
          }
        }
      `}</style>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/sales" className="text-sm font-semibold text-[var(--gs-accent)] hover:text-[var(--gs-accent-hover)]">
            Back to invoices
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-[var(--gs-text)]">New Invoice</h1>
        </div>
        <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-5 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Balance Due</p>
          <p className="mt-1 text-3xl font-bold text-[var(--gs-text)]">{money(subtotal)}</p>
        </div>
      </div>

      {success ? <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div> : null}
      {error ? <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="gs-label">Customer / Party</label>
              <select value={customerPick} onChange={(e) => onCustomerSelect(e.target.value)} className="gs-field">
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={ADD_NEW_VALUE}>+ Add new customer</option>
              </select>
            </div>
            <div>
              <label className="gs-label">Email (optional)</label>
              <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="gs-field" />
            </div>
            <div>
              <label className="gs-label">Date</label>
              <input type="date" value={dateIso} onChange={(e) => setDateIso(e.target.value)} className="gs-field" />
            </div>
            <div>
              <label className="gs-label">Payment terms</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="gs-field">
                <option>Due on receipt</option>
                <option>Net 7</option>
                <option>Net 15</option>
                <option>Net 30</option>
              </select>
            </div>
            <div>
              <label className="gs-label">Reference no.</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="gs-field" />
            </div>
            <div>
              <label className="gs-label">Invoice no.</label>
              <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="gs-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="gs-label">Notes / Memo</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="gs-field" />
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Amount summary</p>
          <p className="mt-2 text-4xl font-bold text-[var(--gs-text)]">{money(subtotal)}</p>
          <button
            type="button"
            onClick={() => setStatus((s) => (s === "Paid" ? "Pending" : "Paid"))}
            className="mt-4 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)]"
          >
            Status: {status}
          </button>
          <button
            type="button"
            onClick={() => setReceiveOpen(true)}
            className="mt-3 w-full rounded-lg bg-[var(--gs-accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
          >
            Receive Payment
          </button>
        </aside>
      </section>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[var(--gs-border)]">
                <th className="px-3 py-3 text-left font-semibold text-[var(--gs-muted)]">{customize.labelItem}</th>
                {customize.showDescription ? <th className="px-3 py-3 text-left font-semibold text-[var(--gs-muted)]">{customize.labelDescription}</th> : null}
                {customize.showQty ? <th className="px-3 py-3 text-right font-semibold text-[var(--gs-muted)]">{customize.labelQty}</th> : null}
                {customize.showRate ? <th className="px-3 py-3 text-right font-semibold text-[var(--gs-muted)]">{customize.labelRate}</th> : null}
                <th className="px-3 py-3 text-right font-semibold text-[var(--gs-muted)]">{customize.labelAmount}</th>
                <th className="px-3 py-3 text-right font-semibold text-[var(--gs-muted)]"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const lineTotal = num(l.qty) * num(l.rate);
                return (
                  <tr key={l.id} className="border-b border-[var(--gs-border)]">
                    <td className="px-3 py-2">
                      <input value={l.item} onChange={(e) => updateLine(l.id, "item", e.target.value)} className="gs-field !mt-0" />
                    </td>
                    {customize.showDescription ? (
                      <td className="px-3 py-2">
                        <input value={l.description} onChange={(e) => updateLine(l.id, "description", e.target.value)} className="gs-field !mt-0" />
                      </td>
                    ) : null}
                    {customize.showQty ? (
                      <td className="px-3 py-2">
                        <input value={l.qty} onChange={(e) => updateLine(l.id, "qty", e.target.value)} className="gs-field !mt-0 text-right" />
                      </td>
                    ) : null}
                    {customize.showRate ? (
                      <td className="px-3 py-2">
                        <input value={l.rate} onChange={(e) => updateLine(l.id, "rate", e.target.value)} className="gs-field !mt-0 text-right" />
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-right font-semibold text-[var(--gs-text)]">{money(lineTotal)}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeLine(l.id)} className="text-sm font-semibold text-[var(--gs-muted)] hover:text-[var(--gs-text)]">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addLine} className="mt-4 rounded-lg border border-[var(--gs-border)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
          + Add row
        </button>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--gs-border)] bg-[var(--gs-card)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push("/sales")} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setLines([{ id: crypto.randomUUID(), item: "", description: "", qty: "1", rate: "0" }])}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Clear
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={openPrint} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Print
            </button>
            <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Preview
            </button>
            <button type="button" onClick={() => setCustomizeOpen(true)} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Customize
            </button>
          </div>

          <div className="relative flex gap-2">
            <button type="button" onClick={() => save(false)} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Save
            </button>
            <button type="button" onClick={() => setShowSaveMenu((v) => !v)} className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]">
              Save and Close
            </button>
            {showSaveMenu ? (
              <div className="absolute bottom-12 right-0 w-48 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] p-1 shadow-lg">
                <button type="button" onClick={() => { setShowSaveMenu(false); save(true); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
                  Save and close
                </button>
                <button type="button" onClick={() => { setShowSaveMenu(false); save(false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
                  Save and new
                </button>
              </div>
            ) : null}
            <button type="button" onClick={() => setShowMoreMenu((v) => !v)} className="rounded-lg border border-[var(--gs-border)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              More
            </button>
            {showMoreMenu ? (
              <div className="absolute bottom-12 right-0 w-44 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] p-1 shadow-lg">
                <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">Copy</button>
                <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">Delete</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="invoice-print-area hidden print:block">
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Invoice {invoiceNo || "DRAFT"}</h1>
        <p style={{ marginTop: 8 }}>Date: {dateIso || "-"}</p>
        <p>Customer: {customer || "-"}</p>
        <p>Email: {customerEmail || "-"}</p>
        {customize.showNotes ? <p>Notes: {notes || "-"}</p> : null}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 4px" }}>{customize.labelItem}</th>
              {customize.showDescription ? <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 4px" }}>{customize.labelDescription}</th> : null}
              {customize.showQty ? <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 4px" }}>{customize.labelQty}</th> : null}
              {customize.showRate ? <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 4px" }}>{customize.labelRate}</th> : null}
              <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: "8px 4px" }}>{customize.labelAmount}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td style={{ padding: "6px 4px" }}>{l.item || "-"}</td>
                {customize.showDescription ? <td style={{ padding: "6px 4px" }}>{l.description || "-"}</td> : null}
                {customize.showQty ? <td style={{ padding: "6px 4px", textAlign: "right" }}>{l.qty || "0"}</td> : null}
                {customize.showRate ? <td style={{ padding: "6px 4px", textAlign: "right" }}>{l.rate || "0"}</td> : null}
                <td style={{ padding: "6px 4px", textAlign: "right" }}>{money(num(l.qty) * num(l.rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 14, textAlign: "right", fontWeight: 700 }}>Total: {money(subtotal)}</p>
      </div>

      <AddCustomerModal open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} onSave={onNewCustomerSaved} />
      <ReceivePaymentModal open={receiveOpen} onClose={() => setReceiveOpen(false)} initial={receiveInitial} />

      <AppDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        titleId="invoice-preview-title"
        title="Invoice Preview"
        description="Read-only preview of the final invoice."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Close
            </button>
            <button type="button" onClick={openPrint} className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]">
              Print
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-[var(--gs-border)] p-4">
            <p><span className="font-semibold">Invoice:</span> {invoiceNo || "DRAFT"}</p>
            <p><span className="font-semibold">Date:</span> {dateIso || "-"}</p>
            <p><span className="font-semibold">Customer:</span> {customer || "-"}</p>
            <p><span className="font-semibold">Email:</span> {customerEmail || "-"}</p>
            {customize.showNotes ? <p><span className="font-semibold">Notes:</span> {notes || "-"}</p> : null}
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--gs-border)]">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[var(--gs-border)]">
                  <th className="px-3 py-2 text-left">{customize.labelItem}</th>
                  {customize.showDescription ? <th className="px-3 py-2 text-left">{customize.labelDescription}</th> : null}
                  {customize.showQty ? <th className="px-3 py-2 text-right">{customize.labelQty}</th> : null}
                  {customize.showRate ? <th className="px-3 py-2 text-right">{customize.labelRate}</th> : null}
                  <th className="px-3 py-2 text-right">{customize.labelAmount}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--gs-border)]">
                    <td className="px-3 py-2">{l.item || "-"}</td>
                    {customize.showDescription ? <td className="px-3 py-2">{l.description || "-"}</td> : null}
                    {customize.showQty ? <td className="px-3 py-2 text-right">{l.qty || "0"}</td> : null}
                    {customize.showRate ? <td className="px-3 py-2 text-right">{l.rate || "0"}</td> : null}
                    <td className="px-3 py-2 text-right">{money(num(l.qty) * num(l.rate))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-right text-base font-bold">Total: {money(subtotal)}</p>
        </div>
      </AppDialog>

      <AppDialog
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        titleId="invoice-customize-title"
        title="Customize Layout"
        description="Choose what to show and how labels appear."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCustomize(DEFAULT_CUSTOMIZE)} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Reset
            </button>
            <button type="button" onClick={() => setCustomizeOpen(false)} className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]">
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={customize.showDescription} onChange={(e) => updateCustomize("showDescription", e.target.checked)} />
            Show description
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={customize.showRate} onChange={(e) => updateCustomize("showRate", e.target.checked)} />
            Show rate
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={customize.showQty} onChange={(e) => updateCustomize("showQty", e.target.checked)} />
            Show quantity
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={customize.showNotes} onChange={(e) => updateCustomize("showNotes", e.target.checked)} />
            Show notes
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={customize.labelItem} onChange={(e) => updateCustomize("labelItem", e.target.value)} className="gs-field !mt-0" />
            <input value={customize.labelDescription} onChange={(e) => updateCustomize("labelDescription", e.target.value)} className="gs-field !mt-0" />
            <input value={customize.labelQty} onChange={(e) => updateCustomize("labelQty", e.target.value)} className="gs-field !mt-0" />
            <input value={customize.labelRate} onChange={(e) => updateCustomize("labelRate", e.target.value)} className="gs-field !mt-0" />
            <input value={customize.labelAmount} onChange={(e) => updateCustomize("labelAmount", e.target.value)} className="gs-field !mt-0 sm:col-span-2" />
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
