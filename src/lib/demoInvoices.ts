import { formatMoney } from "@/lib/format";

export type DemoInvoiceRow = {
  id: string;
  customer: string;
  fep: string;
  amount: string;
  method: string;
  status: "Paid" | "Pending";
  /** Set for user-added rows so filters/sort use the real invoice date. */
  dateIso?: string;
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
  /** Reference / parcel; shown in FEP column when holder is unset or placeholder. */
  parcelNo?: string;
  dateIso?: string;
  paymentMethod: string;
  amount: number;
  status: "Paid" | "Pending";
}): DemoInvoiceRow {
  const holder = p.holder.trim();
  const parcel = p.parcelNo?.trim() ?? "";
  const fep = holder && holder !== "-" ? holder : parcel || "-";
  return {
    id: p.invoiceNo.trim(),
    customer: p.customer.trim(),
    fep,
    amount: formatMoney(p.amount, "USD"),
    method: p.paymentMethod,
    status: p.status,
    ...(p.dateIso?.trim() ? { dateIso: p.dateIso.trim() } : {}),
  };
}
