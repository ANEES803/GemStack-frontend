/**
 * Map GL journal source metadata to in-app navigation when supported.
 */

export type GlSourceLink = {
  href: string;
  label: string;
};

/**
 * Resolve a deep link for a posted journal's source document, if known.
 */
export function resolveGlSourceLink(sourceType: string | null | undefined, sourceId: string | null | undefined): GlSourceLink | null {
  const st = (sourceType || "").trim().toLowerCase();
  const sid = (sourceId || "").trim();
  if (!st || !sid) return null;

  if (st === "sales_invoice") {
    return { href: `/sales?highlight=${encodeURIComponent(sid)}`, label: "View sales invoice" };
  }
  if (st === "purchase_lot_receipt") {
    return { href: `/purchases?highlight=${encodeURIComponent(sid)}`, label: "View purchase receipt" };
  }
  if (st === "lot_payment") {
    return { href: `/purchases?tab=payments&highlight=${encodeURIComponent(sid)}`, label: "View lot payment" };
  }
  return null;
}
