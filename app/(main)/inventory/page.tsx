"use client";

import { Suspense } from "react";

import { InventoryHub } from "@/components/inventory/InventoryHub";
// import { InventoryHubServer } from "@/components/inventory/InventoryHubServer";

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading inventory…</div>}>
      <InventoryHub />
      {/* <InventoryHubServer /> */}
    </Suspense>
  );
}
