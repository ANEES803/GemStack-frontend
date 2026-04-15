"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";
import { fetchVendorOpenBalances, fetchVendors, type VendorDto } from "@/lib/purchaseLotsApi";

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

export function PurchasesWorkspace() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get("tab") as Tab | null) ?? "flow";

  useEffect(() => {
    if (!sp.get("tab")) router.replace("/purchases?tab=flow", { scroll: false });
  }, [router, sp]);

  const setTab = (t: Tab) => router.push(`/purchases?tab=${t}`, { scroll: false });

  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorRows, setVendorRows] = useState<VendorUiRow[]>([]);
  const [vendorsError, setVendorsError] = useState<string | null>(null);

  const refreshVendorBalances = useCallback(async () => {
    try {
      const [vendors, balances] = await Promise.all([fetchVendors(), fetchVendorOpenBalances()]);
      const balMap = new Map(balances.map((b) => [b.vendor_id, Number.parseFloat(b.open_balance) || 0]));
      setVendorRows(
        vendors.map((v: VendorDto) => ({
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
  }, []);

  useEffect(() => {
    if (tab === "vendors" || tab === "payments") void refreshVendorBalances();
  }, [tab, refreshVendorBalances]);

  const vendors = useMemo(() => {
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return vendorRows;
    return vendorRows.filter((v) => `${v.name} ${v.email}`.toLowerCase().includes(q));
  }, [vendorSearch, vendorRows]);

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
              onClick={() => window.alert("Demo: start new purchase requisition")}
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
                onClick={() => window.alert(`Demo: open ${s.label}`)}
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
              onClick={() => window.alert("Demo: add vendor drawer")}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              + New vendor
            </button>
          </div>
          <div className="mt-4">
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
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Open balance</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-[var(--gs-muted)]">
                      No vendors yet.
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-[var(--gs-hover)]/80">
                      <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{v.name}</td>
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{v.email || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--gs-text)]">{formatMoney(v.balance, "USD")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}