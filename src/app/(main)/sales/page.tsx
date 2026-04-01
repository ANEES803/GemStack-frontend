"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ListPageLayout, ListToolbar } from "@/components/ui/ListPageLayout";
import { type DemoInvoiceRow, loadAddedInvoices } from "@/lib/demoInvoices";

const DEFAULT_ROWS: DemoInvoiceRow[] = [
  { id: "INV-1042", customer: "Facebook — batch A", fep: "A. Khan", amount: "$2,840.00", method: "PayPal", status: "Paid" },
  { id: "INV-1041", customer: "Direct — Zurich", fep: "M. Ali", amount: "$4,120.00", method: "Bank", status: "Pending" },
  { id: "INV-1040", customer: "PayPal checkout", fep: "A. Khan", amount: "$910.00", method: "PayPal", status: "Paid" },
  { id: "INV-1039", customer: "Bank transfer", fep: "S. Noor", amount: "$6,400.00", method: "Bank", status: "Paid" },
];

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

export default function SalesPage() {
  const [rows, setRows] = useState<DemoInvoiceRow[]>(DEFAULT_ROWS);

  useEffect(() => {
    const added = loadAddedInvoices();
    if (added.length > 0) setRows([...added, ...DEFAULT_ROWS]);
  }, []);

  return (
    <ListPageLayout
      title="Invoices"
      subtitle="Record gemstone sales, channels, and payments. New invoices are saved in this browser (demo)."
      actions={
        <>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Export CSV
          </button>
          <Link
            href="/sales/new"
            className="inline-flex items-center justify-center rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            New invoice
          </Link>
        </>
      }
      toolbar={<ListToolbar placeholder="Search by invoice, customer, FEP…" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3.5">Invoice</th>
              <th className="px-6 py-3.5">Customer</th>
              <th className="px-6 py-3.5">FEP</th>
              <th className="px-6 py-3.5">Payment</th>
              <th className="px-6 py-3.5 text-right">Amount</th>
              <th className="px-6 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="bg-white hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-medium text-slate-900">{row.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                      {row.customer.slice(0, 1)}
                    </span>
                    <span className="font-medium text-slate-900">{row.customer}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{row.fep}</td>
                <td className="px-6 py-4 text-slate-600">{row.method}</td>
                <td className="px-6 py-4 text-right font-semibold text-slate-900">{row.amount}</td>
                <td className="px-6 py-4">{pill(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPageLayout>
  );
}
