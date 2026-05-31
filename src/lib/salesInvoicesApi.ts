/**
 * Sales invoices API (inventory-linked lines, post, pay, void).
 */

import { apiAuthFetch } from "@/lib/authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function parseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
  const { detail } = body;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string") return first.msg;
  }
  return `Request failed (${response.status})`;
}

export type SalesInvoiceLineDto = {
  id: string;
  stock_unit_id: string;
  sort_order: number;
  description: string;
  unit_price: string;
  line_total: string;
  cost_basis_snapshot: string;
  primary_uom_qty_snapshot: string;
  pieces_snapshot: number;
  public_code_snapshot: string;
};

export type SalesInvoiceSummaryDto = {
  id: string;
  customer_id: string;
  customer_name: string;
  invoice_code: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  reference_no: string;
  posted_at: string | null;
  created_at: string;
};

export type SalesInvoiceDetailDto = SalesInvoiceSummaryDto & {
  business_id: string;
  payment_terms: string;
  memo: string;
  voided_at: string | null;
  posted_to_gl: boolean;
  lines: SalesInvoiceLineDto[];
  payments: {
    id: string;
    customer_id: string;
    amount: string;
    payment_method: string;
    pay_date: string;
    reference_no: string;
    notes: string;
    gl_bank_account_id: string | null;
    created_at: string;
  }[];
  updated_at: string;
};

export type SalesInvoiceLineCreateBody = {
  stock_unit_id: string;
  description?: string;
  unit_price: number | string;
  sort_order?: number;
};

export type SalesInvoiceCreateBody = {
  customer_id: string;
  invoice_code?: string | null;
  invoice_date: string;
  due_date?: string | null;
  payment_terms?: string;
  reference_no?: string;
  memo?: string;
  currency?: string;
  lines: SalesInvoiceLineCreateBody[];
};

export type CustomerPaymentCreateBody = {
  amount: number | string;
  payment_method: string;
  pay_date: string;
  reference_no?: string;
  notes?: string;
  gl_bank_account_id?: string | null;
};

export async function fetchSalesInvoices(signal?: AbortSignal): Promise<SalesInvoiceSummaryDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceSummaryDto[];
}

export async function fetchNextInvoiceCode(signal?: AbortSignal): Promise<string> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices/next-code`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { invoice_code: string };
  return data.invoice_code;
}

export async function fetchSalesInvoice(invoiceId: string, signal?: AbortSignal): Promise<SalesInvoiceDetailDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices/${invoiceId}`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceDetailDto;
}

export async function createSalesInvoice(body: SalesInvoiceCreateBody, signal?: AbortSignal): Promise<SalesInvoiceDetailDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceDetailDto;
}

export async function updateSalesInvoice(
  invoiceId: string,
  body: Partial<SalesInvoiceCreateBody>,
  signal?: AbortSignal,
): Promise<SalesInvoiceDetailDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices/${invoiceId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceDetailDto;
}

export async function postSalesInvoice(invoiceId: string, signal?: AbortSignal): Promise<SalesInvoiceDetailDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices/${invoiceId}/post`, { method: "POST", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceDetailDto;
}

export async function voidSalesInvoice(invoiceId: string, signal?: AbortSignal): Promise<SalesInvoiceDetailDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices/${invoiceId}/void`, { method: "POST", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceDetailDto;
}

export async function addSalesInvoicePayment(
  invoiceId: string,
  body: CustomerPaymentCreateBody,
  signal?: AbortSignal,
): Promise<SalesInvoiceDetailDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceDetailDto;
}

export async function deleteDraftSalesInvoice(invoiceId: string, signal?: AbortSignal): Promise<void> {
  const res = await apiAuthFetch(`${API_BASE_URL}/sales-invoices/${invoiceId}`, { method: "DELETE", signal });
  if (!res.ok) throw new Error(await parseError(res));
}

export function summaryToListRow(d: SalesInvoiceSummaryDto) {
  const paid = d.status === "paid";
  return {
    id: d.invoice_code,
    apiId: d.id,
    invoiceCode: d.invoice_code,
    customer: d.customer_name,
    fep: d.reference_no || "-",
    amount: `$${Number(d.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    method: d.status,
    status: paid ? ("Paid" as const) : ("Pending" as const),
    dateIso: d.invoice_date,
    rawStatus: d.status,
    balanceDue: Number(d.balance_due),
  };
}
