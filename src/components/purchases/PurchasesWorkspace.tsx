"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { AppDialog } from "@/components/ui/AppDialog";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { formatMoney } from "@/lib/format";
import { archiveVendor, createVendor, fetchVendorOpenBalances, fetchVendors, updateVendor, type VendorDto } from "@/lib/purchaseLotsApi";

type Tab = "flow" | "payments" | "vendors";

const FLOW_STEPS = [
  { id: "req", label: "Purchase requisition", desc: "Internal request before sourcing" },
  { id: "rfq", label: "RFQ", desc: "Request for quotation from vendors" },
  { id: "po", label: "Purchase order", desc: "Approved PO to vendor" },
  { id: "grn", label: "Goods receipt (GRN)", desc: "Receive stock into inventory" },
  { id: "pi", label: "Purchase invoice", desc: "Match vendor bill to GRN" },
  { id: "pr", label: "Purchase return", desc: "Debit note / returns" },
] as const;

type VendorUiRow = { id: string; name: string; email: string; balance: number };
type VendorFormState = {
  vendor_code: string;
  legal_name: string;
  display_name: string;
  name: string;
  contact_person: string;
  contact_number: string;
  email: string;
  website: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  currency: string;
  opening_balance: string;
  withholding_tax_rate: string;
  bank_account_name: string;
  bank_account_no_or_iban: string;
  bank_name: string;
  swift_bic: string;
  status: string;
  notes: string;
};

const emptyVendorForm: VendorFormState = {
  vendor_code: "",
  legal_name: "",
  display_name: "",
  name: "",
  contact_person: "",
  contact_number: "",
  email: "",
  website: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state_province: "",
  postal_code: "",
  country: "",
  tax_id: "",
  payment_terms: "",
  currency: "",
  opening_balance: "0",
  withholding_tax_rate: "0",
  bank_account_name: "",
  bank_account_no_or_iban: "",
  bank_name: "",
  swift_bic: "",
  status: "active",
  notes: "",
};

