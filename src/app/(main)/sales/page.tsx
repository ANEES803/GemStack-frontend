"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { AddCustomerModal } from "@/components/sales/AddCustomerModal";
import { ReceivePaymentModal, type ReceivePaymentInitial } from "@/components/sales/ReceivePaymentModal";
import { SalesReceiptsWorkspace } from "@/components/sales/SalesReceiptsWorkspace";
import { AppDialog } from "@/components/ui/AppDialog";
import { useOptionalPermissions } from "@/contexts/PermissionContext";
import { getAccessToken } from "@/lib/authClient";
import { canAccess } from "@/lib/permissions";
import {
  createCustomer,
  customerDtoToDisplay,
  deleteCustomer,
  fetchCustomer,
  fetchCustomers,
  updateCustomer,
  type CustomerDisplayRow,
  type CustomerDto,
} from "@/lib/customersApi";
import { CreateModuleLink } from "@/components/ui/CreateModuleLink";
import { ListPageLayout } from "@/components/ui/ListPageLayout";
import {
  FilterCheckboxGrid,
  FilterCheckboxRow,
  FilterDateRangeRow,
  FilterSection,
  ListToolbarInteractive,
  type SortOption,
} from "@/components/ui/ListToolbarInteractive";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { loadCustomers } from "@/lib/demoCustomers";
import { type DemoInvoiceRow, loadAddedInvoices } from "@/lib/demoInvoices";
import {
  addSalesInvoicePayment,
  fetchSalesInvoices,
  postSalesInvoice,
  receivePaymentToCreateBody,
  summaryToListRow,
  type ReceivePaymentSubmitPayload,
  voidSalesInvoice,
} from "@/lib/salesInvoicesApi";

const DEFAULT_ROWS: DemoInvoiceRow[] = [
  { id: "INV-1042", customer: "Facebook  batch A", fep: "A. Khan", amount: "$2,840.00", method: "PayPal", status: "Paid" },
  { id: "INV-1041", customer: "Direct  Zurich", fep: "M. Ali", amount: "$4,120.00", method: "Bank", status: "Pending" },
  { id: "INV-1040", customer: "PayPal checkout", fep: "A. Khan", amount: "$910.00", method: "PayPal", status: "Paid" },
  { id: "INV-1039", customer: "Bank transfer", fep: "S. Noor", amount: "$6,400.00", method: "Bank", status: "Paid" },
];

/** Demo-only dates for filtering / sorting (not on DemoInvoiceRow type). */
const INVOICE_DATE_ISO: Record<string, string> = {
  "INV-1042": "2026-03-18",
  "INV-1041": "2026-03-17",
  "INV-1040": "2026-03-14",
  "INV-1039": "2026-03-10",
};

type InvoiceView = DemoInvoiceRow & {
  dateIso: string;
  amountNum: number;
  apiId?: string;
  rawStatus?: string;
  balanceDue?: number;
};

function augmentRow(row: DemoInvoiceRow, index: number): InvoiceView {
  const amountNum = parseFloat(row.amount.replace(/[$,]/g, "")) || 0;
  const dateIso =
    row.dateIso ?? INVOICE_DATE_ISO[row.id] ?? `2026-03-${String(25 - index).padStart(2, "0")}`;
  return { ...row, dateIso, amountNum };
}

const SORT_OPTIONS: SortOption[] = [
  { id: "recommended", label: "Recommended (newest first)" },
  { id: "oldest", label: "Oldest invoice first" },
  { id: "amount_high", label: "Amount (high → low)" },
  { id: "amount_low", label: "Amount (low → high)" },
  { id: "customer_az", label: "Customer (A → Z)" },
  { id: "fep_az", label: "Salesperson (A → Z)" },
  { id: "invoice_asc", label: "Invoice # (A → Z)" },
  { id: "invoice_desc", label: "Invoice # (Z → A)" },
  { id: "status_az", label: "Status (A → Z)" },
];

const METHODS = ["PayPal", "Bank", "Cash", "Wire (SWIFT)", "Other"] as const;

