"use client";

import { Suspense } from "react";

import { InventoryHub } from "@/components/inventory/InventoryHub";

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-slate-500">Loading inventory…</div>}>
      <InventoryHub />
    </Suspense>
  );
}
