"use client";

import { Suspense } from "react";

import { AccountingWorkspace } from "@/components/accounting/AccountingWorkspace";

export default function AccountingPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-slate-500">Loading accounting…</div>}>
      <AccountingWorkspace />
    </Suspense>
  );
}
