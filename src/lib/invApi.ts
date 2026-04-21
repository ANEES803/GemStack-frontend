/**
 * Inventory API (stock units, services, master data, reports, audit).
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

export type InvItemTypeDto = {
  id: string;
  business_id: string;
  code: string;
  label: string;
  kind: string;
  uom_policy: string;
  json_schema: Record<string, unknown> | null;
  standard_field_overrides: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvStockUnitDto = {
  id: string;
  business_id: string;
  public_code: string;
  display_name: string;
  item_type_id: string;
  item_type_label: string;
  status: string;
  primary_uom_qty: string;
  primary_uom_code: string;
  pieces: number;
  cost_basis_total: string;
  functional_currency: string;
  list_price_per_uom: string | null;
  location_id: string | null;
  custodian_user_id: string | null;
  purchase_lot_id: string | null;
  purchase_lot_line_id: string | null;
  parent_unit_id: string | null;
  attributes_json: Record<string, unknown> | null;
  notes: string;
  as_of_date: string | null;
  created_at: string;
  updated_at: string;
};

export type InvServiceDto = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  billing_unit_label: string;
  default_rate: string;
  revenue_gl_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvReportSummaryDto = {
  stock_line_count: number;
  total_primary_uom_qty: string;
  total_pieces: number;
  total_cost_basis: string;
  functional_currency: string;
};

export async function fetchItemTypes(signal?: AbortSignal): Promise<InvItemTypeDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/item-types`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvItemTypeDto[];
}

export async function fetchStockUnits(params: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<InvStockUnitDto[]> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units?${q.toString()}`, {
    method: "GET",
    signal: params.signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
}

export async function fetchStockUnitsCount(signal?: AbortSignal): Promise<number> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/count`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  const j = (await res.json()) as { total: number };
  return j.total;
}

export async function createStockUnit(
  body: {
    public_code?: string;
    display_name: string;
    item_type_id: string;
    primary_uom_qty: string;
    primary_uom_code?: string;
    pieces?: number;
    cost_basis_total?: string;
    list_price_per_uom?: string | null;
    location_id?: string | null;
    custodian_user_id?: string | null;
    purchase_lot_id?: string | null;
    purchase_lot_line_id?: string | null;
    notes?: string;
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto;
}

export async function splitStockUnits(
  body: {
    source_unit_id: string;
    children: { display_name: string; public_code?: string; primary_uom_qty: string; pieces?: number; cost_basis_total?: string | null }[];
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/split`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
}

/** Create inventory parcels (stock units) from a vendor purchase lot and its lines. */
export async function createStockUnitsFromPurchaseLot(
  body: {
    purchase_lot_id: string;
    item_type_id: string;
    primary_uom_code?: string;
    parcels: {
      purchase_lot_line_id: string;
      display_name: string;
      public_code?: string;
      primary_uom_qty: string;
      pieces?: number;
      cost_basis_total?: string | null;
      location_id?: string | null;
      custodian_user_id?: string | null;
    }[];
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/from-purchase-lot`, {
    method: "POST",
    body: JSON.stringify({
      purchase_lot_id: body.purchase_lot_id,
      item_type_id: body.item_type_id,
      primary_uom_code: body.primary_uom_code ?? "ct",
      parcels: body.parcels,
      client_ref: body.client_ref ?? null,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
}

export async function fetchServices(signal?: AbortSignal): Promise<InvServiceDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/services`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvServiceDto[];
}

export async function createService(
  body: {
    name: string;
    description?: string;
    billing_unit_label?: string;
    default_rate?: string;
    revenue_gl_account_id?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvServiceDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/services`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvServiceDto;
}

export async function fetchReportSummary(signal?: AbortSignal): Promise<InvReportSummaryDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/reports/summary`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvReportSummaryDto;
}

export async function fetchReportByType(signal?: AbortSignal): Promise<
  { item_type_id: string; item_type_label: string; line_count: number; total_cost_basis: string }[]
> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/reports/by-type`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { item_type_id: string; item_type_label: string; line_count: number; total_cost_basis: string }[];
}

export async function fetchReportByCustodian(signal?: AbortSignal): Promise<
  { custodian_user_id: string | null; line_count: number; total_cost_basis: string }[]
> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/reports/by-custodian`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { custodian_user_id: string | null; line_count: number; total_cost_basis: string }[];
}

export async function createAuditSession(
  body: { note?: string; lines: { stock_unit_id: string; physical_qty?: string | null; verified?: boolean }[] },
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/audit-sessions`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function importStockFromLocalCache(signal?: AbortSignal): Promise<InvStockUnitDto[]> {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem("gemstack-items-catalog-v1") : null;
  if (!raw) throw new Error("No gemstack-items-catalog-v1 in localStorage.");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Invalid catalog format.");
  type Row = {
    entryType?: string;
    itemName?: string;
    public_code?: string;
    itemNo?: string;
    itemKind?: string;
    uom?: number;
    pieces?: number;
    rate?: number;
    cost_basis_total?: number;
    details?: string;
  };
  const rows: Row[] = parsed as Row[];
  const invRows = rows.filter((r) => r.entryType === "inventory" || r.entryType === undefined);
  const types = await fetchItemTypes(signal);
  const codeForKind = (kind: string | undefined): string => {
    const k = (kind || "rough").toLowerCase();
    if (k === "rough") return "rough";
    if (k === "cut") return "cut";
    const t = types.find((x) => x.id === kind);
    return t?.code ?? "rough";
  };
  const payload = {
    client_ref: `import-ls-${Date.now()}`,
    rows: invRows.map((r) => ({
      public_code: r.itemNo ?? r.public_code ?? "",
      display_name: r.itemName ?? "Item",
      item_type_code: codeForKind(r.itemKind),
      primary_uom_qty: String(r.uom ?? 0),
      primary_uom_code: "ct",
      pieces: r.pieces ?? 0,
      cost_basis_total: String((r as { cost_basis_total?: number }).cost_basis_total ?? (r.rate ?? 0) * (r.uom ?? 0)),
      notes: r.details ?? "",
    })),
  };
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/import`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
}
