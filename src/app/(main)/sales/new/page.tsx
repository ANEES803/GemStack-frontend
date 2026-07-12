import { Suspense } from "react";

import { CreateInvoiceForm } from "@/components/sales/CreateInvoiceForm";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading invoice form…</div>}>
      <CreateInvoiceForm />
    </Suspense>
  );
}
