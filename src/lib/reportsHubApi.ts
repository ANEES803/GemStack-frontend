/**
 * Operational reports under `/reports/*` (non-GL hub APIs).
 */

import { apiAuthFetch } from "@/lib/authClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function parseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
  const { detail } = body;
  if (typeof detail === "string" && detail.trim()) return detail;
  return `Request failed (${response.status})`;
}

export type PurchaseSummaryItem = Record<string, unknown>;

export async function fetchPurchaseReportSummary(signal?: AbortSignal): Promise<{
  source: string;
  items: PurchaseSummaryItem[];
}> {
  const response = await apiAuthFetch(`${API_BASE_URL}/reports/purchases/summary`, { method: "GET", signal });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as { source: string; items: PurchaseSummaryItem[] };
}

export async function fetchInventoryFinancialSummary(signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await apiAuthFetch(`${API_BASE_URL}/reports/inventory/financial-summary`, { method: "GET", signal });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as Record<string, unknown>;
}

export async function fetchSalesReportSummary(signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await apiAuthFetch(`${API_BASE_URL}/reports/sales/summary`, { method: "GET", signal });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as Record<string, unknown>;
}

export async function fetchAgingSummary(kind: "ar" | "ap", signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await apiAuthFetch(`${API_BASE_URL}/reports/aging/summary?kind=${encodeURIComponent(kind)}`, {
    method: "GET",
    signal,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as Record<string, unknown>;
}
