"use client";

import { Suspense } from "react";

import { GeneralLedgerPage } from "@/components/general-ledger/GeneralLedgerPage";

export default function GeneralLedgerRoutePage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading…</div>}>
      <GeneralLedgerPage />
    </Suspense>
  );
}
