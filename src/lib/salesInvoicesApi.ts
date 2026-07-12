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
  salesperson_id: string | null;
  salesperson_name: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  posted_at: string | null;
  created_at: string;
};

export type SalespersonSalesReportRow = {
  salesperson_id: string | null;
  salesperson_name: string;
  invoice_count: number;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
};

export type SalespersonSalesReport = {
  date_from: string | null;
  date_to: string | null;
  rows: SalespersonSalesReportRow[];
};

export type SalesInvoiceListFilters = {
  salespersonId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
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
    gl_bank_account_name?: string | null;
    posted_to_gl?: boolean;
    journal_entry_id?: string | null;
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
  salesperson_id?: string | null;
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

export type CustomerPaymentListItemDto = {
  id: string;
  customer_id: string;
  customer_name: string;
  sales_invoice_id: string;
  invoice_code: string;
  allocation_amount: string;
  amount: string;
  payment_method: string;
  pay_date: string;
  reference_no: string;
  notes: string;
  currency: string;
  gl_bank_account_id: string | null;
  gl_bank_account_name: string | null;
  salesperson_id: string | null;
  salesperson_name: string | null;
  posted_to_gl: boolean;
  journal_entry_id: string | null;
  created_at: string;
};

export type CustomerPaymentListDto = {
  items: CustomerPaymentListItemDto[];
  limit: number;
  offset: number;
};

export type CustomerOpenBalanceDto = {
  customer_id: string;
  customer_name: string;
  open_balance: string;
  oldest_due_date: string | null;
};

export type CustomerPaymentListFilters = {
  customerId?: string | null;
  invoiceId?: string | null;
  paymentMethod?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export type ReceivePaymentSubmitPayload = {
  invoiceApiId: string;
  amount: number;
  method: string;
  date: string;
  referenceNo?: string;
  notes?: string;
  glBankAccountId?: string | null;
};

export function mapReceivePaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    Cash: "cash",
    "Bank Transfer": "bank",
    "Direct to Bank Account": "bank",
    Cheque: "cheque",
    Online: "bank",
  };
  return methodMap[method] ?? "bank";
}

export function receivePaymentToCreateBody(payload: ReceivePaymentSubmitPayload): CustomerPaymentCreateBody {
  return {
    amount: payload.amount,
    payment_method: mapReceivePaymentMethod(payload.method),
    pay_date: payload.date,
    reference_no: payload.referenceNo ?? "",
    notes: payload.notes ?? "",
    gl_bank_account_id: payload.glBankAccountId ?? null,
  };
}

export async function fetchSalesInvoices(
  filters?: SalesInvoiceListFilters,
  signal?: AbortSignal,
): Promise<SalesInvoiceSummaryDto[]> {
  const params = new URLSearchParams();
  if (filters?.salespersonId) params.set("salesperson_id", filters.salespersonId);
  if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters?.dateTo) params.set("date_to", filters.dateTo);
  const query = params.toString();
  const url = `${API_BASE_URL}/sales-invoices${query ? `?${query}` : ""}`;
  const res = await apiAuthFetch(url, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalesInvoiceSummaryDto[];
}

export async function fetchSalesByPerson(
  filters?: { dateFrom?: string | null; dateTo?: string | null },
  signal?: AbortSignal,
): Promise<SalespersonSalesReport> {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters?.dateTo) params.set("date_to", filters.dateTo);
  const query = params.toString();
  const url = `${API_BASE_URL}/sales-invoices/reports/by-salesperson${query ? `?${query}` : ""}`;
  const res = await apiAuthFetch(url, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SalespersonSalesReport;
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

export async function fetchCustomerPayments(
  filters?: CustomerPaymentListFilters,
  signal?: AbortSignal,
): Promise<CustomerPaymentListDto> {
  const params = new URLSearchParams();
  if (filters?.customerId) params.set("customer_id", filters.customerId);
  if (filters?.invoiceId) params.set("invoice_id", filters.invoiceId);
  if (filters?.paymentMethod) params.set("payment_method", filters.paymentMethod);
  if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters?.dateTo) params.set("date_to", filters.dateTo);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const query = params.toString();
  const url = `${API_BASE_URL}/customer-payments${query ? `?${query}` : ""}`;
  const res = await apiAuthFetch(url, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CustomerPaymentListDto;
}

export async function fetchCustomerOpenBalances(signal?: AbortSignal): Promise<CustomerOpenBalanceDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/customers/open-balances`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CustomerOpenBalanceDto[];
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
  const statusLabel =
    d.status === "paid"
      ? ("Paid" as const)
      : d.status === "partially_paid"
        ? ("Partial" as const)
        : d.status === "posted"
          ? ("Open" as const)
          : d.status === "draft"
            ? ("Draft" as const)
            : ("Pending" as const);
  return {
    id: d.invoice_code,
    apiId: d.id,
    invoiceCode: d.invoice_code,
    customer: d.customer_name,
    fep: d.salesperson_name || "-",
    amount: `$${Number(d.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    method: statusLabel,
    status: paid ? ("Paid" as const) : statusLabel === "Partial" ? ("Partial" as const) : ("Pending" as const),
    dateIso: d.invoice_date,
    rawStatus: d.status,
    balanceDue: Number(d.balance_due),
  };
}
