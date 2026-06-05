/**
 * Inventory is backend-only and requires sign-in. It never persists to localStorage.
 * These helpers remain to clear any legacy keys written by older builds.
 */

/** Legacy keys written by older Inventory Hub / item catalog demo builds (cleared on load). */
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

/**
 * Inventory no longer supports a guest/localStorage mode. Always false so every
 * legacy persistence branch becomes a no-op and all data flows through `/inv/*`.
 */
export function isInventoryGuestMode(): boolean {
  return false;
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
