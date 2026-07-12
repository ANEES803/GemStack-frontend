/** Thousands separators + decimals without `toLocaleString` so SSR (Node) and the browser always match. */
function withGrouping(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatAbsPKR(abs: number): string {
  const [intPart, dec] = abs.toFixed(2).split(".");
  const decTrimmed = dec.replace(/0+$/, "");
  const frac = decTrimmed ? `.${decTrimmed}` : "";
  return `${withGrouping(intPart)}${frac}`;
}

function formatAbsUSD(abs: number): string {
  const [intPart, dec] = abs.toFixed(2).split(".");
  return `${withGrouping(intPart)}.${dec}`;
}

export function formatMoney(n: number, currency: string = "USD"): string {
  if (!Number.isFinite(n)) return "—";
  const neg = n < 0;
  const v = Math.abs(n);
  const sign = neg ? "-" : "";
  const c = (currency || "USD").toUpperCase();
  if (c === "PKR") {
    return `Rs ${sign}${formatAbsPKR(v)}`;
  }
  if (c === "USD") {
    return `$${sign}${formatAbsUSD(v)}`;
  }
  return `${c} ${sign}${formatAbsUSD(v)}`;
}

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const neg = n < 0;
  const v = Math.abs(n);
  const [intPart, dec] = v.toFixed(2).split(".");
  const decTrimmed = dec.replace(/0+$/, "");
  const frac = decTrimmed ? `.${decTrimmed}` : "";
  return `${neg ? "-" : ""}${withGrouping(intPart)}${frac}%`;
}
