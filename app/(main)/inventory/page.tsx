"use client";

import { Suspense } from "react";

import { InventoryHubServer } from "@/components/inventory/InventoryHubServer";

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading inventory…</div>}>
      <InventoryHubServer />
    </Suspense>
  );
}
