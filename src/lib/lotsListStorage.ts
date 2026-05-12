/**
 * Demo persistence for the Lots list table (bulk purchase lines).
 */

export type LotListRow = {
  /** Set when row comes from API (for delete). */
  id?: string;
  code: string;
  supplier: string;
  carats: number;
  caratsDisplay: string;
  cost: number;
  costDisplay: string;
  dateIso: string;
  dateDisplay: string;
  /** From API: settlement + commercial terms, e.g. "Paid · Net 30". */
  paymentSummary?: string;
  /** From API: true when balance remains and lot is not fully paid. */
  canRecordPayment?: boolean;
};

const STORAGE_KEY = "gemstack-lots-list-v1";

export const DEFAULT_LOTS_SEED: LotListRow[] = [
  {
    code: "LO-09",
    supplier: "Sapphire Co.",
    carats: 312,
    caratsDisplay: "312.0",
    cost: 48200,
    costDisplay: "$48,200",
    dateIso: "2026-03-12",
    dateDisplay: "Mar 12, 2026",
  },
  {
    code: "LO-08",
    supplier: "Global Gems Ltd",
    carats: 145.5,
    caratsDisplay: "145.5",
    cost: 22900,
    costDisplay: "$22,900",
    dateIso: "2026-02-28",
    dateDisplay: "Feb 28, 2026",
  },
  {
    code: "LO-07",
    supplier: "Sapphire Co.",
    carats: 228,
    caratsDisplay: "228.0",
    cost: 31400,
    costDisplay: "$31,400",
    dateIso: "2026-02-02",
    dateDisplay: "Feb 02, 2026",
  },
  {
    code: "LO-06",
    supplier: "Ceylon Traders",
    carats: 88,
    caratsDisplay: "88.0",
    cost: 14200,
    costDisplay: "$14,200",
    dateIso: "2026-01-18",
    dateDisplay: "Jan 18, 2026",
  },
];

export function formatLotDisplays(carats: number, cost: number, dateIso: string): Pick<LotListRow, "caratsDisplay" | "costDisplay" | "dateDisplay"> {
  const caratsDisplay = Number.isInteger(carats) ? String(carats) : carats.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const costDisplay = `$${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const d = new Date(dateIso + "T12:00:00");
  const dateDisplay = Number.isNaN(d.getTime())
    ? dateIso
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return { caratsDisplay, costDisplay, dateDisplay };
}

/** Build a row from form values; keeps `code` stable. */
export function lotRowFromForm(
  code: string,
  supplier: string,
  carats: number,
  cost: number,
  dateIso: string,
): LotListRow {
  const fmt = formatLotDisplays(carats, cost, dateIso);
  return {
    code: code.trim(),
    supplier: supplier.trim(),
    carats,
    caratsDisplay: fmt.caratsDisplay,
    cost,
    costDisplay: fmt.costDisplay,
    dateIso: dateIso.trim(),
    dateDisplay: fmt.dateDisplay,
  };
}

/** Loads saved demo rows only; no placeholder seed (avoids flashing fake lots before API data). */
export function loadLots(): LotListRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed as LotListRow[];
  } catch {
    return [];
  }
}

export function saveLots(rows: LotListRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function updateLotInList(rows: LotListRow[], updated: LotListRow, originalCode?: string): LotListRow[] {
  const lookupCode = (originalCode ?? updated.code).trim();
  const i = rows.findIndex((r) => r.code === lookupCode);
  if (i < 0) return [updated, ...rows];
  const next = [...rows];
  next[i] = updated;
  return next;
}
