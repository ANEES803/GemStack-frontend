"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchSalesReportSummary } from "@/lib/reportsHubApi";

export default function SalesReportPage() {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSalesReportSummary()
      .then((d) => {
        if (!cancelled) setPayload(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = (payload?.items as unknown[] | undefined) ?? [];
  const note = typeof payload?.note === "string" ? payload.note : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-[var(--gs-text)]">Sales report</h1>
        <p className="mt-2 text-sm text-[var(--gs-muted)]">{note ?? "Summary from the sales domain (when connected)."}</p>
      </header>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
        <p className="text-sm text-[var(--gs-muted)]">Rows: {items.length}</p>
      </div>
      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>
    </div>
  );
}
