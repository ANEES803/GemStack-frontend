/**
 * Inventory Hub browser persistence is for guests only (no auth token).
 * Signed-in users must use `/inv/*` APIs; do not read or write these keys.
 */

import { getAccessToken } from "@/lib/authClient";

/** Keys written by Inventory Hub / item catalog demo storage. */
export const INVENTORY_LOCAL_STORAGE_KEYS = [
  "gemstack-items-catalog-v1",
  "gemstack-inventory-audit-records-v1",
  "gemstack-inventory-audit-closed-ids-v1",
  "gemstack-inventory-custom-locations-v1",
  "gemstack-inventory-custom-custodians-v1",
  "gemstack-inventory-custom-categories-v1",
  "gemstack-inventory-hidden-location-presets-v1",
  "gemstack-inventory-hidden-custodian-presets-v1",
  "gemstack-inventory-hidden-category-presets-v1",
] as const;

/** True when inventory may use localStorage (signed-out / demo). */
export function isInventoryGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  return !getAccessToken();
}

/** Remove stale inventory keys after sign-in so DevTools does not show old data. */
export function clearInventoryLocalStorageKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of INVENTORY_LOCAL_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* private mode / quota */
    }
  }
}