function pill(status: DemoInvoiceRow["status"] | "Partial" | "Open" | "Draft") {
  if (status === "Paid") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-900/90 dark:text-emerald-50 dark:ring-emerald-600">
        Paid
      </span>
    );
  }
  if (status === "Partial") {
    return (
      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-950 ring-1 ring-sky-200">
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950/85 dark:text-amber-100 dark:ring-amber-700">
      {status === "Open" ? "Open" : status === "Draft" ? "Draft" : "Pending"}
    </span>
  );
}

function methodPill(method: string) {
  return (
    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-950 ring-1 ring-sky-200 dark:bg-sky-950/85 dark:text-sky-100 dark:ring-sky-700">
      {method}
    </span>
  );
}

function customerTitleLines(label: string) {
  const parts = label.split("");
  if (parts.length < 2) return { primary: label.trim(), secondary: undefined as string | undefined };
  const secondary = parts
    .slice(1)
    .join("")
    .trim();
  return { primary: parts[0]!.trim(), secondary: secondary || undefined };
}

function rowToPaymentInitial(row: InvoiceView): ReceivePaymentInitial {
  const due =
    row.balanceDue != null && row.balanceDue > 0
      ? String(row.balanceDue)
      : row.amount.replace(/[$,]/g, "").trim();
  return {
    invoiceId: row.apiId ?? row.id,
    customerName: row.customer,
    amount: due,
  };
}

