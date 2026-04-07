"use client";

import { Suspense } from "react";

import { PurchasesWorkspace } from "@/components/purchases/PurchasesWorkspace";

export default function PurchasesPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-slate-500">Loading purchases…</div>}>
      <PurchasesWorkspace />
    </Suspense>
  );
}
