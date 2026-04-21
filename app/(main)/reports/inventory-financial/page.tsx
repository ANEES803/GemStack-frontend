"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatMoney } from "@/lib/format";
import { fetchInventoryFinancialSummary } from "@/lib/reportsHubApi";

export default function InventoryFinancialReportPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchInventoryFinancialSummary()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cur = String(data?.functional_currency ?? "USD");
  const cost = Number.parseFloat(String(data?.total_cost_basis ?? "0")) || 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-[var(--gs-text)]">Inventory (financial)</h1>
        <p className="mt-2 text-sm text-[var(--gs-muted)]">Stock valuation snapshot from active stock lines.</p>
      </header>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      {data ? (
        <dl className="grid gap-3 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--gs-muted)]">Stock lines</dt>
            <dd className="font-mono font-semibold">{String(data.stock_line_count)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--gs-muted)]">Total pieces</dt>
            <dd className="font-mono font-semibold">{String(data.total_pieces)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--gs-muted)]">Total cost basis</dt>
            <dd className="font-mono font-semibold">{formatMoney(cost, cur === "PKR" ? "PKR" : "USD")}</dd>
          </div>
        </dl>
      ) : null}
      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>
    </div>
  );
}
