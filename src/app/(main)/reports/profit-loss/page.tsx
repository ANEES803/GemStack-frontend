"use client";

import { Suspense } from "react";

import { ProfitLossPage } from "@/components/profit-loss/ProfitLossPage";

export default function ProfitLossRoutePage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading…</div>}>
      <ProfitLossPage />
    </Suspense>
  );
}
