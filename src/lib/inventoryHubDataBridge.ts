/**
 * Maps GemStack inventory API DTOs into InventoryHub `ItemRow` / `CustomInventoryType` shapes.
 * Used when `hub_backend_reads` is true on the business (explicit server hydration).
 */

import type { CustomInventoryType } from "@/components/inventory/inventoryItemTypes";
import { KIND_CUT, KIND_ROUGH, type UomTab } from "@/components/inventory/inventoryItemTypes";
import type { ItemRow } from "@/components/inventory/inventoryHubTypes";
import type { InvItemTypeDto, InvServiceDto, InvStockUnitDto } from "@/lib/invApi";
import { fetchItemTypes, fetchLocations, fetchServices, fetchStockUnits } from "@/lib/invApi";

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
      fieldPreset: KIND_ROUGH,
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
  const props = schema.properties;
  if (!props || typeof props !== "object" || Array.isArray(props)) return undefined;
  const requiredRaw = schema.required;
  const required = Array.isArray(requiredRaw) ? new Set(requiredRaw.filter((x): x is string => typeof x === "string")) : new Set<string>();
  const keys = Object.keys(props as Record<string, unknown>);
  if (!keys.length) return undefined;
  const fields: NonNullable<CustomInventoryType["builderFields"]> = [];
  for (const key of keys) {
    const def = (props as Record<string, unknown>)[key];
    if (!def || typeof def !== "object" || Array.isArray(def)) continue;
    const t = (def as { type?: unknown }).type;
    const kind = t === "number" || t === "integer" ? "number" : "text";
    fields.push({
      id: key,
      label: key,
      kind,
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
  return JSON.stringify(attrs);
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
    unit.custodian_user_id != null && unit.custodian_user_id !== ""
      ? `User ${unit.custodian_user_id.slice(0, 8)}…`
      : "";

  return {
    id: unit.id,
    serverUnitId: unit.id,
    rowVersion: unit.row_version ?? 1,
    serverItemTypeId: unit.item_type_id,
    serverParentUnitId: unit.parent_unit_id ?? null,
    serverCustodianUserId: unit.custodian_user_id ?? null,
    entryType: "inventory",
    imageDataUrl: null,
    itemNo: (unit.display_item_no || unit.public_code || "").trim() || unit.id.slice(0, 8),
    date: (unit.created_at || unit.updated_at || "").slice(0, 10),
    itemName: unit.display_name,
    itemKind,
    category: "Faceted",
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
    category: "Services",
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