export function PurchasesWorkspace() {
  const { pushToast } = useAppNotifications();
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get("tab") as Tab | null) ?? "flow";

  useEffect(() => {
    if (!sp.get("tab")) router.replace("/purchases?tab=flow", { scroll: false });
  }, [router, sp]);

  const setTab = (t: Tab) => router.push(`/purchases?tab=${t}`, { scroll: false });

  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorRows, setVendorRows] = useState<VendorUiRow[]>([]);
  const [vendorRawRows, setVendorRawRows] = useState<VendorDto[]>([]);
  const [vendorsError, setVendorsError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [vendorDialogMode, setVendorDialogMode] = useState<"create" | "edit">("create");
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState<VendorFormState>(emptyVendorForm);
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [showOptionalVendorFields, setShowOptionalVendorFields] = useState(false);

  const loadVendorForm = useCallback((vendor: VendorDto) => {
    setVendorForm({
      vendor_code: vendor.vendor_code || "",
      legal_name: vendor.legal_name || "",
      display_name: vendor.display_name || "",
      name: vendor.name || "",
      contact_person: vendor.contact_person || "",
      contact_number: vendor.contact_number || "",
      email: vendor.email || "",
      website: vendor.website || "",
      address_line_1: vendor.address_line_1 || "",
      address_line_2: vendor.address_line_2 || "",
      city: vendor.city || "",
      state_province: vendor.state_province || "",
      postal_code: vendor.postal_code || "",
      country: vendor.country || "",
      tax_id: vendor.tax_id || "",
      payment_terms: vendor.payment_terms || "",
      currency: vendor.currency || "",
      opening_balance: vendor.opening_balance || "0",
      withholding_tax_rate: vendor.withholding_tax_rate || "0",
      bank_account_name: vendor.bank_account_name || "",
      bank_account_no_or_iban: vendor.bank_account_no_or_iban || "",
      bank_name: vendor.bank_name || "",
      swift_bic: vendor.swift_bic || "",
      status: vendor.status || (vendor.is_active ? "active" : "inactive"),
      notes: vendor.notes || "",
    });
  }, []);

  const refreshVendorBalances = useCallback(async () => {
    try {
      const [vendors, balances] = await Promise.all([fetchVendors(true), fetchVendorOpenBalances()]);
      setVendorRawRows(vendors);
      const balMap = new Map(balances.map((b) => [b.vendor_id, Number.parseFloat(b.open_balance) || 0]));
      setVendorRows(
        vendors
          .filter((v: VendorDto) => (showInactive ? true : v.is_active))
          .map((v: VendorDto) => ({
          id: v.id,
          name: v.name,
          email: v.email || "",
          balance: balMap.get(v.id) ?? 0,
          })),
      );
      setVendorsError(null);
    } catch (e) {
      setVendorsError(e instanceof Error ? e.message : "Could not load vendors");
      setVendorRows([]);
    }
  }, [showInactive]);

  useEffect(() => {
    if (tab === "vendors" || tab === "payments") void refreshVendorBalances();
  }, [tab, refreshVendorBalances]);

  const vendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    const source = vendorRawRows.filter((v) => (showInactive ? true : v.is_active));
    if (!q) return source;
    return source.filter((v) => `${v.name} ${v.email || ""} ${v.vendor_code}`.toLowerCase().includes(q));
  }, [vendorSearch, vendorRawRows, showInactive]);

  const balanceMap = useMemo(() => new Map(vendorRows.map((x) => [x.id, x.balance])), [vendorRows]);

  function openCreateVendor() {
    setVendorDialogMode("create");
    setEditingVendorId(null);
    setVendorForm(emptyVendorForm);
    setShowOptionalVendorFields(false);
    setVendorDialogOpen(true);
  }

  function openEditVendor(v: VendorDto) {
    setVendorDialogMode("edit");
    setEditingVendorId(v.id);
    loadVendorForm(v);
    setShowOptionalVendorFields(true);
    setVendorDialogOpen(true);
  }

  async function submitVendorForm() {
    if (!vendorForm.name.trim() || !vendorForm.contact_number.trim() || !vendorForm.address_line_1.trim()) {
      pushToast("Name, contact number, and address are required.", "error");
      return;
    }
    if (vendorSubmitting) return;
    setVendorSubmitting(true);
    try {
      const payload = {
        vendor_code: vendorForm.vendor_code.trim() || null,
        legal_name: vendorForm.legal_name.trim() || null,
        display_name: vendorForm.display_name.trim() || null,
        name: vendorForm.name.trim(),
        contact_person: vendorForm.contact_person.trim() || null,
        contact_number: vendorForm.contact_number.trim(),
        email: vendorForm.email.trim() || null,
        website: vendorForm.website.trim() || null,
        address_line_1: vendorForm.address_line_1.trim(),
        address_line_2: vendorForm.address_line_2.trim() || null,
        city: vendorForm.city.trim() || null,
        state_province: vendorForm.state_province.trim() || null,
        postal_code: vendorForm.postal_code.trim() || null,
        country: vendorForm.country.trim() || null,
        tax_id: vendorForm.tax_id.trim() || null,
        payment_terms: vendorForm.payment_terms.trim() || null,
        currency: vendorForm.currency.trim() || null,
        opening_balance: Number(vendorForm.opening_balance || "0"),
        withholding_tax_rate: Number(vendorForm.withholding_tax_rate || "0"),
        bank_account_name: vendorForm.bank_account_name.trim() || null,
        bank_account_no_or_iban: vendorForm.bank_account_no_or_iban.trim() || null,
        bank_name: vendorForm.bank_name.trim() || null,
        swift_bic: vendorForm.swift_bic.trim() || null,
        status: vendorForm.status,
        notes: vendorForm.notes.trim() || null,
        is_active: vendorForm.status === "active",
      };
      if (vendorDialogMode === "create") {
        await createVendor(payload);
        pushToast("Vendor created.", "success");
      } else if (editingVendorId) {
        await updateVendor(editingVendorId, payload);
        pushToast("Vendor updated.", "success");
      }
      setVendorDialogOpen(false);
      setVendorForm(emptyVendorForm);
      await refreshVendorBalances();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Failed to save vendor", "error");
    } finally {
      setVendorSubmitting(false);
    }
  }

  async function onArchiveVendor(vendorId: string) {
    try {
      await archiveVendor(vendorId);
      pushToast("Vendor deleted (soft).", "success");
      await refreshVendorBalances();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Failed to delete vendor", "error");
    }
  }

  async function onRestoreVendor(vendorId: string) {
    try {
      await updateVendor(vendorId, { status: "active", is_active: true });
      pushToast("Vendor restored.", "success");
      await refreshVendorBalances();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Failed to restore vendor", "error");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <p className="text-sm leading-relaxed text-[var(--gs-muted)]">
        Front-end shells for the purchase cycle (requisition → RFQ → PO → GRN → bill → return) and vendor payments. Connect API when ready.
      </p>

      <div className="flex flex-col gap-2 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["flow", "Purchase flow"],
              ["payments", "Vendor payments"],
              ["vendors", "Vendors"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                tab === id ? "bg-[var(--gs-accent)] text-white" : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--gs-muted)] sm:text-sm">Vendor bills: use Purchase flow → Purchase invoice.</span>
      </div>

      {tab === "flow" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Purchase transactions</h2>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">Follow the standard procurement path  each step opens a drawer in a full implementation.</p>
            </div>
            <button
              type="button"
              onClick={() => pushToast("Demo: start new purchase requisition", "info")}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
            >
              + New requisition
            </button>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FLOW_STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pushToast(`Demo: open ${s.label}`, "info")}
                className="flex flex-col rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/60 p-4 text-left transition hover:border-[var(--gs-accent)] hover:bg-[var(--gs-card)]"
              >
                <span className="font-bold text-[var(--gs-text)]">{s.label}</span>
                <span className="mt-1 text-sm text-[var(--gs-muted)]">{s.desc}</span>
                <span className="mt-3 text-xs font-semibold text-[var(--gs-accent)]">Open →</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "payments" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Vendor payments</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">
            Open balances from unpaid purchase lots (functional currency). Record payments from the{" "}
            <Link href="/lots" className="font-semibold text-[var(--gs-accent)] hover:underline">
              Lots
            </Link>{" "}
            screen.
          </p>
          {vendorsError ? <p className="mt-2 text-sm text-red-700">{vendorsError}</p> : null}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3 text-right">Open AP</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {vendorRows.filter((v) => v.balance > 0).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-[var(--gs-muted)]">
                      No open vendor balances.
                    </td>
                  </tr>
                ) : (
                  vendorRows
                    .filter((v) => v.balance > 0)
                    .map((v) => (
                      <tr key={v.id} className="hover:bg-[var(--gs-hover)]/80">
                        <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{v.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--gs-text)]">{formatMoney(v.balance, "USD")}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href="/lots"
                            className="inline-block rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-accent)] hover:bg-[var(--gs-hover)]"
                          >
                            Go to lots
                          </Link>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "vendors" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Vendor list</h2>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">
                Live from the API. Balance column shows open purchase-lot totals (sub-ledger, not the GL control total).
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateVendor}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              + New vendor
            </button>
          </div>
          <div className="mt-4">
            <label className="mr-3 inline-flex items-center gap-2 text-sm text-[var(--gs-muted)]">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
            <input
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              placeholder="Search vendor name or email..."
              className="w-full max-w-md rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          {vendorsError ? <p className="mt-2 text-sm text-red-700">{vendorsError}</p> : null}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Open balance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[var(--gs-muted)]">
                      No vendors yet.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-[var(--gs-hover)]/80">
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{v.vendor_code || "—"}</td>
                      <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{v.name}</td>
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{v.contact_number || "—"}</td>
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{v.address_line_1 || "—"}</td>
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{v.email || "—"}</td>
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{v.status || (v.is_active ? "active" : "inactive")}</td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--gs-text)]">{formatMoney(balanceMap.get(v.id) ?? 0, "USD")}</td>
                      <td className="px-4 py-3 text-right">
                        <RowActionsMenu
                          actions={[
                            { label: "View", onSelect: () => openEditVendor(v), tone: "default" },
                            { label: "Edit", onSelect: () => openEditVendor(v), tone: "accent" },
                            v.is_active
                              ? { label: "Delete", onSelect: () => void onArchiveVendor(v.id), tone: "danger" }
                              : { label: "Restore", onSelect: () => void onRestoreVendor(v.id), tone: "success" },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AppDialog
        open={vendorDialogOpen}
        onClose={() => {
          if (vendorSubmitting) return;
          setVendorDialogOpen(false);
        }}
        titleId="vendor-dialog-title"
        title={vendorDialogMode === "create" ? "Create vendor" : "Edit vendor"}
        description="Required fields are shown first. Optional fields are grouped below."
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={vendorSubmitting}
              onClick={() => setVendorDialogOpen(false)}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={vendorSubmitting}
              onClick={() => void submitVendorForm()}
              className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {vendorSubmitting ? "Saving..." : vendorDialogMode === "create" ? "Create vendor" : "Save changes"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Required</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <input value={vendorForm.name} onChange={(e) => setVendorForm((s) => ({ ...s, name: e.target.value }))} placeholder="Name *" className="gs-field !mt-0" />
              <input value={vendorForm.contact_number} onChange={(e) => setVendorForm((s) => ({ ...s, contact_number: e.target.value }))} placeholder="Contact number *" className="gs-field !mt-0" />
              <input value={vendorForm.address_line_1} onChange={(e) => setVendorForm((s) => ({ ...s, address_line_1: e.target.value }))} placeholder="Address *" className="gs-field !mt-0" />
              <input value={vendorForm.email} onChange={(e) => setVendorForm((s) => ({ ...s, email: e.target.value }))} placeholder="Email" className="gs-field !mt-0" />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--gs-border)] p-3">
            <button
              type="button"
              onClick={() => setShowOptionalVendorFields((v) => !v)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-[var(--gs-text)]"
            >
              <span>Optional fields</span>
              <span>{showOptionalVendorFields ? "Hide" : "Show"}</span>
            </button>
            {showOptionalVendorFields ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <input value={vendorForm.vendor_code} onChange={(e) => setVendorForm((s) => ({ ...s, vendor_code: e.target.value }))} placeholder="Vendor code" className="gs-field !mt-0" />
                <input value={vendorForm.legal_name} onChange={(e) => setVendorForm((s) => ({ ...s, legal_name: e.target.value }))} placeholder="Legal name" className="gs-field !mt-0" />
                <input value={vendorForm.display_name} onChange={(e) => setVendorForm((s) => ({ ...s, display_name: e.target.value }))} placeholder="Display name" className="gs-field !mt-0" />
                <input value={vendorForm.contact_person} onChange={(e) => setVendorForm((s) => ({ ...s, contact_person: e.target.value }))} placeholder="Contact person" className="gs-field !mt-0" />
                <input value={vendorForm.website} onChange={(e) => setVendorForm((s) => ({ ...s, website: e.target.value }))} placeholder="Website" className="gs-field !mt-0" />
                <input value={vendorForm.address_line_2} onChange={(e) => setVendorForm((s) => ({ ...s, address_line_2: e.target.value }))} placeholder="Address line 2" className="gs-field !mt-0" />
                <input value={vendorForm.city} onChange={(e) => setVendorForm((s) => ({ ...s, city: e.target.value }))} placeholder="City" className="gs-field !mt-0" />
                <input value={vendorForm.state_province} onChange={(e) => setVendorForm((s) => ({ ...s, state_province: e.target.value }))} placeholder="State / Province" className="gs-field !mt-0" />
                <input value={vendorForm.postal_code} onChange={(e) => setVendorForm((s) => ({ ...s, postal_code: e.target.value }))} placeholder="Postal code" className="gs-field !mt-0" />
                <input value={vendorForm.country} onChange={(e) => setVendorForm((s) => ({ ...s, country: e.target.value }))} placeholder="Country" className="gs-field !mt-0" />
                <input value={vendorForm.tax_id} onChange={(e) => setVendorForm((s) => ({ ...s, tax_id: e.target.value }))} placeholder="Tax ID" className="gs-field !mt-0" />
                <input value={vendorForm.payment_terms} onChange={(e) => setVendorForm((s) => ({ ...s, payment_terms: e.target.value }))} placeholder="Payment terms" className="gs-field !mt-0" />
                <input value={vendorForm.currency} onChange={(e) => setVendorForm((s) => ({ ...s, currency: e.target.value }))} placeholder="Currency (e.g. USD)" className="gs-field !mt-0" />
                <input value={vendorForm.opening_balance} onChange={(e) => setVendorForm((s) => ({ ...s, opening_balance: e.target.value }))} placeholder="Opening balance" className="gs-field !mt-0" />
                <input value={vendorForm.withholding_tax_rate} onChange={(e) => setVendorForm((s) => ({ ...s, withholding_tax_rate: e.target.value }))} placeholder="Withholding tax rate" className="gs-field !mt-0" />
                <input value={vendorForm.bank_account_name} onChange={(e) => setVendorForm((s) => ({ ...s, bank_account_name: e.target.value }))} placeholder="Bank account name" className="gs-field !mt-0" />
                <input value={vendorForm.bank_account_no_or_iban} onChange={(e) => setVendorForm((s) => ({ ...s, bank_account_no_or_iban: e.target.value }))} placeholder="Account no / IBAN" className="gs-field !mt-0" />
                <input value={vendorForm.bank_name} onChange={(e) => setVendorForm((s) => ({ ...s, bank_name: e.target.value }))} placeholder="Bank name" className="gs-field !mt-0" />
                <input value={vendorForm.swift_bic} onChange={(e) => setVendorForm((s) => ({ ...s, swift_bic: e.target.value }))} placeholder="SWIFT/BIC" className="gs-field !mt-0" />
                <select value={vendorForm.status} onChange={(e) => setVendorForm((s) => ({ ...s, status: e.target.value }))} className="gs-field !mt-0">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="blocked">blocked</option>
                </select>
                <textarea value={vendorForm.notes} onChange={(e) => setVendorForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Notes" className="gs-field !mt-0 min-h-[4.5rem] sm:col-span-3" />
              </div>
            ) : null}
          </div>
        </div>
      </AppDialog>
    </div>
  );
}