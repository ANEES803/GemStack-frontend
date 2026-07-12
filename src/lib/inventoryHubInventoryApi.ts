/**
 * InventoryHub → GemStack `/inv/*` mapping (reuses backend rules; no duplicate business logic).
 */

import type { CustomFieldDef, CustomInventoryType } from "@/components/inventory/inventoryItemTypes";
import { KIND_CUT, KIND_ROUGH } from "@/components/inventory/inventoryItemTypes";
import type { InvItemTypeDto, InvInventoryFeatureFlags } from "@/lib/invApi";
import {
  createItemType,
  createService,
  createStockUnit,
  fetchItemTypes,
  patchStockUnit,
  resolveInventoryEntities,
  updateItemType,
  updateService,
} from "@/lib/invApi";
import { getPurchaseLotByCode } from "@/lib/purchaseLotsApi";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isServerUuid(id: string | undefined | null): boolean {
  return Boolean(id && UUID_RE.test(id));
}

/** Load catalog from API when reads explicitly on, or whenever writes are allowed (DB is authoritative). */
export function catalogShouldLoadFromServer(flags: InvInventoryFeatureFlags): boolean {
  return flags.hub_backend_reads === true || flags.hub_backend_writes !== false;
}

export function inventoryWritesAllowed(flags: InvInventoryFeatureFlags | null): boolean {
  if (!flags) return false;
  return flags.hub_backend_writes !== false;
}

export function inventorySplitAllowed(flags: InvInventoryFeatureFlags | null): boolean {
  if (!flags) return false;
  if (!inventoryWritesAllowed(flags)) return false;
  return flags.disable_client_split !== true;
}

export function itemKindToItemTypeId(itemKind: string, types: InvItemTypeDto[]): string {
  if (itemKind === KIND_ROUGH) {
    const t = types.find((x) => x.code.toLowerCase() === KIND_ROUGH);
    if (!t) throw new Error('Server has no item type with code "rough".');
    return t.id;
  }
  if (itemKind === KIND_CUT) {
    const t = types.find((x) => x.code.toLowerCase() === KIND_CUT);
    if (!t) throw new Error('Server has no item type with code "cut".');
    return t.id;
  }
  const byId = types.find((x) => x.id === itemKind);
  if (!byId) throw new Error("Pick a saved inventory type from the server, or create one in the type builder.");
  return byId.id;
}

function uomTabToPolicy(tab: CustomInventoryType["uomTab"]): string {
  if (tab === "piece") return "uom_plus_pieces";
  return "uom_plus_pieces";
}

export function builderFieldsToJsonSchema(fields: CustomFieldDef[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const f of fields) {
    const key = f.id.trim() || f.label.trim();
    if (!key) continue;
    if (f.kind === "number") {
      properties[key] = { type: "number", title: f.label };
    } else if (f.kind === "dropdown") {
      properties[key] = { type: "string", title: f.label, enum: (f.options ?? []).filter(Boolean) };
    } else {
      properties[key] = { type: "string", title: f.label };
    }
    if (f.required !== false) required.push(key);
  }
  // Field values live under attributes_json.custom (governance-allowed root key), so the
  // schema nests the field definitions under `custom`. The backend coarse-check only looks at
  // top-level `required`, so we keep field keys out of the top level to avoid false warnings.
  return {
    type: "object",
    properties: {
      custom: {
        type: "object",
        properties,
        required: required.length ? required : undefined,
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  };
}

export function customInventoryTypeToApiCreatePayload(
  t: CustomInventoryType,
  codeHint: string,
): { code: string; label: string; kind: string; uom_policy: string; json_schema: Record<string, unknown> | null; standard_field_overrides: Record<string, unknown> | null } {
  const label = t.label.trim();
  const base = codeHint
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  const code = (base || `custom_${Date.now().toString(36)}`).slice(0, 64);
  const json_schema =
    t.builderFields && t.builderFields.length > 0 ? builderFieldsToJsonSchema(t.builderFields) : null;
  const standard_field_overrides =
    t.standardFields && Object.keys(t.standardFields).length > 0 ? (t.standardFields as Record<string, unknown>) : null;
  return {
    code,
    label,
    kind: "custom",
    uom_policy: uomTabToPolicy(t.uomTab),
    json_schema,
    standard_field_overrides,
  };
}

export type ItemFormLike = {
  itemTypeKey: string;
  itemNo: string;
  itemName: string;
  date: string;
  grade: string;
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  uom: string;
  pieces: string;
  rate: string;
  location: string;
  custodian: string;
  details: string;
  customFields: Record<string, string>;
  linkedRoughLotCode: string;
  imageDataUrl?: string | null;
};

/**
 * Downscale a data-URL image into a compact JPEG thumbnail that fits within the
 * stock `attributes_json` budget (server default 32KB). Returns null when running
 * server-side or when the source cannot be decoded so callers simply skip the image.
 */
export async function imageDataUrlToThumbnail(
  dataUrl: string | null | undefined,
  maxBytes = 24000,
): Promise<string | null> {
  if (!dataUrl || typeof document === "undefined") return null;
  const src = dataUrl.trim();
  if (!src.startsWith("data:image/")) {
    // Already a hosted/short URL: keep it only when small enough to store inline.
    return src.length <= maxBytes ? src : null;
  }
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = src;
  });
  if (!img || !img.width || !img.height) return null;
  let dimension = 320;
  let quality = 0.72;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, dimension / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", quality);
    if (out.length <= maxBytes) return out;
    if (quality > 0.4) quality -= 0.15;
    else dimension = Math.round(dimension * 0.75);
  }
  return null;
}