function cmpInvoiceId(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function csvEscape(cell: string): string {
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function SalesPageContent() {
  const { pushToast } = useAppNotifications();
  const permCtx = useOptionalPermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "transactions";

  const [rows, setRows] = useState<DemoInvoiceRow[]>(DEFAULT_ROWS);
  const [invoicesSource, setInvoicesSource] = useState<"api" | "demo">("demo");
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInitial, setPaymentInitial] = useState<ReceivePaymentInitial | undefined>(undefined);
  const [paymentRow, setPaymentRow] = useState<InvoiceView | null>(null);
  const [receiptsRefreshKey, setReceiptsRefreshKey] = useState(0);
  const [customers, setCustomers] = useState<CustomerDisplayRow[]>([]);
  const [customersSource, setCustomersSource] = useState<"api" | "local">("local");
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerDisplayRow | null>(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<CustomerDisplayRow | null>(null);
  const [viewCustomer, setViewCustomer] = useState<CustomerDto | CustomerDisplayRow | null>(null);
  const [viewCustomerLoading, setViewCustomerLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("recommended");
  const [statusPaid, setStatusPaid] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [methodFilters, setMethodFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(METHODS.map((m) => [m, false])),
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [salespersonFilter, setSalespersonFilter] = useState("");

  const refreshInvoices = useCallback(async () => {
    if (!getAccessToken()) {
      const added = loadAddedInvoices();
      setRows(added.length > 0 ? [...added, ...DEFAULT_ROWS] : DEFAULT_ROWS);
      setInvoicesSource("demo");
      return;
    }
    setInvoicesLoading(true);
    try {
      const list = await fetchSalesInvoices();
      setRows(
        list.map((d) => {
          const r = summaryToListRow(d);
          return {
            id: r.id,
            customer: r.customer,
            fep: r.fep,
            amount: r.amount,
            method: r.method,
            status: r.status,
            dateIso: r.dateIso,
            apiId: r.apiId,
            rawStatus: r.rawStatus,
            balanceDue: r.balanceDue,
          };
        }),
      );
      setInvoicesSource("api");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not load invoices", "error");
      const added = loadAddedInvoices();
      setRows(added.length > 0 ? [...added, ...DEFAULT_ROWS] : DEFAULT_ROWS);
      setInvoicesSource("demo");
    } finally {
      setInvoicesLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (tab === "transactions" || tab === "receipts") void refreshInvoices();
  }, [tab, refreshInvoices]);

  const refreshCustomers = useCallback(async () => {
    if (!getAccessToken()) {
      setCustomers(loadCustomers());
      setCustomersSource("local");
      setCustomersError(null);
      return;
    }
    setCustomersLoading(true);
    setCustomersError(null);
    try {
      const rows = await fetchCustomers();
      setCustomers(rows.map(customerDtoToDisplay));
      setCustomersSource("api");
    } catch (e) {
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
      setCustomersSource("local");
      setCustomersError(e instanceof Error ? e.message : "Could not load customers from server");
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "customers") void refreshCustomers();
  }, [tab, refreshCustomers]);

  useEffect(() => {
    if (tab === "customers" && searchParams.get("add") === "1") {
      setAddCustomerOpen(true);
      router.replace("/sales?tab=customers", { scroll: false });
    }
  }, [tab, router, searchParams]);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      router.replace("/sales?tab=transactions", { scroll: false });
    }
  }, [router, searchParams]);

  const viewRows = useMemo(
    () =>
      rows.map((r, i) => {
        const base = augmentRow(r, i);
        const ext = r as DemoInvoiceRow & { apiId?: string; rawStatus?: string; balanceDue?: number; dateIso?: string };
        return {
          ...base,
          dateIso: ext.dateIso ?? base.dateIso,
          apiId: ext.apiId,
          rawStatus: ext.rawStatus,
          balanceDue: ext.balanceDue,
        };
      }),
    [rows],
  );

  const openInvoicesForPayment = useMemo(
    () =>
      viewRows
        .filter((row) => row.apiId && (row.balanceDue ?? 0) > 0 && row.rawStatus !== "draft" && row.rawStatus !== "void")
        .map((row) => ({
          apiId: row.apiId!,
          invoiceCode: row.invoiceCode ?? row.id,
          customerName: row.customer,
          balanceDue: row.balanceDue ?? 0,
          currency: "USD",
        })),
    [viewRows],
  );

  const showSalespersonColumn = useMemo(() => {
    const perms = permCtx?.permissions ?? {};
    return canAccess(perms.users_roles, "view") || canAccess(perms.reports, "view");
  }, [permCtx?.permissions]);

  async function handleRecordPayment(payload: ReceivePaymentSubmitPayload) {
    const invoiceId = payload.invoiceApiId || paymentRow?.apiId;
    if (!invoiceId) {
      pushToast("Sign in and select a server invoice to record payments.", "info");
      return;
    }
    try {
      await addSalesInvoicePayment(invoiceId, receivePaymentToCreateBody(payload));
      pushToast("Payment recorded.", "success");
      await refreshInvoices();
      setReceiptsRefreshKey((k) => k + 1);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Payment failed", "error");
    }
  }

  const hasActiveFilters = useMemo(() => {
    const anyMethod = METHODS.some((m) => methodFilters[m]);
    return statusPaid || statusPending || anyMethod || Boolean(dateFrom) || Boolean(dateTo) || Boolean(salespersonFilter);
  }, [statusPaid, statusPending, methodFilters, dateFrom, dateTo, salespersonFilter]);

  function resetFilters() {
    setStatusPaid(false);
    setStatusPending(false);
    setMethodFilters(Object.fromEntries(METHODS.map((m) => [m, false])));
    setDateFrom("");
    setDateTo("");
    setSalespersonFilter("");
  }

  const salespersonOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const name = (r as DemoInvoiceRow).fep;
      if (name && name !== "-") set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = viewRows.filter((row) => {
      if (q) {
        const blob = `${row.id} ${row.customer} ${row.fep} ${row.method} ${row.amount} ${row.status}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (statusPaid || statusPending) {
        const match =
          (statusPaid && row.status === "Paid") ||
          (statusPending &&
            (row.status === "Pending" || row.status === "Partial" || row.status === "Open" || row.status === "Draft"));
        if (!match) return false;
      }
      const anyMethod = METHODS.some((m) => methodFilters[m]);
      if (anyMethod && !methodFilters[row.method]) return false;
      if (salespersonFilter && row.fep !== salespersonFilter) return false;
      if (dateFrom && row.dateIso < dateFrom) return false;
      if (dateTo && row.dateIso > dateTo) return false;
      return true;
    });

    const sorted = [...list];
    switch (sortId) {
      case "recommended":
        sorted.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || cmpInvoiceId(b.id, a.id));
        break;
      case "oldest":
        sorted.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || cmpInvoiceId(a.id, b.id));
        break;
      case "amount_high":
        sorted.sort((a, b) => b.amountNum - a.amountNum || cmpInvoiceId(b.id, a.id));
        break;
      case "amount_low":
        sorted.sort((a, b) => a.amountNum - b.amountNum || cmpInvoiceId(a.id, b.id));
        break;
      case "customer_az":
        sorted.sort((a, b) => a.customer.localeCompare(b.customer) || cmpInvoiceId(a.id, b.id));
        break;
      case "fep_az":
        sorted.sort((a, b) => a.fep.localeCompare(b.fep) || cmpInvoiceId(a.id, b.id));
        break;
      case "invoice_asc":
        sorted.sort((a, b) => cmpInvoiceId(a.id, b.id));
        break;
      case "invoice_desc":
        sorted.sort((a, b) => cmpInvoiceId(b.id, a.id));
        break;
      case "status_az":
        sorted.sort((a, b) => a.status.localeCompare(b.status) || cmpInvoiceId(a.id, b.id));
        break;
      default:
        break;
    }
    return sorted;
  }, [viewRows, search, sortId, statusPaid, statusPending, methodFilters, salespersonFilter, dateFrom, dateTo]);

  const exportCsv = useCallback(() => {
    const headers = ["Invoice", "Customer", "Salesperson", "Payment method", "Amount", "Status", "Date"];
    const lines = filteredSorted.map((r) =>
      [r.id, r.customer, r.fep, r.method, r.amount, r.status, r.dateIso].map(csvEscape).join(","),
    );
    const csv = [headers.join(","), ...lines].join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemstack-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSorted]);

  function openReceivePayment(initial?: ReceivePaymentInitial, row?: InvoiceView) {
    setPaymentInitial(initial);
    setPaymentRow(row ?? null);
    setPaymentOpen(true);
  }

  const addCustomerButton = (
    <button
      type="button"
      onClick={() => setAddCustomerOpen(true)}
      className="group relative inline-flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(241,90,36,0.4)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
    >
      <span
        className="absolute inset-0 bg-gradient-to-r from-[var(--gs-accent)] via-orange-500 to-rose-500"
        aria-hidden
      />
      <span className="relative flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.25} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
        <span>Add customer</span>
      </span>
    </button>
  );

  async function openViewCustomer(row: CustomerDisplayRow) {
    setViewCustomer(row);
    if (!getAccessToken() || customersSource !== "api") return;
    setViewCustomerLoading(true);
    try {
      const dto = await fetchCustomer(row.id);
      setViewCustomer(dto);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not load customer details", "error");
    } finally {
      setViewCustomerLoading(false);
    }
  }

  async function performDeleteCustomer(row: CustomerDisplayRow) {
    try {
      if (getAccessToken() && customersSource === "api") {
        await deleteCustomer(row.id);
        pushToast("Customer deleted.", "success");
      } else {
        const { removeCustomer } = await import("@/lib/demoCustomers");
        if (!removeCustomer(row.id)) throw new Error("Customer not found");
        pushToast("Customer removed from local list.", "info");
      }
      setDeleteCustomerTarget(null);
      await refreshCustomers();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not delete customer", "error");
    }
  }

  const customerModal = (
    <>
      <AddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onSave={async (payload) => {
          if (getAccessToken()) {
            await createCustomer({
              name: payload.name,
              email: payload.email || null,
              phone: payload.phone || null,
              notes: payload.detail || null,
            });
            pushToast("Customer saved on the server.", "success");
            await refreshCustomers();
          } else {
            const { addCustomer } = await import("@/lib/demoCustomers");
            addCustomer(payload);
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
            pushToast("Customer saved locally (sign in for server).", "info");
          }
        }}
      />
      <AddCustomerModal
        open={editCustomer !== null}
        onClose={() => setEditCustomer(null)}
        initial={
          editCustomer
            ? {
                id: editCustomer.id,
                name: editCustomer.name,
                email: editCustomer.email,
                phone: editCustomer.phone,
                detail: editCustomer.detail,
              }
            : null
        }
        onSave={async (payload) => {
          if (!editCustomer) return;
          if (getAccessToken() && customersSource === "api") {
            await updateCustomer(editCustomer.id, {
              name: payload.name,
              email: payload.email || null,
              phone: payload.phone || null,
              notes: payload.detail || null,
            });
            pushToast("Customer updated.", "success");
          } else {
            const { updateCustomer: updateLocal } = await import("@/lib/demoCustomers");
            updateLocal(editCustomer.id, payload);
            pushToast("Customer updated locally.", "info");
          }
          setEditCustomer(null);
          await refreshCustomers();
        }}
      />
      <AppDialog
        open={deleteCustomerTarget !== null}
        onClose={() => setDeleteCustomerTarget(null)}
        titleId="delete-customer-title"
        title="Delete this customer?"
        description={
          deleteCustomerTarget
            ? `“${deleteCustomerTarget.name}” will be removed permanently. This cannot be undone.`
            : undefined
        }
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setDeleteCustomerTarget(null)}
              className="rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteCustomerTarget) void performDeleteCustomer(deleteCustomerTarget);
              }}
              className="rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete customer
            </button>
          </div>
        }
      >
        {null}
      </AppDialog>
      <AppDialog
        open={viewCustomer !== null}
        onClose={() => setViewCustomer(null)}
        titleId="view-customer-title"
        title="Customer details"
        size="md"
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setViewCustomer(null)}
              className="rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Close
            </button>
          </div>
        }
      >
        {viewCustomerLoading ? (
          <p className="text-sm text-[var(--gs-muted)]">Loading…</p>
        ) : viewCustomer ? (
          <dl className="space-y-3 text-sm">
            {"customer_code" in viewCustomer && viewCustomer.customer_code ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Code</dt>
                <dd className="mt-1 font-mono text-[var(--gs-text)]">{viewCustomer.customer_code}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Name</dt>
              <dd className="mt-1 font-medium text-[var(--gs-text)]">{viewCustomer.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Email</dt>
              <dd className="mt-1 text-[var(--gs-text)]">
                {(viewCustomer.email ?? "") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Phone</dt>
              <dd className="mt-1 text-[var(--gs-text)]">{viewCustomer.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-[var(--gs-text)]">
                {("notes" in viewCustomer ? viewCustomer.notes : viewCustomer.detail) || "—"}
              </dd>
            </div>
            {"payment_terms" in viewCustomer && viewCustomer.payment_terms ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Payment terms</dt>
                <dd className="mt-1 text-[var(--gs-text)]">{viewCustomer.payment_terms}</dd>
              </div>
            ) : null}
            {"status" in viewCustomer ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Status</dt>
                <dd className="mt-1 capitalize text-[var(--gs-text)]">{viewCustomer.status}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </AppDialog>
    </>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["transactions", "Sales flow"],
            ["customers", "Customers"],
            ["receipts", "Receipts / payments"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => router.push(`/sales?tab=${id}`, { scroll: false })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              tab === id ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "customers" && (
        <>
        <ListPageLayout
          title="Customers"
          subtitle={
            customersSource === "api"
              ? "Buyer master data from the server — used on new invoices."
              : "Sign in to load customers from the server (otherwise demo list in browser)."
          }
          actions={addCustomerButton}
        >
          {customersError ? (
            <p className="border-b border-[var(--gs-border)] bg-red-50 px-5 py-3 text-sm text-red-800">{customersError}</p>
          ) : null}
          <div className="gs-table-scroll overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {customersLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[var(--gs-muted)]">
                      Loading customers…
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[var(--gs-muted)]">
                      No customers yet.{" "}
                      <button
                        type="button"
                        onClick={() => setAddCustomerOpen(true)}
                        className="font-semibold text-[var(--gs-accent)] hover:underline"
                      >
                        Add your first customer
                      </button>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--gs-hover)]/80">
                      <td className="px-5 py-3 font-mono text-xs text-[var(--gs-muted)]">{c.customer_code || "—"}</td>
                      <td className="px-5 py-3 font-medium text-[var(--gs-text)]">{c.name}</td>
                      <td className="px-5 py-3 text-[var(--gs-muted)]">{c.email || "—"}</td>
                      <td className="px-5 py-3 text-[var(--gs-muted)]">{c.phone || "—"}</td>
                      <td className="px-5 py-3 text-[var(--gs-muted)]">{c.detail || "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end">
                          <RowActionsMenu
                            align="right"
                            actions={[
                              { label: "View details", tone: "default", onSelect: () => void openViewCustomer(c) },
                              { label: "Edit", tone: "accent", onSelect: () => setEditCustomer(c) },
                              {
                                label: "New invoice",
                                tone: "accent",
                                onSelect: () =>
                                  router.push(`/sales/new?customerId=${encodeURIComponent(c.id)}`, { scroll: false }),
                              },
                              {
                                label: "Receive payment",
                                tone: "success",
                                onSelect: () =>
                                  openReceivePayment({
                                    customerName: c.name,
                                    amount: "",
                                  }),
                              },
                              { label: "Delete", tone: "danger", onSelect: () => setDeleteCustomerTarget(c) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ListPageLayout>
        {customerModal}
        </>
      )}

      {tab === "receipts" && (
        <SalesReceiptsWorkspace
          openInvoices={openInvoicesForPayment}
          showSalespersonColumn={showSalespersonColumn}
          refreshKey={receiptsRefreshKey}
          onReceivePayment={(initial) => {
            setPaymentRow(null);
            setPaymentInitial(initial);
            setPaymentOpen(true);
          }}
        />
      )}

      {tab === "transactions" && (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["Quotation", "Sales order", "Delivery note", "Sales invoice", "Sales return"] as const).map((doc) => (
          <button
            key={doc}
            type="button"
            onClick={() => pushToast(`Demo: open ${doc} list / create`, "info")}
            className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] shadow-sm hover:border-[var(--gs-accent)] hover:text-[var(--gs-accent)]"
          >
            {doc}
          </button>
        ))}
      </div>
    <ListPageLayout
      title="Sales documents"
      subtitle="Quotation → order → delivery → invoice → return. Invoices below are demo + browser-saved."
      actions={
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-2 md:items-center">
          <div className="flex flex-wrap gap-2 sm:contents">
            <button
              type="button"
              onClick={() => openReceivePayment()}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-white px-4 py-2.5 text-sm font-bold text-sky-900 shadow-sm ring-1 ring-sky-100/80 transition hover:border-sky-300 hover:from-sky-100/90 sm:min-h-0 sm:flex-initial sm:rounded-full"
            >
              <svg className="h-4 w-4 shrink-0 text-[var(--gs-muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Receive payment
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/40 transition hover:from-emerald-600 hover:to-emerald-700"
              aria-label="Export CSV"
              title="Export CSV"
            >
              <svg className="h-4 w-4 shrink-0 opacity-95" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
          </div>
          <CreateModuleLink href="/sales/new" variant="sales">
            New invoice
          </CreateModuleLink>
        </div>
      }
      toolbar={
        <ListToolbarInteractive
          placeholder="Search by invoice, customer, salesperson..."
          search={search}
          onSearchChange={setSearch}
          sortOptions={SORT_OPTIONS}
          sortValue={sortId}
          onSortChange={setSortId}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          filterChildren={
            <>
              <FilterSection title="Status">
                <FilterCheckboxGrid>
                  <FilterCheckboxRow label="Paid" checked={statusPaid} onChange={setStatusPaid} />
                  <FilterCheckboxRow label="Pending" checked={statusPending} onChange={setStatusPending} />
                </FilterCheckboxGrid>
              </FilterSection>
              {salespersonOptions.length > 0 ? (
                <FilterSection title="Salesperson">
                  <select
                    value={salespersonFilter}
                    onChange={(e) => setSalespersonFilter(e.target.value)}
                    className="gs-field"
                  >
                    <option value="">All salespeople</option>
                    {salespersonOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </FilterSection>
              ) : null}
              <FilterSection title="Payment method">
                <FilterCheckboxGrid>
                  {METHODS.map((m) => (
                    <FilterCheckboxRow
                      key={m}
                      label={m}
                      checked={methodFilters[m] ?? false}
                      onChange={(checked) => setMethodFilters((prev) => ({ ...prev, [m]: checked }))}
                    />
                  ))}
                </FilterCheckboxGrid>
              </FilterSection>
              <FilterSection title="Invoice date range">
                <FilterDateRangeRow from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} title="" />
              </FilterSection>
            </>
          }
        />
      }
    >
      <div className="gs-table-scroll overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--gs-border)]/80 bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Invoice</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Customer</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Salesperson</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Invoice status</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Amount</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Status</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--gs-muted)] sm:px-6 sm:py-14">
                  No invoices match your filters or search.
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => {
                const customerLines = customerTitleLines(row.customer);
                return (
                <tr key={row.id} className="hover:bg-[var(--gs-hover)]">
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-[var(--gs-text)] sm:px-6 sm:py-5">{row.id}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gs-hover)] text-sm font-semibold text-[var(--gs-muted)]">
                        {row.customer.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-semibold leading-tight text-[var(--gs-text)]">{customerLines.primary}</p>
                        {customerLines.secondary ? (
                          <p className="mt-1 truncate text-xs text-[var(--gs-muted)]">{customerLines.secondary}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[var(--gs-text)] sm:px-6 sm:py-5">{row.fep}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">{methodPill(row.method)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-[var(--gs-text)] sm:px-6 sm:py-5">{row.amount}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">{pill(row.status)}</td>
                  <td className="px-5 py-4 text-right sm:px-6 sm:py-5">
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        actions={[
                          {
                            label: "Receive payment",
                            tone: "success",
                            onSelect: () => openReceivePayment(rowToPaymentInitial(row), row),
                          },
                          {
                            label: "View invoice",
                            tone: "default",
                            onSelect: () => {
                              if (row.apiId) router.push(`/sales/${row.apiId}`);
                              else pushToast(`Demo invoice ${row.id}`, "info");
                            },
                          },
                          ...(row.apiId && row.rawStatus === "draft"
                            ? [
                                {
                                  label: "Post invoice",
                                  tone: "accent" as const,
                                  onSelect: () => {
                                    void (async () => {
                                      try {
                                        await postSalesInvoice(row.apiId!);
                                        pushToast("Invoice posted.", "success");
                                        await refreshInvoices();
                                      } catch (e) {
                                        pushToast(e instanceof Error ? e.message : "Post failed", "error");
                                      }
                                    })();
                                  },
                                },
                              ]
                            : []),
                          ...(row.apiId && row.rawStatus && !["draft", "void", "paid"].includes(row.rawStatus)
                            ? [
                                {
                                  label: "Void invoice",
                                  tone: "danger" as const,
                                  onSelect: () => {
                                    void (async () => {
                                      try {
                                        await voidSalesInvoice(row.apiId!);
                                        pushToast("Invoice voided.", "success");
                                        await refreshInvoices();
                                      } catch (e) {
                                        pushToast(e instanceof Error ? e.message : "Void failed", "error");
                                      }
                                    })();
                                  },
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </ListPageLayout>
    </>
      )}

      <ReceivePaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        initial={paymentInitial}
        openInvoices={openInvoicesForPayment}
        requireInvoiceSelection={Boolean(getAccessToken())}
        amountDue={
          paymentInitial?.invoiceId
            ? openInvoicesForPayment.find(
                (r) => r.apiId === paymentInitial.invoiceId || r.invoiceCode === paymentInitial.invoiceId,
              )?.balanceDue ??
              viewRows.find((r) => (r.apiId ?? r.id) === paymentInitial.invoiceId)?.balanceDue
            : paymentRow?.balanceDue
        }
        onSubmitPayment={(payload) => void handleRecordPayment(payload)}
      />
    </>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading sales...</div>}>
      <SalesPageContent />
    </Suspense>
  );
}