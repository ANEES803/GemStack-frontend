import type { PlBreakdownLine, PlLine, PlMiniTx } from "./types";

/** Base structure; amounts are period P&L (positive = revenue or expense per convention below). */
const BASE: Omit<PlLine, "prior">[] = [
  { id: "sec-rev", kind: "section", groupId: "revenue", label: "Revenue", depth: 0, current: 0 },
  { id: "d-sales", kind: "detail", groupId: "revenue", label: "Sales revenue", depth: 1, current: 4_200_000 },
  { id: "d-svc", kind: "detail", groupId: "revenue", label: "Service revenue", depth: 1, current: 890_000 },
  { id: "d-oth-inc", kind: "detail", groupId: "revenue", label: "Other income", depth: 1, current: 45_000 },
  { id: "t-rev", kind: "total", groupId: "revenue", label: "Total revenue", depth: 1, current: 5_135_000 },

  { id: "sec-cogs", kind: "section", groupId: "cogs", label: "Cost of goods sold", depth: 0, current: 0 },
  { id: "d-oi", kind: "detail", groupId: "cogs", label: "Opening inventory", depth: 1, current: 1_200_000 },
  { id: "d-pur", kind: "detail", groupId: "cogs", label: "Purchases", depth: 1, current: 2_100_000 },
  { id: "d-dir", kind: "detail", groupId: "cogs", label: "Direct costs", depth: 1, current: 180_000 },
  {
    id: "d-ci",
    kind: "detail",
    groupId: "cogs",
    label: "Closing inventory",
    depth: 1,
    current: -950_000,
    creditStyle: true,
  },
  { id: "t-cogs", kind: "total", groupId: "cogs", label: "Total cost of goods sold", depth: 1, current: 2_530_000 },

  { id: "m-gp", kind: "margin", groupId: "gross", label: "Gross profit", depth: 0, current: 2_605_000 },

  { id: "sec-opex", kind: "section", groupId: "opex", label: "Operating expenses", depth: 0, current: 0 },
  { id: "d-sal", kind: "detail", groupId: "opex", label: "Salaries & wages", depth: 1, current: 980_000 },
  { id: "d-rent", kind: "detail", groupId: "opex", label: "Rent", depth: 1, current: 216_000 },
  { id: "d-util", kind: "detail", groupId: "opex", label: "Utilities", depth: 1, current: 64_000 },
  { id: "d-mkt", kind: "detail", groupId: "opex", label: "Marketing", depth: 1, current: 142_000 },
  { id: "d-dep", kind: "detail", groupId: "opex", label: "Depreciation", depth: 1, current: 85_000 },
  { id: "t-opex", kind: "total", groupId: "opex", label: "Total operating expenses", depth: 1, current: 1_487_000 },

  { id: "m-op", kind: "margin", groupId: "op", label: "Operating profit", depth: 0, current: 1_118_000 },

  { id: "sec-other", kind: "section", groupId: "other", label: "Other income & expense", depth: 0, current: 0 },
  { id: "d-int-inc", kind: "detail", groupId: "other", label: "Interest income", depth: 1, current: 12_000 },
  { id: "d-int-exp", kind: "detail", groupId: "other", label: "Interest expense", depth: 1, current: 48_000 },
  { id: "t-other", kind: "total", groupId: "other", label: "Net other income (expense)", depth: 1, current: -36_000 },

  { id: "m-np", kind: "margin", groupId: "net", label: "Net profit", depth: 0, current: 1_082_000 },
];

const PRIOR_FACTOR_PERIOD = 0.91;
const PRIOR_FACTOR_YEAR = 0.82;

export function buildPlLines(mode: "previous_period" | "previous_year" | "none"): PlLine[] {
  if (mode === "none") {
    return BASE.map((row) => ({ ...row, prior: 0 }));
  }
  const factor = mode === "previous_year" ? PRIOR_FACTOR_YEAR : PRIOR_FACTOR_PERIOD;
  return BASE.map((row) => {
    let prior = 0;
    if (row.kind === "detail") {
      prior = row.current * factor * (0.97 + (row.id.length % 5) * 0.01);
    } else if (row.kind === "total" || row.kind === "margin") {
      prior = row.current * factor;
    }
    return { ...row, prior };
  });
}

export function breakdownForLine(lineId: string): PlBreakdownLine[] {
  const map: Record<string, PlBreakdownLine[]> = {
    "d-sales": [
      { id: "b1", name: "Rough sales — export", amount: 2_450_000 },
      { id: "b2", name: "Polished sales — domestic", amount: 1_180_000 },
      { id: "b3", name: "Consignment releases", amount: 570_000 },
    ],
    "d-svc": [
      { id: "b1", name: "Sorting & grading fees", amount: 520_000 },
      { id: "b2", name: "Certification services", amount: 370_000 },
    ],
    "d-pur": [
      { id: "b1", name: "Bulk rough purchases", amount: 1_620_000 },
      { id: "b2", name: "Parcel acquisitions", amount: 480_000 },
    ],
    "d-sal": [
      { id: "b1", name: "Payroll — operations", amount: 620_000 },
      { id: "b2", name: "Payroll — admin & sales", amount: 360_000 },
    ],
  };
  return (
    map[lineId] ?? [
      { id: "x1", name: "Default allocation (demo)", amount: 0 },
      { id: "x2", name: "Unallocated", amount: 0 },
    ]
  );
}

export function miniLedgerForPlLine(lineId: string, label: string): PlMiniTx[] {
  const seed = lineId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rows: PlMiniTx[] = [];
  for (let i = 0; i < 4; i++) {
    rows.push({
      id: `${lineId}-tx-${i}`,
      date: `2026-03-${String(5 + i).padStart(2, "0")}`,
      ref: `PL-${420 + i + (seed % 30)}`,
      memo: `${label.slice(0, 24)} — posting`,
      amount: 18_000 + (seed % 8) * 3_200 + i * 4_100,
    });
  }
  return rows;
}

/** Fill breakdown amounts for generic lines so drawer is not empty. */
export function breakdownWithAmounts(lineId: string, total: number): PlBreakdownLine[] {
  const raw = breakdownForLine(lineId);
  if (raw.length >= 2 && raw.every((r) => r.amount === 0)) {
    const a = Math.round(total * 0.55);
    const b = total - a;
    return [
      { id: "a", name: "Primary activity", amount: a },
      { id: "b", name: "Secondary / adjustments", amount: b },
    ];
  }
  return raw;
}
