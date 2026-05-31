/**
 * Persists the demo item catalog so Sales / Accounting screens can read service lines.
 * Shape mirrors `ItemRow` in InventoryHub (keep fields in sync when extending).
 * Signed-in users: no localStorage (inventory loads from `/inv/*`).
 */
import type { ItemKindKey } from "@/components/inventory/inventoryItemTypes";
import { isInventoryGuestMode } from "@/lib/inventoryLocalPersistence";

export type StoredItemRow = {
  id: string;
  entryType: "inventory" | "service";
  imageDataUrl: string | null;
  itemNo: string;
  date: string;
  itemName: string;
  itemKind: ItemKindKey;
  category: string;
  type: "Product" | "Service" | "Raw";
  grade: string;
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  uom: number;
  pieces: number;
  rate: number;
  location: string;
  custodian: string;
  details: string;
  customFieldValuesJson: string;
  serviceUnit: string;
  /** COA account id for service revenue recognition (demo); empty for inventory */
  revenueAccountId: string;
  /** Lot code when item kind is Rough and linked to a rough purchase lot (demo) */
  linkedRoughLotCode: string;
  /** Optional: row synced from `inv_stock_units` */
  serverUnitId?: string;
  rowVersion?: number;
  serverItemTypeId?: string;
  /** Optional: row synced from `inv_services` */
  serverServiceId?: string;
  serverParentUnitId?: string | null;
  serverCustodianUserId?: string | null;
};

const STORAGE_KEY = "gemstack-items-catalog-v1";

export function loadItemCatalog(): StoredItemRow[] | null {
  if (typeof window === "undefined" || !isInventoryGuestMode()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as StoredItemRow[];
  } catch {
    return null;
  }
}

export function saveItemCatalog(rows: StoredItemRow[]): void {
  if (typeof window === "undefined" || !isInventoryGuestMode()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

export function loadServiceItemsForSelect(): StoredItemRow[] {
  const all = loadItemCatalog();
  if (!all) return [];
  return all.filter((r) => r.entryType === "service");
}
