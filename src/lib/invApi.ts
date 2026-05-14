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
  published_schema_version?: number;
  published_at?: string | null;
  deprecated_at?: string | null;
  pricing_policy?: string | null;
  created_at: string;
  updated_at: string;
};

/** Mirrors `Business.inventory_feature_flags` JSON plus documented keys from `InvBusinessInventoryFlags`. */
export type InvInventoryFeatureFlags = {
  hub_backend_reads?: boolean;
  hub_backend_writes?: boolean;
  disable_client_split?: boolean;
  dual_write_monitoring?: boolean;
  inv_attributes_strict_mode?: boolean;
  inv_attributes_max_json_bytes?: number;
  require_split_client_ref?: boolean;
  [key: string]: unknown;
};

export type InvStockUnitDto = {
  id: string;
  business_id: string;
  public_code: string;
  display_name: string;
  item_type_id: string;
  item_type_label: string;
  item_type_published_schema_version?: number | null;
  status: string;
  primary_uom_qty: string;
  primary_uom_code: string;
  pieces: number;
  cost_basis_total: string;
  functional_currency: string;
  list_price_per_uom: string | null;
  location_id: string | null;
  custodian_user_id: string | null;
  custodian_party_id?: string | null;
  purchase_lot_id: string | null;
  purchase_lot_line_id: string | null;
  parent_unit_id: string | null;
  attributes_json: Record<string, unknown> | null;
  notes: string;
  as_of_date: string | null;
  row_version?: number;
  external_ref?: string | null;
  display_item_no?: string | null;
  pinned_schema_version?: number | null;
  last_attributes_validation_error?: string | null;
  is_locked?: boolean;
  lock_reason?: string | null;
  created_at: string;
  updated_at: string;
};

/** Why a parcel weight or lot total no longer balances. */
export type InvLotVarianceReason =
  | "re_measure"
  | "dust"
  | "data_entry_error"
  | "lost"
  | "found_extra"
  | "cutting_prep"
  | "other";

/** Live mass-balance for a single purchase lot (lot_total = parcels + recorded_loss). */
export type InvLotBalanceDto = {
  lot_id: string;
  lot_code: string;
  lot_total_qty: string;
  lot_total_pieces: number;
  current_parcels_qty: string;
  current_parcels_pieces: number;
  recorded_loss_qty: string;
  recorded_loss_pieces: number;
  variance_qty: string;
  variance_pieces: number;
  balanced: boolean;
  balanced_pieces: boolean;
};

/** Single audit-log entry for a stock unit (used by the History tab). */
export type InvStockMovementDto = {
  id: string;
  stock_unit_id: string;
  movement_type: string;
  qty_delta_primary_uom: string;
  pieces_delta: number;
  cost_delta: string | null;
  counterparty_unit_id: string | null;
  purchase_lot_id: string | null;
  client_ref: string | null;
  occurred_at: string;
  memo: string;
  extra_metadata?: Record<string, unknown> | null;
};

/** Phase 2: rough cut response (consumed parent + new cut children). */
export type InvCutOperationDto = {
  parent: InvStockUnitDto;
  children: InvStockUnitDto[];
};

/** Phase 3: lineage tree for one stock unit. */
export type InvLineageDto = {
  unit: InvStockUnitDto;
  ancestors: InvStockUnitDto[];
  children: InvStockUnitDto[];
  descendants: InvStockUnitDto[];
};

