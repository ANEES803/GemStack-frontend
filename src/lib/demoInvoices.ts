import { formatMoney } from "@/lib/format";

export type DemoInvoiceRow = {
  id: string;
  customer: string;
  fep: string;
  amount: string;
  method: string;
  status: "Paid" | "Pending";
};

const STORAGE_KEY = "gemstack-demo-invoices-added";

export function appendDemoInvoice(row: DemoInvoiceRow): void {
  if (typeof window === "undefined") return;
  try {
    const prev = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]") as DemoInvoiceRow[];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([row, ...prev]));
  } catch {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([row]));
  }
}

export function loadAddedInvoices(): DemoInvoiceRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DemoInvoiceRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rowFromInvoicePayload(p: {
  invoiceNo: string;
  customer: string;
  holder: string;
  paymentMethod: string;
  amount: number;
  status: "Paid" | "Pending";
}): DemoInvoiceRow {
  return {
    id: p.invoiceNo.trim(),
    customer: p.customer.trim(),
    fep: p.holder.trim(),
    amount: formatMoney(p.amount, "USD"),
    method: p.paymentMethod,
    status: p.status,
  };
}
