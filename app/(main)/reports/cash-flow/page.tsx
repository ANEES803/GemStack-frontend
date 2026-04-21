"use client";

import { Suspense } from "react";

import { CashFlowPage } from "@/components/cash-flow/CashFlowPage";

export default function CashFlowRoutePage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading…</div>}>
      <CashFlowPage />
    </Suspense>
  );
}
