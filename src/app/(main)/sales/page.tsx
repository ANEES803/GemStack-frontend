"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ReceivePaymentModal, type ReceivePaymentInitial } from "@/components/sales/ReceivePaymentModal";
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
import { type DemoInvoiceRow, loadAddedInvoices } from "@/lib/demoInvoices";

const DEFAULT_ROWS: DemoInvoiceRow[] = [
  { id: "INV-1042", customer: "Facebook — batch A", fep: "A. Khan", amount: "$2,840.00", method: "PayPal", status: "Paid" },
  { id: "INV-1041", customer: "Direct — Zurich", fep: "M. Ali", amount: "$4,120.00", method: "Bank", status: "Pending" },
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

type InvoiceView = DemoInvoiceRow & { dateIso: string; amountNum: number };

function augmentRow(row: DemoInvoiceRow, index: number): InvoiceView {
  const amountNum = parseFloat(row.amount.replace(/[$,]/g, "")) || 0;
  const dateIso = INVOICE_DATE_ISO[row.id] ?? `2026-03-${String(25 - index).padStart(2, "0")}`;
  return { ...row, dateIso, amountNum };
}

const SORT_OPTIONS: SortOption[] = [
  { id: "recommended", label: "Recommended (newest first)" },
  { id: "oldest", label: "Oldest invoice first" },
  { id: "amount_high", label: "Amount (high → low)" },
  { id: "amount_low", label: "Amount (low → high)" },
  { id: "customer_az", label: "Customer (A → Z)" },
  { id: "fep_az", label: "FEP (A → Z)" },
  { id: "invoice_asc", label: "Invoice # (A → Z)" },
  { id: "invoice_desc", label: "Invoice # (Z → A)" },
  { id: "status_az", label: "Status (A → Z)" },
];

const METHODS = ["PayPal", "Bank", "Cash", "Wire (SWIFT)", "Other"] as const;

function pill(status: DemoInvoiceRow["status"]) {
  if (status === "Paid") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
      Pending
    </span>
  );
}

function methodPill(method: string) {
  return (
    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900 ring-1 ring-sky-100/90">
      {method}
    </span>
  );
}

function customerTitleLines(label: string) {
  const parts = label.split("—");
  if (parts.length < 2) return { primary: label.trim(), secondary: undefined as string | undefined };
  const secondary = parts
    .slice(1)
    .join("—")
    .trim();
  return { primary: parts[0]!.trim(), secondary: secondary || undefined };
}

function rowToPaymentInitial(row: DemoInvoiceRow): ReceivePaymentInitial {
  return {
    invoiceId: row.id,
    customerName: row.customer,
    amount: row.amount.replace(/[$,]/g, "").trim(),
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

export default function SalesPage() {
  const [rows, setRows] = useState<DemoInvoiceRow[]>(DEFAULT_ROWS);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInitial, setPaymentInitial] = useState<ReceivePaymentInitial | undefined>(undefined);

  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("recommended");
  const [statusPaid, setStatusPaid] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [methodFilters, setMethodFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(METHODS.map((m) => [m, false])),
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const added = loadAddedInvoices();
    if (added.length > 0) setRows([...added, ...DEFAULT_ROWS]);
  }, []);

  const viewRows = useMemo(() => rows.map((r, i) => augmentRow(r, i)), [rows]);

  const hasActiveFilters = useMemo(() => {
    const anyMethod = METHODS.some((m) => methodFilters[m]);
    return statusPaid || statusPending || anyMethod || Boolean(dateFrom) || Boolean(dateTo);
  }, [statusPaid, statusPending, methodFilters, dateFrom, dateTo]);

  function resetFilters() {
    setStatusPaid(false);
    setStatusPending(false);
    setMethodFilters(Object.fromEntries(METHODS.map((m) => [m, false])));
    setDateFrom("");
    setDateTo("");
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = viewRows.filter((row) => {
      if (q) {
        const blob = `${row.id} ${row.customer} ${row.fep} ${row.method} ${row.amount} ${row.status}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (statusPaid || statusPending) {
        const match =
          (statusPaid && row.status === "Paid") || (statusPending && row.status === "Pending");
        if (!match) return false;
      }
      const anyMethod = METHODS.some((m) => methodFilters[m]);
      if (anyMethod && !methodFilters[row.method]) return false;
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
  }, [viewRows, search, sortId, statusPaid, statusPending, methodFilters, dateFrom, dateTo]);

  const exportCsv = useCallback(() => {
    const headers = ["Invoice", "Customer", "FEP", "Payment method", "Amount", "Status", "Date"];
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

  function openReceivePayment(initial?: ReceivePaymentInitial) {
    setPaymentInitial(initial);
    setPaymentOpen(true);
  }

  return (
    <ListPageLayout
      title="Invoices"
      subtitle="Record gemstone sales, channels, and payments. New invoices are saved in this browser (demo)."
      decorativeEnd={
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 shadow-sm ring-1 ring-sky-200/70">
          <svg className="h-7 w-7 text-sky-900" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      }
      actions={
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:gap-2 md:items-center">
          <div className="flex flex-wrap gap-2 sm:contents">
            <button
              type="button"
              onClick={() => openReceivePayment()}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-white px-4 py-2.5 text-sm font-bold text-sky-900 shadow-sm ring-1 ring-sky-100/80 transition hover:border-sky-300 hover:from-sky-100/90 sm:min-h-0 sm:flex-initial sm:rounded-full"
            >
              <svg className="h-4 w-4 shrink-0 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
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
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/40 transition hover:from-emerald-600 hover:to-emerald-700 sm:min-h-0 sm:flex-initial sm:rounded-full"
            >
              <svg className="h-4 w-4 shrink-0 opacity-95" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
          </div>
          <CreateModuleLink href="/sales/new" variant="sales">
            New invoice
          </CreateModuleLink>
        </div>
      }
      toolbar={
        <ListToolbarInteractive
          placeholder="Search by invoice, customer, FEP…"
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
      <ReceivePaymentModal open={paymentOpen} onClose={() => setPaymentOpen(false)} initial={paymentInitial} />

      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Invoice</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Customer</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">FEP</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Payment</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Amount</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Status</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500 sm:px-6 sm:py-14">
                  No invoices match your filters or search.
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => {
                const customerLines = customerTitleLines(row.customer);
                return (
                <tr key={row.id} className="bg-white hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-sm font-semibold text-slate-900 sm:px-6 sm:py-5">{row.id}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                        {row.customer.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-semibold leading-tight text-slate-900">{customerLines.primary}</p>
                        {customerLines.secondary ? (
                          <p className="mt-1 truncate text-xs text-slate-500">{customerLines.secondary}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-700 sm:px-6 sm:py-5">{row.fep}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">{methodPill(row.method)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900 sm:px-6 sm:py-5">{row.amount}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">{pill(row.status)}</td>
                  <td className="px-5 py-4 text-right sm:px-6 sm:py-5">
                    <div className="flex items-center justify-end">
                      <RowActionsMenu
                        actions={[
                          {
                            label: "Receive payment",
                            tone: "success",
                            onSelect: () => openReceivePayment(rowToPaymentInitial(row)),
                          },
                          { label: "View invoice", tone: "default", onSelect: () => window.alert(`Demo: open ${row.id}`) },
                          { label: "Edit invoice", tone: "accent", onSelect: () => window.alert("Demo: edit invoice") },
                          { label: "Download PDF", tone: "info", onSelect: () => window.alert("Demo: PDF export") },
                          { label: "Delete", tone: "danger", onSelect: () => window.alert("Demo: delete invoice") },
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
  );
}
