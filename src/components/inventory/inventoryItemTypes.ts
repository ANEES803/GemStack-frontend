/**
 * Inventory “item kinds” (Rough vs Cut vs user-defined).
 * Rough is fixed (grade) — do not change its structure in code.
 */

import type { BuiltinStandardFieldId, StandardFieldRule } from "@/components/inventory/inventoryFormFieldCatalog";

export const KIND_ROUGH = "rough" as const;
export const KIND_CUT = "cut" as const;

export type BuiltinInventoryKind = typeof KIND_ROUGH | typeof KIND_CUT;

export type UomTab = "kg" | "liter" | "piece" | "custom";

export type CustomFieldKind = "text" | "number" | "dropdown";

export type CustomFieldDef = {
  id: string;
  label: string;
  kind: CustomFieldKind;
  /** Dropdown options (labels) */
  options?: string[];
  /** When false, empty values are allowed on save. Default true. */
  required?: boolean;
};

export type CustomInventoryType = {
  id: string;
  label: string;
  uomTab: UomTab;
  customUomLabel?: string;
  /**
   * Dynamic fields for this type. When non-empty, item form renders these instead of Rough/Cut mirrors.
   */
  builderFields?: CustomFieldDef[];
  /**
   * Legacy: when `builderFields` is empty, mirror Rough (grade) or Cut (dimensions).
   */
  fieldPreset?: BuiltinInventoryKind;
  /**
   * Per-field visibility for standard New Item fields (custom types only; Rough/Cut ignore this).
   */
  standardFields?: Partial<Record<BuiltinStandardFieldId, StandardFieldRule>>;
};

export type ItemKindKey = BuiltinInventoryKind | string;

export type InventoryTypeUiMode = "rough" | "cut" | "builder";

export function isBuiltinKind(k: string): k is BuiltinInventoryKind {
  return k === KIND_ROUGH || k === KIND_CUT;
}

/** How to render type-specific fields for an item row / form */
export function getInventoryTypeUiMode(kind: ItemKindKey, customTypes: readonly CustomInventoryType[]): InventoryTypeUiMode {
  if (kind === KIND_ROUGH) return "rough";
  if (kind === KIND_CUT) return "cut";
  const c = customTypes.find((t) => t.id === kind);
  if (c?.builderFields && c.builderFields.length > 0) return "builder";
  if (c?.fieldPreset === KIND_CUT) return "cut";
  return "rough";
}

/** Legacy helper for CSV / migrations — grade vs fixed dims when not using builder */
export function fieldPresetForKind(kind: ItemKindKey, customTypes: readonly CustomInventoryType[]): BuiltinInventoryKind {
  const mode = getInventoryTypeUiMode(kind, customTypes);
  if (mode === "rough") return KIND_ROUGH;
  if (mode === "cut") return KIND_CUT;
  return KIND_ROUGH;
}

export function kindLabel(kind: ItemKindKey, customTypes: readonly CustomInventoryType[]): string {
  if (kind === KIND_ROUGH) return "Rough";
  if (kind === KIND_CUT) return "Cut";
  return customTypes.find((t) => t.id === kind)?.label ?? kind;
}

export function uomHintForKind(kind: ItemKindKey, customTypes: readonly CustomInventoryType[]): string {
  if (kind === KIND_ROUGH) return "";
  if (kind === KIND_CUT) return "";
  const c = customTypes.find((t) => t.id === kind);
  if (!c) return "";
  if (c.uomTab === "custom" && c.customUomLabel?.trim()) return c.customUomLabel.trim();
  const labels: Record<UomTab, string> = {
    kg: "kg",
    liter: "L",
    piece: "pc",
    custom: "",
  };
  return labels[c.uomTab] || "";
}

export function newFieldId(): string {
  return `fld-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
