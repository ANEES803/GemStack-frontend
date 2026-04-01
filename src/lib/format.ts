/** Fixed locale so SSR and browser produce identical strings (avoids hydration mismatches). */
const LOCALE = "en-US";

export function formatMoney(n: number, currency: "USD" | "PKR" = "USD"): string {
  if (!Number.isFinite(n)) return "—";
  if (currency === "PKR") {
    return `Rs ${n.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `$${n.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}
