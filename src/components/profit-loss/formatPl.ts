import { formatMoney } from "@/lib/format";

import type { PlRounding } from "./types";

export function roundPlAmount(n: number, decimals: PlRounding): number {
  if (!Number.isFinite(n)) return 0;
  if (decimals === 0) return Math.round(n);
  return Math.round(n * 100) / 100;
}

export function formatPlAmount(n: number, currency: "PKR" | "USD", decimals: PlRounding): string {
  const r = roundPlAmount(n, decimals);
  const s = formatMoney(r, currency);
  if (decimals === 0) {
    return s.replace(/\.00\b/, "").replace(/\.\d+$/, "");
  }
  return s;
}

export function formatPlPercent(n: number, decimals: PlRounding): string {
  if (!Number.isFinite(n)) return "—";
  const r = decimals === 0 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${r}%`;
}
