/**
 * General ledger API (chart of accounts, journals, settings, balance sheet).
 */

import { getAccessToken } from "@/lib/authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const FETCH_TIMEOUT_MS = 15_000;

function mergeAbortSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
  if (!a) return b;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (a.aborted || b.aborted) {
    controller.abort();
    return controller.signal;
  }
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS);
  try {
    const signal = mergeAbortSignals(init.signal ?? undefined, timeoutController.signal);
    return await fetch(url, { ...init, signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

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

export type GlAccountDto = {
  id: string;
  business_id: string;
  code: string;
  name: string;
  account_type: string;
  account_subtype: string | null;
  parent_id: string | null;
  is_group: boolean;
  allow_posting: boolean;
  is_active: boolean;
  balance: string;
  created_at: string;
  updated_at: string;
};

export type GlSettingsDto = {
  business_id: string;
  functional_currency: string;
  account_inventory_id: string | null;
  account_purchases_id: string | null;
  account_ap_id: string | null;
  account_default_bank_id: string | null;
  purchase_receipt_mode: string;
  auto_post_purchase_lots: boolean;
  updated_at: string;
};

export type JournalLineDto = {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string;
  sort_order: number;
};

export type JournalSummaryDto = {
  id: string;
  entry_date: string;
  reference: string;
  memo: string;
  tag: string;
  status: string;
  source_type: string | null;
  source_id: string | null;
  total_debit: string;
  total_credit: string;
  vendor_id: string | null;
  vendor_name: string | null;
  lot_id: string | null;
  lot_code: string | null;
  source_kind: string | null;
  created_at: string;
};

export type BalanceSheetLineDto = {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id: string | null;
  is_group: boolean;
  balance: string;
};

export async function fetchBalanceSheet(asOfIso: string): Promise<BalanceSheetLineDto[]> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/gl/reports/balance-sheet?as_of=${encodeURIComponent(asOfIso)}`,
    { headers: authHeaders() },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as BalanceSheetLineDto[];
}

export type JournalDetailDto = {
  id: string;
  business_id: string;
  entry_date: string;
  reference: string;
  memo: string;
  tag: string;
  status: string;
  source_type: string | null;
  source_id: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  lot_id: string | null;
  lot_code: string | null;
  source_kind: string | null;
  created_at: string;
  updated_at: string;
  lines: JournalLineDto[];
};

export type TrialBalanceLineDto = {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  is_group: boolean;
  debit: string;
  credit: string;
};

export type TrialBalanceReportDto = {
  as_of: string;
  lines: TrialBalanceLineDto[];
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
};

export type GlAccountingPeriodDto = {
  year_month: string;
  is_closed: boolean;
};

export async function listGlAccounts(asOfIso?: string): Promise<GlAccountDto[]> {
  const q = asOfIso ? `?as_of=${encodeURIComponent(asOfIso)}` : "";
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/accounts${q}`, { headers: authHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountDto[];
}

export async function listPostableGlAccounts(): Promise<GlAccountDto[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/accounts/postable`, { headers: authHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountDto[];
}

export async function createGlAccount(body: {
  code: string;
  name: string;
  account_type: string;
  parent_id?: string | null;
  is_group: boolean;
  allow_posting: boolean;
  account_subtype?: string | null;
  is_active: boolean;
}): Promise<GlAccountDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/accounts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountDto;
}

export async function updateGlAccount(
  id: string,
  body: {
    name?: string | null;
    parent_id?: string | null;
    is_group?: boolean | null;
    allow_posting?: boolean | null;
    is_active?: boolean | null;
    account_subtype?: string | null;
  },
): Promise<GlAccountDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/accounts/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountDto;
}

export async function getGlSettings(): Promise<GlSettingsDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/settings`, { headers: authHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlSettingsDto;
}

export async function patchGlSettings(body: {
  functional_currency?: string | null;
  account_inventory_id?: string | null;
  account_purchases_id?: string | null;
  account_ap_id?: string | null;
  account_default_bank_id?: string | null;
  purchase_receipt_mode?: string | null;
  auto_post_purchase_lots?: boolean | null;
}): Promise<GlSettingsDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/settings`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlSettingsDto;
}

export async function fetchTrialBalance(asOfIso: string): Promise<TrialBalanceReportDto> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/gl/reports/trial-balance?as_of=${encodeURIComponent(asOfIso)}`,
    { headers: authHeaders() },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as TrialBalanceReportDto;
}

export async function listGlPeriods(year: number): Promise<GlAccountingPeriodDto[]> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/gl/periods?year=${encodeURIComponent(String(year))}`,
    { headers: authHeaders() },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountingPeriodDto[];
}

export async function patchGlPeriod(yearMonth: string, isClosed: boolean): Promise<GlAccountingPeriodDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/periods/${encodeURIComponent(yearMonth)}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ is_closed: isClosed }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountingPeriodDto;
}

export async function listJournalEntries(status?: string): Promise<JournalSummaryDto[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/journal-entries${q}`, { headers: authHeaders() });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalSummaryDto[];
}

export async function getJournalEntry(journalId: string): Promise<JournalDetailDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(journalId)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}

export async function createJournalEntry(body: {
  entry_date: string;
  reference: string;
  memo: string;
  tag: string;
  lines: { account_id: string; debit: number; credit: number; description: string }[];
}): Promise<JournalDetailDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/journal-entries`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}

export async function postJournalEntry(id: string): Promise<JournalDetailDto> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/gl/journal-entries/${id}/post`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}

export async function createJournalReversalDraft(journalId: string): Promise<JournalDetailDto> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(journalId)}/reverse-draft`,
    { method: "POST", headers: authHeaders() },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}
