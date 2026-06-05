/**
 * Maps GemStack inventory API DTOs into InventoryHub `ItemRow` / `CustomInventoryType` shapes.
 * Used when `hub_backend_reads` is true on the business (explicit server hydration).
 */

import type { CustomInventoryType } from "@/components/inventory/inventoryItemTypes";
import { KIND_CUT, KIND_ROUGH, type UomTab } from "@/components/inventory/inventoryItemTypes";
import type { ItemRow } from "@/components/inventory/inventoryHubTypes";
import type { InvItemTypeDto, InvServiceDto, InvStockUnitDto } from "@/lib/invApi";
import { fetchItemTypes, fetchLocations, fetchServices, fetchStockUnits } from "@/lib/invApi";
import { imageUrlFromAttributes } from "@/lib/salesStockUtils";

function numFromDecimalString(s: string | undefined | null): number {
  if (s == null || s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function isBuiltinRoughCutType(t: InvItemTypeDto): boolean {
  const code = t.code.trim().toLowerCase();
  const kind = (t.kind || "").toLowerCase();
  if (code !== KIND_ROUGH && code !== KIND_CUT) return false;
  return kind.startsWith("builtin") || kind.includes("builtin");
}

/** Server item types that are not the built-in Rough/Cut rows become Hub custom types. */
export function mapServerItemTypesToCustom(types: InvItemTypeDto[]): CustomInventoryType[] {
  const out: CustomInventoryType[] = [];
  for (const t of types) {
    if (!t.is_active) continue;
    if (isBuiltinRoughCutType(t)) continue;
    const overrides = t.standard_field_overrides;
    let standardFields: CustomInventoryType["standardFields"];
    if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
      standardFields = overrides as CustomInventoryType["standardFields"];
    }
    out.push({
      id: t.id,
      label: t.label,
      uomTab: uomPolicyToUomTab(t.uom_policy),
      // Custom types are field-driven (builderFields); fieldPreset is legacy and unused here.
      fieldPreset: undefined,
      standardFields,
      builderFields: jsonSchemaToBuilderFields(t.json_schema),
    });
  }
  return out;
}

function uomPolicyToUomTab(policy: string | undefined): UomTab {
  const p = (policy || "").toLowerCase();
  if (p.includes("piece")) return "piece";
  return "piece";
}

function jsonSchemaToBuilderFields(schema: Record<string, unknown> | null | undefined): CustomInventoryType["builderFields"] {
  if (!schema || typeof schema !== "object") return undefined;
  const topProps = schema.properties;
  if (!topProps || typeof topProps !== "object" || Array.isArray(topProps)) return undefined;

  // Field definitions nest under properties.custom (current shape); fall back to the
  // legacy flat top-level shape for older saved schemas.
  let props = topProps as Record<string, unknown>;
  let requiredRaw: unknown = schema.required;
  const customDef = (topProps as Record<string, unknown>).custom;
  if (customDef && typeof customDef === "object" && !Array.isArray(customDef)) {
    const cd = customDef as { properties?: unknown; required?: unknown };
    if (cd.properties && typeof cd.properties === "object" && !Array.isArray(cd.properties)) {
      props = cd.properties as Record<string, unknown>;
      requiredRaw = cd.required;
    }
  }

  const required = Array.isArray(requiredRaw)
    ? new Set(requiredRaw.filter((x): x is string => typeof x === "string"))
    : new Set<string>();
  const keys = Object.keys(props);
  if (!keys.length) return undefined;
  const fields: NonNullable<CustomInventoryType["builderFields"]> = [];
  for (const key of keys) {
    const def = props[key];
    if (!def || typeof def !== "object" || Array.isArray(def)) continue;
    const d = def as { type?: unknown; title?: unknown; enum?: unknown };
    const enumVals = Array.isArray(d.enum)
      ? d.enum.filter((x): x is string => typeof x === "string")
      : undefined;
    const kind =
      enumVals && enumVals.length ? "dropdown" : d.type === "number" || d.type === "integer" ? "number" : "text";
    fields.push({
      id: key,
      label: typeof d.title === "string" && d.title.trim() ? d.title : key,
      kind,
      options: kind === "dropdown" ? enumVals : undefined,
      required: required.has(key),
      visible: true,
    });
  }
  return fields.length ? fields : undefined;
}

function resolveItemKindForStock(unit: InvStockUnitDto, types: InvItemTypeDto[]): ItemRow["itemKind"] {
  const t = types.find((x) => x.id === unit.item_type_id);
  if (!t) return unit.item_type_id;
  const code = t.code.trim().toLowerCase();
  if (code === KIND_ROUGH && isBuiltinRoughCutType(t)) return KIND_ROUGH;
  if (code === KIND_CUT && isBuiltinRoughCutType(t)) return KIND_CUT;
  return t.id;
}

function attributesToCustomJson(attrs: Record<string, unknown> | null | undefined): string {
  if (!attrs || typeof attrs !== "object") return "{}";
  // Builder field values live under `custom`; that is what the item form reads back.
  const custom = (attrs as { custom?: unknown }).custom;
  if (custom && typeof custom === "object" && !Array.isArray(custom)) return JSON.stringify(custom);
  return "{}";
}

/** Map one `inv_stock_units` row into a Hub inventory line. */
export function mapStockUnitToItemRow(
  unit: InvStockUnitDto,
  types: InvItemTypeDto[],
  locationNameById: Map<string, string>,
): ItemRow {
  const qty = numFromDecimalString(unit.primary_uom_qty);
  const cost = numFromDecimalString(unit.cost_basis_total);
  const rate = qty > 0 ? cost / qty : 0;
  const itemKind = resolveItemKindForStock(unit, types);
  const attrs = unit.attributes_json ?? undefined;
  const grade =
    attrs && typeof attrs.grade === "string"
      ? attrs.grade
      : attrs && typeof (attrs as { spec?: { grade?: string } }).spec?.grade === "string"
        ? String((attrs as { spec?: { grade?: string } }).spec?.grade)
        : "";
  const spec = attrs && typeof (attrs as { spec?: unknown }).spec === "object" ? (attrs as { spec: Record<string, unknown> }).spec : undefined;
  const dimLength = spec && typeof spec.length === "string" ? spec.length : spec && typeof spec.dimLength === "string" ? String(spec.dimLength) : "";
  const dimWidth = spec && typeof spec.width === "string" ? spec.width : spec && typeof spec.dimWidth === "string" ? String(spec.dimWidth) : "";
  const dimHeight = spec && typeof spec.height === "string" ? spec.height : spec && typeof spec.dimHeight === "string" ? String(spec.dimHeight) : "";

  const loc = unit.location_id ? locationNameById.get(unit.location_id) ?? "" : "";
  const custodianLabel =
    unit.custodian_party_name && unit.custodian_party_name.trim()
      ? unit.custodian_party_name.trim()
      : unit.custodian_user_id != null && unit.custodian_user_id !== ""
        ? `User ${unit.custodian_user_id.slice(0, 8)}…`
        : "";

  return {
    id: unit.id,
    serverUnitId: unit.id,
    rowVersion: unit.row_version ?? 1,
    serverItemTypeId: unit.item_type_id,
    serverParentUnitId: unit.parent_unit_id ?? null,
    serverCustodianUserId: unit.custodian_user_id ?? null,
    serverPurchaseLotId: unit.purchase_lot_id ?? null,
    serverPurchaseLotLineId: unit.purchase_lot_line_id ?? null,
    isLocked: Boolean(unit.is_locked),
    lockReason: unit.lock_reason ?? null,
    entryType: "inventory",
    imageDataUrl: imageUrlFromAttributes(attrs ?? null),
    itemNo: (unit.display_item_no || unit.public_code || "").trim() || unit.id.slice(0, 8),
    date: (unit.created_at || unit.updated_at || "").slice(0, 10),
    itemName: unit.display_name,
    itemKind,
    type: "Product",
    grade,
    dimLength,
    dimWidth,
    dimHeight,
    uom: qty,
    pieces: unit.pieces,
    rate,
    location: loc,
    custodian: custodianLabel,
    details: unit.notes || "",
    customFieldValuesJson: attributesToCustomJson(attrs ?? null),
    serviceUnit: "",
    revenueAccountId: "",
    linkedRoughLotCode: "",
  };
}

export function mapServiceToItemRow(s: InvServiceDto): ItemRow {
  const rate = numFromDecimalString(s.default_rate);
  return {
    id: s.id,
    serverServiceId: s.id,
    entryType: "service",
    imageDataUrl: null,
    itemNo: "",
    date: (s.created_at || s.updated_at || "").slice(0, 10),
    itemName: s.name,
    itemKind: KIND_ROUGH,
    type: "Service",
    grade: "",
    dimLength: "",
    dimWidth: "",
    dimHeight: "",
    uom: 1,
    pieces: 1,
    rate,
    location: "",
    custodian: "",
    details: s.description || "",
    customFieldValuesJson: "{}",
    serviceUnit: s.billing_unit_label || "",
    revenueAccountId: s.revenue_gl_account_id ?? "",
    linkedRoughLotCode: "",
  };
}

export type InventoryHubServerSnapshot = {
  rows: ItemRow[];
  customInventoryTypes: CustomInventoryType[];
};

/** Parallel fetch + map for authenticated Hub hydration. */
export async function loadInventoryHubServerSnapshot(signal?: AbortSignal): Promise<InventoryHubServerSnapshot> {
  const [types, units, services, locations] = await Promise.all([
    fetchItemTypes(signal),
    fetchStockUnits({ status: "active", limit: 500, signal }),
    fetchServices(signal),
    fetchLocations(signal),
  ]);
  const locationNameById = new Map(locations.map((l) => [l.id, l.name]));
  const customInventoryTypes = mapServerItemTypesToCustom(types);
  const rows: ItemRow[] = [];
  for (const u of units) {
    if (u.status !== "active") continue;
    rows.push(mapStockUnitToItemRow(u, types, locationNameById));
  }
  for (const s of services) {
    if (!s.is_active) continue;
    rows.push(mapServiceToItemRow(s));
  }
  return { rows, customInventoryTypes };
}
