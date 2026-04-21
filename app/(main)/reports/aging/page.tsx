"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchAgingSummary } from "@/lib/reportsHubApi";

export default function AgingReportPage() {
  const [kind, setKind] = useState<"ar" | "ap">("ar");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchAgingSummary(kind)
      .then((d) => {
        if (!cancelled) setPayload(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const note = typeof payload?.note === "string" ? payload.note : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-[var(--gs-text)]">Aging (AR / AP)</h1>
        <p className="mt-2 text-sm text-[var(--gs-muted)]">{note ?? "Open balance aging when AR/AP APIs are available."}</p>
      </header>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind("ar")}
          className={`rounded-full px-4 py-2 text-xs font-semibold ${kind === "ar" ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)]"}`}
        >
          AR
        </button>
        <button
          type="button"
          onClick={() => setKind("ap")}
          className={`rounded-full px-4 py-2 text-xs font-semibold ${kind === "ap" ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)]"}`}
        >
          AP
        </button>
      </div>
      {err ? <p className="text-sm text-red-700">{err}</p> : null}
      <p className="text-center text-xs text-[var(--gs-muted)]">
        <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
          ← Back to report hub
        </Link>
      </p>
    </div>
  );
}
