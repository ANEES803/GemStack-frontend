/**
 * Helpers for sales invoice lines tied to inventory stock units.
 */

import type { InvStockUnitDto } from "@/lib/invApi";

export type InvoiceCartLine = {
  id: string;
  stockUnitId: string;
  item: string;
  description: string;
  qty: string;
  rate: string;
  unit?: InvStockUnitDto;
};

export function isSellableStockUnit(u: InvStockUnitDto): boolean {
  return u.status === "active" && !u.is_locked && Number(u.primary_uom_qty) > 0;
}

/** Per-uom sale price sent to the API as unit_price (backend: line_total = stock qty × unit_price). */
export function unitSaleRate(u: InvStockUnitDto): string {
  const qty = Number(u.primary_uom_qty);
  const total = suggestedParcelSaleTotal(u);
  if (qty > 0 && total > 0) return String(total / qty);
  if (u.list_price_per_uom != null && Number(u.list_price_per_uom) > 0) {
    return String(u.list_price_per_uom);
  }
  const cost = Number(u.cost_basis_total);
  if (qty > 0 && cost > 0) return String(cost / qty);
  return "0";
}

/** Whole-parcel sale amount suggested when the line is added (list total or inventory cost). */
export function suggestedParcelSaleTotal(u: InvStockUnitDto): number {
  const qty = Number(u.primary_uom_qty);
  const cost = Number(u.cost_basis_total);
  const listPerUom = u.list_price_per_uom != null ? Number(u.list_price_per_uom) : 0;
  if (listPerUom > 0 && qty > 0) return listPerUom * qty;
  return cost > 0 ? cost : 0;
}

export function lineSaleTotal(line: Pick<InvoiceCartLine, "qty" | "rate">): number {
  const qty = Number(line.qty || 0);
  const rate = Number(line.rate || 0);
  if (!Number.isFinite(qty) || !Number.isFinite(rate)) return 0;
  return qty * rate;
}

export function stockUnitToCartLine(u: InvStockUnitDto): InvoiceCartLine {
  const qty = String(u.primary_uom_qty || "1");
  return {
    id: crypto.randomUUID(),
    stockUnitId: u.id,
    item: u.public_code || u.display_name,
    description: u.display_name,
    qty,
    rate: unitSaleRate(u),
    unit: u,
  };
}

export function gradeFromAttributes(attrs: Record<string, unknown> | null | undefined): string {
  if (!attrs) return "";
  if (typeof attrs.grade === "string") return attrs.grade;
  const spec = attrs.spec;
  if (spec && typeof spec === "object" && typeof (spec as { grade?: string }).grade === "string") {
    return (spec as { grade: string }).grade;
  }
  return "";
}

export function imageUrlFromAttributes(attrs: Record<string, unknown> | null | undefined): string | null {
  if (!attrs) return null;
  const media = attrs.media;
  if (media && typeof media === "object") {
    const url = (media as { primary_image_url?: string }).primary_image_url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  if (typeof attrs.primary_image_url === "string" && attrs.primary_image_url.trim()) {
    return attrs.primary_image_url.trim();
  }
  return null;
}
