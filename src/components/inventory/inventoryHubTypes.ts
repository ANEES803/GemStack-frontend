/**
 * Shared row types for InventoryHub and server hydration (`inventoryHubDataBridge`).
 * Keep in sync with `StoredItemRow` in `@/lib/itemCatalogStorage`.
 */

import type { ItemKindKey } from "@/components/inventory/inventoryItemTypes";

export type ItemLineEntryType = "inventory" | "service";

/** One catalog line in the Hub table (local demo and/or server-backed). */
export type ItemRow = {
  id: string;
  entryType: ItemLineEntryType;
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
  revenueAccountId: string;
  linkedRoughLotCode: string;
  /**
   * When set, this inventory row is backed by `inv_stock_units.id`.
   * Usually equals `id` for server-hydrated stock lines.
   */
  serverUnitId?: string;
  /** Optimistic concurrency for PATCH/split parent (`inv_stock_units.row_version`). */
  rowVersion?: number;
  /** `inv_item_types.id` for the stock line (redundant with `itemKind` for custom UUID kinds). */
  serverItemTypeId?: string;
  /** `inv_services.id` for service rows created on the server. */
  serverServiceId?: string;
  /** Parent stock unit when this row is a split child (`inv_stock_units.parent_unit_id`). */
  serverParentUnitId?: string | null;
  /** `inv_stock_units.custodian_user_id` when hydrated from the server. */
  serverCustodianUserId?: string | null;
  /** Owning purchase lot for this stock unit (used for mass-balance + Lineage). */
  serverPurchaseLotId?: string | null;
  /** Owning purchase lot line for this stock unit. */
  serverPurchaseLotLineId?: string | null;
  /** True once the stock unit is frozen (e.g. sold). Adjust actions are refused. */
  isLocked?: boolean;
  /** Human-readable reason the unit was frozen (`Sold on INV-101`). */
  lockReason?: string | null;
};
