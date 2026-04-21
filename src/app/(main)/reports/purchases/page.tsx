"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatMoney } from "@/lib/format";
import { fetchPurchaseReportSummary, type PurchaseSummaryItem } from "@/lib/reportsHubApi";

export default function PurchasesReportPage() {
  const [items, setItems] = useState<PurchaseSummaryItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPurchaseReportSummary()
      .then((d) => {
        if (!cancelled) setItems(d.items as PurchaseSummaryItem[]);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-[var(--gs-text)]">Purchase report</h1>
        <p className="mt-2 text-sm text-[var(--gs-muted)]">Purchase lots for your business (live data).</p>
      </header>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase text-[var(--gs-muted)]">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2 text-right">Cost</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gs-border)]">
            {items.map((row) => {
              const code = String(row.code ?? "");
              const supplier = String(row.supplier ?? "");
              const dateIso = String(row.date_iso ?? "");
              const cost = Number(row.cost ?? 0);
              const cur = String(row.currency ?? "USD");
              const status = String(row.status ?? "");
              return (
                <tr key={String(row.id)}>
                  <td className="px-3 py-2 font-mono">{code}</td>
                  <td className="px-3 py-2">{supplier}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{dateIso}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatMoney(cost, cur === "PKR" ? "PKR" : "USD")}</td>
                  <td className="px-3 py-2">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>
    </div>
  );
}
