"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AddCustomerModal } from "@/components/sales/AddCustomerModal";
import { ReceivePaymentModal } from "@/components/sales/ReceivePaymentModal";
import { AppDialog } from "@/components/ui/AppDialog";
import { displayName, getAccessToken } from "@/lib/authClient";
import { useOptionalPermissions } from "@/contexts/PermissionContext";
import { canAccess } from "@/lib/permissions";
import { fetchAdminUsers, type AdminUserRecord } from "@/lib/rbacApi";
import {
  createCustomer,
  customerDtoToDisplay,
  fetchCustomers,
  type CustomerDisplayRow,
} from "@/lib/customersApi";
import { addCustomer, loadCustomers } from "@/lib/demoCustomers";
import { appendDemoInvoice, rowFromInvoicePayload } from "@/lib/demoInvoices";
import { SalesInvoiceLineCart } from "@/components/sales/SalesInvoiceLineCart";
import { SalesStockPicker } from "@/components/sales/SalesStockPicker";
import { fetchStockUnit, type InvStockUnitDto } from "@/lib/invApi";
import {
  createSalesInvoice,
  fetchNextInvoiceCode,
  postSalesInvoice,
} from "@/lib/salesInvoicesApi";
import { lineSaleTotal, stockUnitToCartLine, type InvoiceCartLine } from "@/lib/salesStockUtils";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type InvoiceLine = InvoiceCartLine;

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
  const searchParams = useSearchParams();
  const todayIso = useHydratedTodayIso();
  const permCtx = useOptionalPermissions();
  const currentUser = permCtx?.user ?? null;
  const canAssignSalesperson = canAccess(currentUser?.permissions?.["users_roles"], "view");
  const prefillCustomerId = searchParams.get("customerId");
  const prefillStockUnitIds = searchParams.get("stockUnitIds");
  const prefillStockId = searchParams.get("stockId");
  const prefillApplied = useRef(false);
  const stockPrefillApplied = useRef(false);

  const [customers, setCustomers] = useState<CustomerDisplayRow[]>([]);
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

  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [salespersonId, setSalespersonId] = useState("");
  const [teamMembers, setTeamMembers] = useState<AdminUserRecord[]>([]);

  useEffect(() => {
    if (currentUser?.id) setSalespersonId((prev) => prev || currentUser.id);
  }, [currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!getAccessToken() || !canAssignSalesperson) return;
      try {
        const users = await fetchAdminUsers();
        if (!cancelled) setTeamMembers(users.filter((u) => u.is_active));
      } catch {
        /* fall back to self-only assignment */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canAssignSalesperson]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!getAccessToken()) return;
      try {
        const code = await fetchNextInvoiceCode();
        if (!cancelled) setInvoiceNo(code);
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!getAccessToken()) {
        if (!cancelled) {
          setCustomers(
            loadCustomers().map((c) => ({
              id: c.id,
              customer_code: "",
              name: c.name,
              email: c.email,
              phone: c.phone,
              detail: c.detail,
            })),
          );
        }
        return;
      }
      try {
        const rows = await fetchCustomers();
        if (!cancelled) setCustomers(rows.map(customerDtoToDisplay));
      } catch {
        if (!cancelled) {
          setCustomers(
            loadCustomers().map((c) => ({
              id: c.id,
              customer_code: "",
              name: c.name,
              email: c.email,
              phone: c.phone,
              detail: c.detail,
            })),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!getAccessToken() || !prefillStockUnitIds || stockPrefillApplied.current) return;
    stockPrefillApplied.current = true;
    const ids = prefillStockUnitIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return;
    let cancelled = false;
    void (async () => {
      const added: InvoiceLine[] = [];
      for (const id of ids) {
        try {
          const u = await fetchStockUnit(id);
          if (!cancelled) added.push(stockUnitToCartLine(u));
        } catch {
          /* skip bad id */
        }
      }
      if (!cancelled && added.length) setLines((prev) => [...prev, ...added]);
    })();
    return () => {
      cancelled = true;
    };
  }, [prefillStockUnitIds]);

  useEffect(() => {
    if (!prefillCustomerId || prefillApplied.current || customers.length === 0) return;
    const match = customers.find((c) => c.id === prefillCustomerId);
    if (!match) return;
    prefillApplied.current = true;
    setCustomerPick(match.id);
    applyCustomer(match);
  }, [customers, prefillCustomerId]);

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

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + lineSaleTotal(l), 0), [lines]);

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

  function applyCustomer(c: CustomerDisplayRow) {
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

  async function onNewCustomerSaved(payload: { name: string; email: string; phone: string; detail: string }) {
    if (getAccessToken()) {
      const created = await createCustomer({
        name: payload.name,
        email: payload.email || null,
        phone: payload.phone || null,
        notes: payload.detail || null,
      });
      const row = customerDtoToDisplay(created);
      setCustomers((prev) => [row, ...prev]);
      setCustomerPick(row.id);
      applyCustomer(row);
      return;
    }
    const created = addCustomer(payload);
    const row: CustomerDisplayRow = {
      id: created.id,
      customer_code: "",
      name: created.name,
      email: created.email,
      phone: created.phone,
      detail: created.detail,
    };
    setCustomers((prev) => [row, ...prev]);
    setCustomerPick(row.id);
    applyCustomer(row);
  }

  function updateLine(id: string, key: keyof InvoiceLine, value: string) {
    setLines((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function addUnitsFromPicker(units: InvStockUnitDto[]) {
    const existing = new Set(lines.map((l) => l.stockUnitId).filter(Boolean));
    const fresh = units.filter((u) => !existing.has(u.id)).map(stockUnitToCartLine);
    if (fresh.length) setLines((prev) => [...prev, ...fresh]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((r) => r.id !== id));
  }

  function validate(): string | null {
    if (!invoiceNo.trim()) return "Invoice number is required.";
    if (!customerPick || customerPick === ADD_NEW_VALUE) return "Customer is required.";
    if (!dateIso) return "Date is required.";
    if (subtotal <= 0) return "Invoice total must be greater than 0.";
    if (getAccessToken()) {
      if (lines.length === 0) return "Add at least one inventory parcel.";
      const missing = lines.some((l) => !l.stockUnitId);
      if (missing) return "Each line must be linked to an inventory stock unit.";
    } else if (lines.length === 0) {
      return "Add at least one line.";
    }
    return null;
  }

  async function save(goBack: boolean, alsoPost: boolean) {
    const msg = validate();
    if (msg) {
      setError(msg);
      setSuccess(null);
      return;
    }
    setError(null);
    setSaving(true);

    try {
      if (getAccessToken()) {
        const created = await createSalesInvoice({
          customer_id: customerPick,
          invoice_code: invoiceNo.trim(),
          invoice_date: dateIso,
          payment_terms: paymentTerms,
          reference_no: referenceNo.trim(),
          memo: notes.trim(),
          salesperson_id: salespersonId || undefined,
          lines: lines.map((l, i) => ({
            stock_unit_id: l.stockUnitId,
            description: l.description || l.item,
            unit_price: num(l.rate),
            sort_order: i,
          })),
        });
        if (alsoPost || status !== "Draft") {
          await postSalesInvoice(created.id);
        }
        setSuccess(alsoPost ? "Invoice saved and posted." : "Invoice saved as draft.");
        if (goBack) router.push("/sales");
        return;
      }

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
      setSuccess("Invoice saved (demo mode). Sign in to save to the server.");
      if (goBack) router.push("/sales");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save invoice");
    } finally {
      setSaving(false);
    }
  }

  function openPrint() {
    window.print();
  }

  function updateCustomize<K extends keyof InvoiceCustomize>(key: K, value: InvoiceCustomize[K]) {
    setCustomize((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-32 no-print">
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
            {getAccessToken() && currentUser ? (
              <div>
                <label className="gs-label">Salesperson</label>
                {canAssignSalesperson && teamMembers.length > 0 ? (
                  <select
                    value={salespersonId}
                    onChange={(e) => setSalespersonId(e.target.value)}
                    className="gs-field"
                  >
                    {!teamMembers.some((u) => u.id === currentUser.id) ? (
                      <option value={currentUser.id}>{displayName(currentUser)} (me)</option>
                    ) : null}
                    {teamMembers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {displayName(u)}
                        {u.id === currentUser.id ? " (me)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={displayName(currentUser)} readOnly className="gs-field opacity-80" />
                )}
                <p className="mt-1 text-xs text-[var(--gs-muted)]">
                  {canAssignSalesperson
                    ? "Credit this sale to a team member."
                    : "Sales are credited to you."}
                </p>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <label className="gs-label">Notes / Memo</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="gs-field" />
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Amount summary</p>
          <p className="mt-2 text-4xl font-bold text-[var(--gs-text)]">{money(subtotal)}</p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--gs-muted)]">
            {lines.length} line{lines.length === 1 ? "" : "s"} — sum of each parcel&apos;s sale total (weight × $/ct).
          </p>
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

      <SalesInvoiceLineCart
        lines={lines}
        onUpdateLine={(id, patch) => setLines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
        onRemoveLine={removeLine}
        onAddFromInventory={() => setPickerOpen(true)}
        customize={customize}
        demoMode={!getAccessToken()}
        onDemoLineChange={(id, key, value) => updateLine(id, key, value)}
        onAddDemoRow={() =>
          setLines((prev) => [
            ...prev,
            { id: crypto.randomUUID(), stockUnitId: "", item: "", description: "", qty: "1", rate: "0" },
          ])
        }
      />

      <SalesStockPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={addUnitsFromPicker}
        excludeUnitIds={lines.map((l) => l.stockUnitId).filter(Boolean)}
        initialStockUnitId={prefillStockId}
      />

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--gs-border)] bg-[var(--gs-card)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push("/sales")} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Cancel
            </button>
            <button type="button" onClick={() => setLines([])} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
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
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(false, false)}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(true, true)}
              className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & post"}
            </button>
            {showSaveMenu ? (
              <div className="absolute bottom-12 right-0 w-48 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] p-1 shadow-lg">
                <button type="button" onClick={() => { setShowSaveMenu(false); void save(true, false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
                  Save draft & close
                </button>
                <button type="button" onClick={() => { setShowSaveMenu(false); void save(false, false); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
                  Save draft & stay
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
