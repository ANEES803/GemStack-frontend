/**
 * Stock unit vs sellable-piece helpers for the Inventory Hub catalog.
 *
 * A "stock unit" is the root catalog line (lot parcel or items-form entry).
 * A "sellable piece" is a child `inv_stock_units` row (`parent_unit_id` set)
 * with its own unique `public_code` + QR, shown nested under its parent.
 */

import type { ItemRow } from "@/components/inventory/inventoryHubTypes";
import { KIND_CUT, KIND_ROUGH } from "@/components/inventory/inventoryItemTypes";
import {
  buildAttributesJsonForStock,
  itemKindToItemTypeId,
  resolveLocationAndCustodian,
  resolveRoughPurchaseLotId,
  type ItemFormLike,
} from "@/lib/inventoryHubInventoryApi";
import { createStockUnit, type InvItemTypeDto, type InvStockUnitDto } from "@/lib/invApi";

/** Root stock unit rows shown in the main inventory catalog (not sellable children). */
export function isRootStockCatalogRow(row: ItemRow): boolean {
  if (row.entryType !== "inventory") return true;
  return (row.serverParentUnitId ?? null) == null;
}

/** Active sellable child rows for a root stock unit id. */
export function sellableChildrenForParent(parentRow: ItemRow, rows: ItemRow[]): ItemRow[] {
  const parentKey = parentRow.serverUnitId ?? parentRow.id;
  return rows.filter(
    (r) => r.entryType === "inventory" && (r.serverParentUnitId ?? null) === parentKey,
  );
}

/** Primary UOM code: gem/lot stock uses ct; direct catalog items (bikes etc.) use ea. */
export function resolvePrimaryUomCodeForForm(form: ItemFormLike): string {
  if (form.itemTypeKey === KIND_ROUGH || form.itemTypeKey === KIND_CUT) return "ct";
  return "ea";
}

/** Unique sellable code like `BIKE-P01`, capped to 80 chars. */
export function buildSellableCode(base: string, index: number): string {
  const suffix = `-P${String(index + 1).padStart(2, "0")}`;
  const trimmed = base.trim().replace(/[^\w.-]+/g, "_").slice(0, Math.max(1, 80 - suffix.length));
  return `${trimmed || "unit"}${suffix}`.slice(0, 80);
}

export type CreateStockWithSellablesResult = {
  parent: InvStockUnitDto;
  sellableUnits: InvStockUnitDto[];
};

/**
 * Create a root stock unit. When `trackEachPieceSeparately` is set and pieces > 1,
 * also materialize N sellable child units (unique codes, parent link). The header
 * parent keeps the cost total but zero qty/pieces so reports do not double-count.
 */
export async function createStockWithOptionalSellablePieces(params: {
  types: InvItemTypeDto[];
  form: ItemFormLike;
  effUom: number;
  effPieces: number;
  effRate: number;
  mode: "rough" | "cut" | "builder";
  locationEnabled: boolean;
  custodianEnabled: boolean;
  trackEachPieceSeparately: boolean;
  signal?: AbortSignal;
}): Promise<CreateStockWithSellablesResult> {
  const {
    types,
    form,
    effUom,
    effPieces,
    effRate,
    mode,
    locationEnabled,
    custodianEnabled,
    trackEachPieceSeparately,
  } = params;

  const pieceCount = Math.floor(effPieces);
  const uomCode = resolvePrimaryUomCodeForForm(form);
  const item_type_id = itemKindToItemTypeId(form.itemTypeKey, types);
  const { location_id, custodian_party_id } = await resolveLocationAndCustodian(
    locationEnabled ? form.location : "",
    custodianEnabled ? form.custodian : "",
    params.signal,
  );
  const purchase_lot_id =
    form.itemTypeKey === KIND_ROUGH && form.linkedRoughLotCode.trim()
      ? await resolveRoughPurchaseLotId(form.linkedRoughLotCode, params.signal)
      : null;
  const attrs = await buildAttributesJsonForStock(form.itemTypeKey, mode, form);
  const totalCost = Math.max(0, effRate * effUom);
  const baseCode = form.itemNo.trim();
  const baseName = form.itemName.trim();
  const notesBase = form.details.trim() || `Received ${form.date.trim() || ""}`.trim();

  if (!trackEachPieceSeparately || pieceCount <= 1) {
    const parent = await createStockUnit(
      {
        public_code: baseCode,
        display_name: baseName,
        item_type_id,
        primary_uom_qty: String(effUom),
        primary_uom_code: uomCode,
        pieces: pieceCount,
        cost_basis_total: String(totalCost),
        list_price_per_uom: effRate > 0 ? String(effRate) : null,
        location_id,
        custodian_party_id,
        custodian_user_id: null,
        purchase_lot_id,
        purchase_lot_line_id: null,
        attributes_json: attrs,
        notes: notesBase,
        display_item_no: baseCode || null,
      },
      params.signal,
    );
    return { parent, sellableUnits: [] };
  }

  const perUom = effUom > 0 ? effUom / pieceCount : 1;
  const perCost = totalCost / pieceCount;

  const parent = await createStockUnit(
    {
      public_code: baseCode,
      display_name: baseName,
      item_type_id,
      primary_uom_qty: "0",
      primary_uom_code: uomCode,
      pieces: 0,
      cost_basis_total: String(totalCost),
      list_price_per_uom: effRate > 0 ? String(effRate) : null,
      location_id,
      custodian_party_id,
      custodian_user_id: null,
      purchase_lot_id,
      purchase_lot_line_id: null,
      attributes_json: attrs,
      notes: `${notesBase}${notesBase ? " | " : ""}Stock unit header for ${pieceCount} sellable units`.trim(),
      display_item_no: baseCode || null,
    },
    params.signal,
  );

  const sellableUnits: InvStockUnitDto[] = [];
  for (let i = 0; i < pieceCount; i++) {
    const code = buildSellableCode(baseCode || "unit", i);
    const child = await createStockUnit(
      {
        public_code: code,
        display_name: `${baseName} #${i + 1}`.slice(0, 512),
        display_item_no: code,
        item_type_id,
        parent_unit_id: parent.id,
        primary_uom_qty: String(perUom),
        primary_uom_code: uomCode,
        pieces: 1,
        cost_basis_total: String(Math.max(0, perCost)),
        list_price_per_uom: effRate > 0 ? String(effRate) : null,
        location_id,
        custodian_party_id,
        custodian_user_id: null,
        purchase_lot_id,
        purchase_lot_line_id: null,
        attributes_json: attrs,
        notes: `Sellable unit ${i + 1} of ${pieceCount} under ${baseCode || parent.id.slice(0, 8)}`,
      },
      params.signal,
    );
    sellableUnits.push(child);
  }

  return { parent, sellableUnits };
}

/** Build split API payloads for breaking N pieces out of a source row. */
export function buildBreakIntoPiecesSplitChildren(
  sourceName: string,
  sourceCode: string,
  count: number,
  perUom: number,
  perRate: number,
): {
  display_name: string;
  public_code: string;
  primary_uom_qty: string;
  pieces: number;
  cost_basis_total: string;
}[] {
  const baseName = sourceName.trim() || "Unit";
  const baseCode = sourceCode.trim() || "unit";
  return Array.from({ length: count }, (_, i) => ({
    display_name: `${baseName} #${i + 1}`.slice(0, 512),
    public_code: buildSellableCode(baseCode, i),
    primary_uom_qty: String(perUom),
    pieces: 1,
    cost_basis_total: String(Math.max(0, perRate * perUom)),
  }));
}
