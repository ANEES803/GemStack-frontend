/**
 * General ledger API (chart of accounts, journals, settings, balance sheet).
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
  const response = await apiAuthFetch(
    `${API_BASE_URL}/gl/reports/balance-sheet?as_of=${encodeURIComponent(asOfIso)}`,
    { method: "GET" },
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
  prior_debit?: string | null;
  prior_credit?: string | null;
};

export type TrialBalanceReportDto = {
  as_of: string;
  compare_as_of?: string | null;
  lines: TrialBalanceLineDto[];
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
};

export type GeneralLedgerLineDto = {
  line_id: string;
  journal_entry_id: string;
  entry_date: string;
  reference: string;
  memo: string;
  status: string;
  tag: string;
  source_type: string | null;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  description: string;
  sort_order: number;
  debit: string;
  credit: string;
};

export type GeneralLedgerLinesPageDto = {
  total_count: number;
  limit: number;
  offset: number;
  lines: GeneralLedgerLineDto[];
};

export type AccountActivityLineDto = {
  line_id: string;
  journal_entry_id: string;
  entry_date: string;
  reference: string;
  memo: string;
  status: string;
  debit: string;
  credit: string;
  description: string;
  source_type?: string | null;
  source_id?: string | null;
};

export type AccountActivityPageDto = {
  account_id: string;
  limit: number;
  offset: number;
  lines: AccountActivityLineDto[];
};

export type IncomeStatementAccountLineDto = {
  account_id: string;
  code: string;
  name: string;
  amount: string;
};

export type IncomeStatementReportDto = {
  date_from: string;
  date_to: string;
  basis: string;
  revenue_lines: IncomeStatementAccountLineDto[];
  expense_lines: IncomeStatementAccountLineDto[];
  total_revenue: string;
  total_expense: string;
  net_income: string;
};

export type CashFlowSectionDto = {
  id: string;
  label: string;
  amount: string;
};

export type CashFlowDetailLineDto = {
  journal_id: string;
  entry_date: string;
  reference: string;
  memo: string;
  description: string;
  debit: string;
  credit: string;
  net_cash: string;
  bucket: string;
};

export type CashFlowReportDto = {
  date_from: string;
  date_to: string;
  method: string;
  opening_cash: string;
  closing_cash: string;
  net_change: string;
  sections: CashFlowSectionDto[];
  detail_lines: CashFlowDetailLineDto[];
  note: string | null;
};

export type GlAccountingPeriodDto = {
  year_month: string;
  is_closed: boolean;
};

export async function listGlAccounts(asOfIso?: string, signal?: AbortSignal): Promise<GlAccountDto[]> {
  const q = asOfIso ? `?as_of=${encodeURIComponent(asOfIso)}` : "";
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/accounts${q}`, { method: "GET", signal });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountDto[];
}

export async function listPostableGlAccounts(signal?: AbortSignal): Promise<GlAccountDto[]> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/accounts/postable`, { method: "GET", signal });
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
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/accounts`, {
    method: "POST",
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
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountDto;
}

export async function deleteGlAccount(id: string): Promise<void> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function getGlSettings(signal?: AbortSignal): Promise<GlSettingsDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/settings`, { method: "GET", signal });
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
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/settings`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlSettingsDto;
}

export async function fetchTrialBalance(
  asOfIso: string,
  opts?: { compareAsOf?: string; signal?: AbortSignal },
): Promise<TrialBalanceReportDto> {
  const params = new URLSearchParams({ as_of: asOfIso });
  if (opts?.compareAsOf) params.set("compare_as_of", opts.compareAsOf);
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/reports/trial-balance?${params.toString()}`, {
    method: "GET",
    signal: opts?.signal,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as TrialBalanceReportDto;
}

export async function fetchGeneralLedgerLines(params: {
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: "posted" | "draft" | null;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<GeneralLedgerLinesPageDto> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);
  if (params.status) q.set("status", params.status);
  q.set("limit", String(params.limit ?? 500));
  q.set("offset", String(params.offset ?? 0));
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/reports/general-ledger-lines?${q.toString()}`, {
    method: "GET",
    signal: params.signal,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GeneralLedgerLinesPageDto;
}

export async function fetchAccountActivity(params: {
  accountId: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: "posted" | "draft" | null;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<AccountActivityPageDto> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);
  if (params.status) q.set("status", params.status);
  q.set("limit", String(params.limit ?? 200));
  q.set("offset", String(params.offset ?? 0));
  const response = await apiAuthFetch(
    `${API_BASE_URL}/gl/accounts/${encodeURIComponent(params.accountId)}/activity?${q.toString()}`,
    { method: "GET", signal: params.signal },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as AccountActivityPageDto;
}

export async function fetchIncomeStatement(
  dateFrom: string,
  dateTo: string,
  opts?: { basis?: string; signal?: AbortSignal },
): Promise<IncomeStatementReportDto> {
  const q = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    basis: opts?.basis ?? "accrual",
  });
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/reports/income-statement?${q.toString()}`, {
    method: "GET",
    signal: opts?.signal,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as IncomeStatementReportDto;
}

export async function fetchCashFlowReport(
  dateFrom: string,
  dateTo: string,
  signal?: AbortSignal,
): Promise<CashFlowReportDto> {
  const q = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/reports/cash-flow?${q.toString()}`, {
    method: "GET",
    signal,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CashFlowReportDto;
}

/** Download general ledger CSV (authenticated). */
export async function downloadGeneralLedgerCsv(params: {
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: "posted" | "draft" | null;
  filename?: string;
}): Promise<void> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set("date_from", params.dateFrom);
  if (params.dateTo) q.set("date_to", params.dateTo);
  if (params.status) q.set("status", params.status);
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/reports/general-ledger-lines/export.csv?${q.toString()}`, {
    method: "GET",
  });
  if (!response.ok) throw new Error(await parseError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = params.filename ?? "general-ledger.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export async function listGlPeriods(year: number, signal?: AbortSignal): Promise<GlAccountingPeriodDto[]> {
  const response = await apiAuthFetch(
    `${API_BASE_URL}/gl/periods?year=${encodeURIComponent(String(year))}`,
    { method: "GET", signal },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountingPeriodDto[];
}

export async function patchGlPeriod(yearMonth: string, isClosed: boolean): Promise<GlAccountingPeriodDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/periods/${encodeURIComponent(yearMonth)}`, {
    method: "PATCH",
    body: JSON.stringify({ is_closed: isClosed }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as GlAccountingPeriodDto;
}

export async function listJournalEntries(status?: string, signal?: AbortSignal): Promise<JournalSummaryDto[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/journal-entries${q}`, { method: "GET", signal });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalSummaryDto[];
}

export async function getJournalEntry(journalId: string, signal?: AbortSignal): Promise<JournalDetailDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(journalId)}`, {
    method: "GET",
    signal,
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
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/journal-entries`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}

export async function updateJournalEntry(
  id: string,
  body: {
    entry_date: string;
    reference: string;
    memo: string;
    tag: string;
    lines: { account_id: string; debit: number; credit: number; description: string }[];
  },
): Promise<JournalDetailDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}

export async function postJournalEntry(id: string): Promise<JournalDetailDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(id)}/post`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function createJournalReversalDraft(journalId: string): Promise<JournalDetailDto> {
  const response = await apiAuthFetch(
    `${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(journalId)}/reverse-draft`,
    { method: "POST" },
  );
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}

export async function restoreJournalEntry(journalId: string): Promise<JournalDetailDto> {
  const response = await apiAuthFetch(`${API_BASE_URL}/gl/journal-entries/${encodeURIComponent(journalId)}/restore`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as JournalDetailDto;
}