export async function buildAttributesJsonForStock(
  itemTypeKey: string,
  mode: "rough" | "cut" | "builder",
  form: Pick<ItemFormLike, "grade" | "dimLength" | "dimWidth" | "dimHeight" | "customFields" | "imageDataUrl">,
): Promise<Record<string, unknown> | null> {
  // attributes_json must only use governance-allowed root keys (spec/custom/hub/...).
  // Builder field values nest under `custom`; grade/dimensions nest under `spec`;
  // the display image lives under `hub.primary_image_url` (a hub-owned root key).
  const base: Record<string, unknown> = {};
  if (mode === "builder") {
    const custom: Record<string, unknown> = { ...form.customFields };
    if (Object.keys(custom).length) base.custom = custom;
  } else if (mode === "cut") {
    base.spec = {
      dimLength: form.dimLength.trim(),
      dimWidth: form.dimWidth.trim(),
      dimHeight: form.dimHeight.trim(),
    };
  } else {
    const g = form.grade.trim();
    if (g) base.spec = { grade: g };
  }
  const thumb = await imageDataUrlToThumbnail(form.imageDataUrl);
  if (thumb) {
    base.hub = { ...(base.hub as Record<string, unknown> | undefined), primary_image_url: thumb };
  }
  return Object.keys(base).length ? base : null;
}

export async function resolveLocationAndCustodian(
  locationName: string,
  custodianName: string,
  signal?: AbortSignal,
): Promise<{ location_id: string | null; custodian_party_id: string | null }> {
  const loc = locationName.trim();
  const cust = custodianName.trim();
  if (!loc && !cust) return { location_id: null, custodian_party_id: null };
  const res = await resolveInventoryEntities(
    {
      locations: loc ? [loc] : [],
      custodian_display_names: cust ? [cust] : [],
    },
    signal,
  );
  return {
    location_id: loc ? res.locations[loc] ?? null : null,
    custodian_party_id: cust ? res.custodian_parties[cust] ?? null : null,
  };
}

export async function resolveRoughPurchaseLotId(lotCode: string, signal?: AbortSignal): Promise<string | null> {
  const c = lotCode.trim();
  if (!c) return null;
  try {
    const lot = await getPurchaseLotByCode(c, signal);
    return lot.id;
  } catch {
    return null;
  }
}

export async function createStockFromItemForm(params: {
  types: InvItemTypeDto[];
  form: ItemFormLike;
  effUom: number;
  effPieces: number;
  effRate: number;
  mode: "rough" | "cut" | "builder";
  locationEnabled: boolean;
  custodianEnabled: boolean;
  signal?: AbortSignal;
}) {
  const { types, form, effUom, effPieces, effRate, mode, locationEnabled, custodianEnabled } = params;
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
  const cost = effRate * effUom;
  return createStockUnit(
    {
      public_code: form.itemNo.trim(),
      display_name: form.itemName.trim(),
      item_type_id,
      primary_uom_qty: String(effUom),
      primary_uom_code: "ct",
      pieces: Math.floor(effPieces),
      cost_basis_total: String(Math.max(0, cost)),
      list_price_per_uom: effRate > 0 ? String(effRate) : null,
      location_id,
      custodian_party_id,
      custodian_user_id: null,
      purchase_lot_id,
      purchase_lot_line_id: null,
      attributes_json: attrs,
      notes: form.details.trim() || `Received ${form.date.trim() || ""}`.trim(),
      display_item_no: form.itemNo.trim() || null,
    },
    params.signal,
  );
}

export async function patchStockFromItemForm(params: {
  unitId: string;
  expectedRowVersion: number;
  form: ItemFormLike;
  effUom: number;
  effPieces: number;
  effRate: number;
  mode: "rough" | "cut" | "builder";
  locationEnabled: boolean;
  custodianEnabled: boolean;
  signal?: AbortSignal;
}) {
  const { unitId, expectedRowVersion, form, mode, locationEnabled, custodianEnabled } = params;
  const { location_id, custodian_party_id } = await resolveLocationAndCustodian(
    locationEnabled ? form.location : "",
    custodianEnabled ? form.custodian : "",
    params.signal,
  );
  const attrs = await buildAttributesJsonForStock(form.itemTypeKey, mode, form);
  const purchase_lot_id =
    form.itemTypeKey === KIND_ROUGH && form.linkedRoughLotCode.trim()
      ? await resolveRoughPurchaseLotId(form.linkedRoughLotCode, params.signal)
      : null;
  const cost = params.effRate * params.effUom;
  return patchStockUnit(
    unitId,
    {
      display_name: form.itemName.trim(),
      notes: form.details.trim() || null,
      location_id,
      custodian_user_id: null,
      custodian_party_id,
      purchase_lot_id,
      purchase_lot_line_id: null,
      primary_uom_qty: String(params.effUom),
      pieces: Math.floor(params.effPieces),
      cost_basis_total: String(Math.max(0, cost)),
      list_price_per_uom: params.effRate > 0 ? String(params.effRate) : null,
      attributes_json: attrs,
      expected_row_version: expectedRowVersion,
    },
    params.signal,
  );
}

export async function persistCustomInventoryType(params: {
  editingId: string | null;
  nextType: CustomInventoryType;
  codeHint: string;
  signal?: AbortSignal;
}): Promise<InvItemTypeDto> {
  const payload = customInventoryTypeToApiCreatePayload(params.nextType, params.codeHint);
  if (params.editingId && isServerUuid(params.editingId)) {
    return updateItemType(
      params.editingId,
      {
        label: payload.label,
        uom_policy: payload.uom_policy,
        json_schema: payload.json_schema,
        standard_field_overrides: payload.standard_field_overrides,
      },
      params.signal,
    );
  }
  return createItemType(payload, params.signal);
}