export type InvLocationDto = {
  id: string;
  business_id: string;
  name: string;
  parent_location_id: string | null;
  is_active: boolean;
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

export async function fetchInventoryFeatureFlags(signal?: AbortSignal): Promise<InvInventoryFeatureFlags> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/inventory-feature-flags`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvInventoryFeatureFlags;
}

export async function patchInventoryFeatureFlags(
  body: Partial<InvInventoryFeatureFlags>,
  signal?: AbortSignal,
): Promise<InvInventoryFeatureFlags> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/inventory-feature-flags`, {
    method: "PATCH",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvInventoryFeatureFlags;
}

export async function fetchLocations(signal?: AbortSignal): Promise<InvLocationDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/locations`, { method: "GET", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvLocationDto[];
}

export async function resolveInventoryEntities(
  body: { locations?: string[]; custodian_display_names?: string[]; categories?: string[] },
  signal?: AbortSignal,
): Promise<{
  locations: Record<string, string>;
  custodian_parties: Record<string, string>;
  categories: Record<string, string>;
}> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/entities/resolve`, {
    method: "POST",
    body: JSON.stringify({
      locations: body.locations ?? [],
      custodian_display_names: body.custodian_display_names ?? [],
      categories: body.categories ?? [],
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as {
    locations: Record<string, string>;
    custodian_parties: Record<string, string>;
    categories: Record<string, string>;
  };
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
    custodian_party_id?: string | null;
    purchase_lot_id?: string | null;
    purchase_lot_line_id?: string | null;
    parent_unit_id?: string | null;
    attributes_json?: Record<string, unknown> | null;
    notes?: string;
    client_ref?: string | null;
    external_ref?: string | null;
    display_item_no?: string | null;
    upsert_by_external_ref?: boolean;
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

export async function patchStockUnit(
  unitId: string,
  body: {
    display_name?: string;
    notes?: string | null;
    location_id?: string | null;
    custodian_user_id?: string | null;
    custodian_party_id?: string | null;
    purchase_lot_id?: string | null;
    purchase_lot_line_id?: string | null;
    primary_uom_qty?: string | null;
    pieces?: number | null;
    cost_basis_total?: string | null;
    list_price_per_uom?: string | null;
    attributes_json?: Record<string, unknown> | null;
    expected_row_version?: number | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${unitId}`, {
    method: "PATCH",
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
    expected_source_row_version?: number | null;
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

export async function updateService(
  serviceId: string,
  body: {
    name?: string;
    description?: string | null;
    billing_unit_label?: string | null;
    default_rate?: string | null;
    revenue_gl_account_id?: string | null;
    is_active?: boolean | null;
  },
  signal?: AbortSignal,
): Promise<InvServiceDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/services/${serviceId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvServiceDto;
}

export async function createItemType(
  body: {
    code: string;
    label: string;
    kind?: string;
    uom_policy?: string;
    json_schema?: Record<string, unknown> | null;
    standard_field_overrides?: Record<string, unknown> | null;
  },
  signal?: AbortSignal,
): Promise<InvItemTypeDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/item-types`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvItemTypeDto;
}

export async function updateItemType(
  typeId: string,
  body: {
    label?: string;
    uom_policy?: string | null;
    json_schema?: Record<string, unknown> | null;
    standard_field_overrides?: Record<string, unknown> | null;
    is_active?: boolean | null;
  },
  signal?: AbortSignal,
): Promise<InvItemTypeDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/item-types/${typeId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvItemTypeDto;
}

export async function voidStockUnit(unitId: string, memo = "", signal?: AbortSignal): Promise<InvStockUnitDto> {
  const q = memo ? `?memo=${encodeURIComponent(memo)}` : "";
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${unitId}/void${q}`, {
    method: "POST",
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto;
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

export type InvAuditSessionLineDto = {
  id: string;
  stock_unit_id: string;
  system_qty: string;
  physical_qty: string | null;
  verified: boolean;
};

export type InvAuditSessionDto = {
  id: string;
  business_id: string;
  started_at: string;
  closed_at: string | null;
  status: string;
  note: string;
  lines: InvAuditSessionLineDto[];
};

export async function createAuditSession(
  body: { note?: string; lines: { stock_unit_id: string; physical_qty?: string | null; verified?: boolean }[] },
  signal?: AbortSignal,
): Promise<InvAuditSessionDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/audit-sessions`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvAuditSessionDto;
}

export async function closeAuditSession(sessionId: string, signal?: AbortSignal): Promise<InvAuditSessionDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/audit-sessions/${sessionId}/close`, {
    method: "PATCH",
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvAuditSessionDto;
}

export async function importHubCatalog(
  body: {
    client_ref?: string | null;
    upsert_by_external_ref?: boolean;
    rows: {
      external_ref: string;
      display_name: string;
      display_item_no?: string | null;
      item_type_code: string;
      primary_uom_qty: string;
      primary_uom_code?: string;
      pieces?: number;
      cost_basis_total?: string;
      list_price_per_uom?: string | null;
      notes?: string;
      location_name?: string | null;
      custodian_display_name?: string | null;
      attributes_json?: Record<string, unknown> | null;
    }[];
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/catalog/hub-import`, {
    method: "POST",
    body: JSON.stringify({
      client_ref: body.client_ref ?? null,
      upsert_by_external_ref: body.upsert_by_external_ref ?? true,
      rows: body.rows,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
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

// ---- Phase 1: Lot to Sellable Parcels with mass-balance --------------------

/** Mode A: split a purchase lot line into N equal sellable parcels in one click. */
export async function autoSplitLotLine(
  lotId: string,
  lineId: string,
  body: {
    item_type_id: string;
    n_parcels: number;
    basis?: "equal_weight" | "equal_pieces";
    primary_uom_code?: string;
    name_prefix?: string | null;
    location_id?: string | null;
    custodian_user_id?: string | null;
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto[]> {
  const res = await apiAuthFetch(
    `${API_BASE_URL}/inv/purchase-lots/${lotId}/lines/${lineId}/auto-split`,
    {
      method: "POST",
      body: JSON.stringify({
        item_type_id: body.item_type_id,
        n_parcels: body.n_parcels,
        basis: body.basis ?? "equal_weight",
        primary_uom_code: body.primary_uom_code ?? "ct",
        name_prefix: body.name_prefix ?? null,
        location_id: body.location_id ?? null,
        custodian_user_id: body.custodian_user_id ?? null,
        client_ref: body.client_ref ?? null,
      }),
      signal,
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
}

/** Mode B: user types each parcel; sums must equal lot line OR provide variance_reason. */
export async function customSplitLotLine(
  lotId: string,
  lineId: string,
  body: {
    item_type_id: string;
    parcels: {
      display_name: string;
      public_code?: string;
      primary_uom_qty: string;
      pieces?: number;
      rate?: string | null;
    }[];
    primary_uom_code?: string;
    location_id?: string | null;
    custodian_user_id?: string | null;
    variance_reason?: InvLotVarianceReason | null;
    variance_memo?: string;
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto[]> {
  const res = await apiAuthFetch(
    `${API_BASE_URL}/inv/purchase-lots/${lotId}/lines/${lineId}/custom-split`,
    {
      method: "POST",
      body: JSON.stringify({
        item_type_id: body.item_type_id,
        parcels: body.parcels,
        primary_uom_code: body.primary_uom_code ?? "ct",
        location_id: body.location_id ?? null,
        custodian_user_id: body.custodian_user_id ?? null,
        variance_reason: body.variance_reason ?? null,
        variance_memo: body.variance_memo ?? "",
        client_ref: body.client_ref ?? null,
      }),
      signal,
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
}

/** Re-measure a parcel's weight or pieces with mandatory reason. */
export async function adjustStockUnitWeight(
  unitId: string,
  body: {
    primary_uom_qty: string;
    pieces: number;
    reason: InvLotVarianceReason;
    memo?: string;
    expected_row_version?: number | null;
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${unitId}/adjust-weight`, {
    method: "POST",
    body: JSON.stringify({
      primary_uom_qty: body.primary_uom_qty,
      pieces: body.pieces,
      reason: body.reason,
      memo: body.memo ?? "",
      expected_row_version: body.expected_row_version ?? null,
      client_ref: body.client_ref ?? null,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto;
}

/** Atomic paired adjustment: move qty/pieces from one sibling to another. */
export async function rebalanceStockUnits(
  body: {
    from_unit_id: string;
    to_unit_id: string;
    qty_delta: string;
    pieces_delta: number;
    reason?: InvLotVarianceReason;
    memo?: string;
    expected_from_row_version?: number | null;
    expected_to_row_version?: number | null;
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto[]> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/rebalance`, {
    method: "POST",
    body: JSON.stringify({
      from_unit_id: body.from_unit_id,
      to_unit_id: body.to_unit_id,
      qty_delta: body.qty_delta,
      pieces_delta: body.pieces_delta,
      reason: body.reason ?? "re_measure",
      memo: body.memo ?? "",
      expected_from_row_version: body.expected_from_row_version ?? null,
      expected_to_row_version: body.expected_to_row_version ?? null,
      client_ref: body.client_ref ?? null,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto[];
}

/** Record dust / breakage / theft as a one-sided reduction with required reason. */
export async function recordStockLoss(
  unitId: string,
  body: {
    qty: string;
    pieces?: number;
    reason: InvLotVarianceReason;
    memo?: string;
    expected_row_version?: number | null;
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvStockUnitDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${unitId}/record-loss`, {
    method: "POST",
    body: JSON.stringify({
      qty: body.qty,
      pieces: body.pieces ?? 0,
      reason: body.reason,
      memo: body.memo ?? "",
      expected_row_version: body.expected_row_version ?? null,
      client_ref: body.client_ref ?? null,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto;
}

/** Lock a stock unit so adjustments are refused (e.g. once sold). */
export async function freezeStockUnit(
  unitId: string,
  body: { lock_reason?: string; expected_row_version?: number | null } = {},
  signal?: AbortSignal,
): Promise<InvStockUnitDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${unitId}/freeze`, {
    method: "POST",
    body: JSON.stringify({
      lock_reason: body.lock_reason ?? "Manually locked",
      expected_row_version: body.expected_row_version ?? null,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto;
}

/** Reverse a freeze. Admin action (e.g. sales invoice voided). */
export async function unfreezeStockUnit(unitId: string, signal?: AbortSignal): Promise<InvStockUnitDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${unitId}/unfreeze`, {
    method: "POST",
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockUnitDto;
}

/** Live mass-balance for a single purchase lot. */
export async function fetchLotBalance(lotId: string, signal?: AbortSignal): Promise<InvLotBalanceDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/purchase-lots/${lotId}/balance`, {
    method: "GET",
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvLotBalanceDto;
}

/** Audit trail for a single stock unit (used by the History tab in the child-parcels drawer). */
export async function fetchStockUnitMovements(
  unitId: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<InvStockMovementDto[]> {
  const res = await apiAuthFetch(
    `${API_BASE_URL}/inv/stock-units/${unitId}/movements?limit=${limit}`,
    { method: "GET", signal },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvStockMovementDto[];
}

/** Phase 2: consume rough parcel and create cut stock units (cost by weight on outputs). */
export async function cutStockUnit(
  roughUnitId: string,
  body: {
    cut_item_type_id: string;
    outputs: {
      display_name: string;
      public_code?: string;
      primary_uom_qty: string;
      pieces?: number;
      list_price_per_uom?: string | null;
      attributes_json?: Record<string, unknown> | null;
    }[];
    primary_uom_code?: string | null;
    loss_reason?: InvLotVarianceReason | null;
    memo?: string;
    expected_source_row_version?: number | null;
    client_ref?: string | null;
  },
  signal?: AbortSignal,
): Promise<InvCutOperationDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${roughUnitId}/cut`, {
    method: "POST",
    body: JSON.stringify({
      cut_item_type_id: body.cut_item_type_id,
      outputs: body.outputs,
      primary_uom_code: body.primary_uom_code ?? null,
      loss_reason: body.loss_reason ?? null,
      memo: body.memo ?? "",
      expected_source_row_version: body.expected_source_row_version ?? null,
      client_ref: body.client_ref ?? null,
    }),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvCutOperationDto;
}

/** Phase 3: ancestors, children, and deeper descendants for lineage UI. */
export async function fetchStockUnitLineage(unitId: string, signal?: AbortSignal): Promise<InvLineageDto> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-units/${unitId}/lineage`, {
    method: "GET",
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as InvLineageDto;
}

/** Fetch PNG QR for a stock unit (use with Blob URL; auth header required). */
export async function fetchStockUnitQrPng(unitId: string, size = 256, signal?: AbortSignal): Promise<Blob> {
  const res = await apiAuthFetch(
    `${API_BASE_URL}/inv/stock-units/${encodeURIComponent(unitId)}/qr.png?size=${encodeURIComponent(String(size))}`,
    { method: "GET", signal },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return await res.blob();
}

/** Single-unit printable label PDF. */
export async function fetchStockUnitLabelPdf(
  unitId: string,
  layout: "single" | "2x4" | "3x6" = "single",
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await apiAuthFetch(
    `${API_BASE_URL}/inv/stock-units/${encodeURIComponent(unitId)}/label.pdf?layout=${encodeURIComponent(layout)}`,
    { method: "GET", signal },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return await res.blob();
}

export type InvLabelBatchBody = { stock_unit_ids: string[]; layout: "single" | "2x4" | "3x6" };

/** Multi-unit label sheet PDF. */
export async function fetchStockUnitLabelsBatchPdf(body: InvLabelBatchBody, signal?: AbortSignal): Promise<Blob> {
  const res = await apiAuthFetch(`${API_BASE_URL}/inv/stock-unit-labels/batch.pdf`, {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return await res.blob();
}

/** Same-origin URL for QR PNG (needs Bearer in fetch; use `fetchStockUnitQrPng` in the browser). */
export function stockUnitQrUrl(unitId: string, size = 256): string {
  return `${API_BASE_URL}/inv/stock-units/${encodeURIComponent(unitId)}/qr.png?size=${encodeURIComponent(String(size))}`;
}

/** Same-origin URL for one-unit label PDF. */
export function stockUnitLabelPdfUrl(unitId: string, layout: "single" | "2x4" | "3x6" = "single"): string {
  return `${API_BASE_URL}/inv/stock-units/${encodeURIComponent(unitId)}/label.pdf?layout=${encodeURIComponent(layout)}`;
}
