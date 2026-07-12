/**
 * Authenticated API client for vendors and purchase lots (GemStack backend).
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

export type VendorDto = {
  id: string;
  business_id: string;
  vendor_code: string;
  legal_name: string;
  display_name: string;
  name: string;
  contact_person: string;
  contact_number: string;
  email: string | null;
  website: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  currency: string;
  opening_balance: string;
  withholding_tax_rate: string;
  bank_account_name: string;
  bank_account_no_or_iban: string;
  bank_name: string;
  swift_bic: string;
  status: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PurchaseLotSummary = {
  id: string;
  code: string;
  supplier: string;
  total_carats: string;
  cost: string;
  date_iso: string;
  status: string;
  paid_amount: string;
  currency: string;
  payment_terms: string;
  payment_status: string;
};

export type PurchaseLotLineDto = {
  id: string;
  sort_order: number;
  item_name: string;
  category: string;
  lot_details: string;
  line_type: string;
  quantity: string;
  uom: string;
  pieces: number;
  rate: string;
  line_total: string;
};

export type LotPaymentDto = {
  id: string;
  purchase_lot_id: string;
  amount: string;
  payment_method: string;
  paid_from: string;
  paid_to: string;
  bank_account: string;
  pay_date: string;
  reference_no: string;
  notes: string;
  created_at: string;
};

export type PurchaseLotDetail = {
  id: string;
  business_id: string;
  vendor_id: string;
  vendor_name: string;
  lot_code: string;
  receipt_date: string;
  due_date: string | null;
  payment_terms: string;
  reference_no: string;
  receipt_contact_email: string | null;
  memo: string;
  status: string;
  payment_status: string;
  currency: string;
  total_amount: string;
  paid_amount: string;
  posted_to_gl: boolean;
  lines: PurchaseLotLineDto[];
  payments: LotPaymentDto[];
  created_at: string;
  updated_at: string;
};

export type VendorOpenBalanceDto = {
  vendor_id: string;
  vendor_name: string;
  open_balance: string;
};

export type ApAgingLineDto = {
  vendor_id: string;
  vendor_name: string;
  lot_id: string;
  lot_code: string;
  open_amount: string;
  due_date: string;
  days_until_due: number;
  aging_bucket: string;
};

export async function fetchVendorOpenBalances(): Promise<VendorOpenBalanceDto[]> {
  const response = await apiAuthFetch(`${API_BASE_URL}/vendors/open-balances`, { method: "GET" });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as VendorOpenBalanceDto[];
}

export async function fetchApAging(asOfIso: string): Promise<ApAgingLineDto[]> {
  const response = await apiAuthFetch(`${API_BASE_URL}/vendors/ap-aging?as_of=${encodeURIComponent(asOfIso)}`, {
    method: "GET",
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as ApAgingLineDto[];
}

export async function fetchVendors(includeInactive = false): Promise<VendorDto[]> {
  const response = await apiAuthFetch(`${API_BASE_URL}/vendors?include_inactive=${includeInactive ? "true" : "false"}`, { method: "GET" });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as VendorDto[];
}

export type VendorUpsertBody = {
  vendor_code?: string | null;
  legal_name?: string | null;
  display_name?: string | null;
  name: string;
  contact_person?: string | null;
  contact_number: string;
  email?: string | null;
  website?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tax_id?: string | null;
  payment_terms?: string | null;
  currency?: string | null;
  opening_balance?: number | null;
  withholding_tax_rate?: number | null;
  bank_account_name?: string | null;
  bank_account_no_or_iban?: string | null;
  bank_name?: string | null;
  swift_bic?: string | null;
  status?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
};

export async function createVendor(body: VendorUpsertBody): Promise<VendorDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/vendors`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as VendorDto;
}

export async function updateVendor(vendorId: string, body: Partial<VendorUpsertBody>): Promise<VendorDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/vendors/${vendorId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as VendorDto;
}

export async function archiveVendor(vendorId: string): Promise<VendorDto> {
  return updateVendor(vendorId, { status: "inactive", is_active: false });
}

export async function suggestNextLotCode(): Promise<string> {
  const response = await apiAuthFetch(`${API_BASE_URL}/purchase-lots/next-code`, { method: "GET" });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { lot_code: string };
  return data.lot_code;
}

export async function listPurchaseLotSummaries(): Promise<PurchaseLotSummary[]> {
  const response = await apiAuthFetch(`${API_BASE_URL}/purchase-lots`, { method: "GET" });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PurchaseLotSummary[];
}

export type CreatePurchaseLotBody = {
  vendor_id: string;
  lot_code?: string | null;
  receipt_date: string;
  due_date?: string | null;
  payment_terms: string;
  reference_no: string;
  receipt_contact_email?: string | null;
  memo: string;
  currency?: string;
  lines: {
    item_name: string;
    category: string;
    lot_details: string;
    line_type: string;
    quantity: number;
    uom: string;
    pieces: number;
    rate: number;
  }[];
};

export async function createPurchaseLot(body: CreatePurchaseLotBody): Promise<PurchaseLotDetail> {
  const response = await apiAuthFetch(`${API_BASE_URL}/purchase-lots`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PurchaseLotDetail;
}

export async function getPurchaseLotByCode(lotCode: string, signal?: AbortSignal): Promise<PurchaseLotDetail> {
  const enc = encodeURIComponent(lotCode.trim());
  const response = await apiAuthFetch(`${API_BASE_URL}/purchase-lots/by-code/${enc}`, { method: "GET", signal });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PurchaseLotDetail;
}

export type PatchPurchaseLotBody = {
  vendor_id?: string;
  lot_code?: string;
  receipt_date?: string;
  due_date?: string | null;
  payment_terms?: string;
  reference_no?: string;
  receipt_contact_email?: string | null;
  memo?: string;
  currency?: string;
  lines?: CreatePurchaseLotBody["lines"];
};

export async function patchPurchaseLot(lotId: string, body: PatchPurchaseLotBody): Promise<PurchaseLotDetail> {
  const response = await apiAuthFetch(`${API_BASE_URL}/purchase-lots/${lotId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PurchaseLotDetail;
}

export type AddLotPaymentBody = {
  amount: number;
  payment_method: string;
  paid_from: string;
  paid_to: string;
  bank_account: string;
  pay_date: string;
  reference_no: string;
  notes: string;
  gl_bank_account_id?: string | null;
};

export async function deletePurchaseLot(lotId: string): Promise<void> {
  const response = await apiAuthFetch(`${API_BASE_URL}/purchase-lots/${lotId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function addPurchaseLotPayment(lotId: string, body: AddLotPaymentBody): Promise<PurchaseLotDetail> {
  const response = await apiAuthFetch(`${API_BASE_URL}/purchase-lots/${lotId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PurchaseLotDetail;
}

/** Options for inventory “rough lot” dropdown. */
export async function fetchRoughLotPickerOptions(): Promise<{ code: string; supplier: string }[]> {
  const rows = await listPurchaseLotSummaries();
  return rows.map((r) => ({ code: r.code, supplier: r.supplier }));
}
