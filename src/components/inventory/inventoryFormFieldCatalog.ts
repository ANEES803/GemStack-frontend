/**
 * Configurable “standard” fields on the New Item form for custom inventory types.
 * Built-in Rough/Cut ignore this and always show the full form.
 */

export const BUILTIN_STANDARD_FIELD_IDS = [
  "lineType",
  "uomQty",
  "pieces",
  "rate",
  "location",
  "custodian",
  "details",
] as const;

export type BuiltinStandardFieldId = (typeof BUILTIN_STANDARD_FIELD_IDS)[number];

export type StandardFieldRule = { enabled: boolean; required: boolean };

export type StandardFieldCatalogEntry = {
  id: BuiltinStandardFieldId;
  label: string;
  description: string;
  /** Sensible default when configuring a new custom type */
  defaultRule: StandardFieldRule;
};

export const INVENTORY_STANDARD_FIELD_CATALOG: readonly StandardFieldCatalogEntry[] = [
  {
    id: "lineType",
    label: "Line type",
    description: "Product / Service / Raw",
    defaultRule: { enabled: true, required: false },
  },
  {
    id: "uomQty",
    label: "UOM quantity",
    description: "Stock or weight quantity for pricing",
    defaultRule: { enabled: true, required: true },
  },
  {
    id: "pieces",
    label: "Pieces",
    description: "Count of discrete units",
    defaultRule: { enabled: true, required: true },
  },
  {
    id: "rate",
    label: "Rate",
    description: "Unit price (amount = UOM × rate)",
    defaultRule: { enabled: true, required: true },
  },
  {
    id: "location",
    label: "Location",
    description: "Storage or bin",
    defaultRule: { enabled: true, required: false },
  },
  {
    id: "custodian",
    label: "Custodian",
    description: "Responsible person",
    defaultRule: { enabled: true, required: false },
  },
  {
    id: "details",
    label: "Details / notes",
    description: "Free-text notes",
    defaultRule: { enabled: true, required: false },
  },
] as const;

const DEFAULT_MAP: Record<BuiltinStandardFieldId, StandardFieldRule> = INVENTORY_STANDARD_FIELD_CATALOG.reduce(
  (acc, e) => {
    acc[e.id] = { ...e.defaultRule };
    return acc;
  },
  {} as Record<BuiltinStandardFieldId, StandardFieldRule>,
);

export function defaultStandardFieldRules(): Record<BuiltinStandardFieldId, StandardFieldRule> {
  return { ...DEFAULT_MAP };
}

export function mergeStandardFields(
  partial?: Partial<Record<BuiltinStandardFieldId, StandardFieldRule>>,
): Record<BuiltinStandardFieldId, StandardFieldRule> {
  const out: Record<BuiltinStandardFieldId, StandardFieldRule> = { ...DEFAULT_MAP };
  if (!partial) return out;
  for (const id of BUILTIN_STANDARD_FIELD_IDS) {
    const o = partial[id];
    if (!o) continue;
    out[id] = {
      enabled: o.enabled,
      required: o.required && o.enabled,
    };
  }
  return out;
}

export function resolveStandardFieldRule(
  id: BuiltinStandardFieldId,
  partial?: Partial<Record<BuiltinStandardFieldId, StandardFieldRule>>,
): StandardFieldRule {
  const base = DEFAULT_MAP[id];
  const o = partial?.[id];
  if (!o) return { ...base };
  return {
    enabled: o.enabled,
    required: o.required && o.enabled,
  };
}
