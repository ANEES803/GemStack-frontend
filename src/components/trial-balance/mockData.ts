import type { RoundingMode, TbAccountSource, TbMiniLine } from "./types";

const BRANCHES = ["Head office", "Karachi", "Dubai"] as const;

/** Base chart: realistic COA — raw posted/draft; netting happens in page logic. */
const SEED: Omit<TbAccountSource, "id" | "branch" | "currency">[] = [
  { code: "1000", name: "Cash on hand", type: "Asset", postedDebit: 185_400, postedCredit: 0, draftDebit: 2_000, draftCredit: 0, openingBalance: 142_000, priorPostedDebit: 172_000, priorPostedCredit: 0 },
  { code: "1010", name: "Petty cash", type: "Asset", postedDebit: 12_500, postedCredit: 0, draftDebit: 0, draftCredit: 0, openingBalance: 10_000, priorPostedDebit: 11_200, priorPostedCredit: 0 },
  { code: "1100", name: "Bank — operating (PKR)", type: "Asset", postedDebit: 2_840_000, postedCredit: 0, draftDebit: 15_000, draftCredit: 8_000, openingBalance: 2_100_000, priorPostedDebit: 2_650_000, priorPostedCredit: 0 },
  { code: "1110", name: "Bank — USD nostro", type: "Asset", postedDebit: 420_000, postedCredit: 0, draftDebit: 0, draftCredit: 5_000, openingBalance: 380_000, priorPostedDebit: 400_000, priorPostedCredit: 0 },
  { code: "1200", name: "Accounts receivable — trade", type: "Asset", postedDebit: 1_125_600, postedCredit: 0, draftDebit: 48_000, draftCredit: 12_000, openingBalance: 980_000, priorPostedDebit: 1_050_000, priorPostedCredit: 0 },
  { code: "1210", name: "Allowance for doubtful accounts", type: "Asset", postedDebit: 0, postedCredit: 42_000, draftDebit: 0, draftCredit: 3_000, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 38_000 },
  { code: "1300", name: "Inventory — rough gemstones", type: "Asset", postedDebit: 3_200_000, postedCredit: 0, draftDebit: 120_000, draftCredit: 0, openingBalance: 2_850_000, priorPostedDebit: 3_050_000, priorPostedCredit: 0 },
  { code: "1310", name: "Inventory — polished / parcels", type: "Asset", postedDebit: 890_000, postedCredit: 0, draftDebit: 0, draftCredit: 0, openingBalance: 820_000, priorPostedDebit: 860_000, priorPostedCredit: 0 },
  { code: "1500", name: "Prepaid insurance", type: "Asset", postedDebit: 36_000, postedCredit: 0, draftDebit: 0, draftCredit: 0, openingBalance: 48_000, priorPostedDebit: 42_000, priorPostedCredit: 0 },
  { code: "1600", name: "Fixed assets — equipment", type: "Asset", postedDebit: 650_000, postedCredit: 0, draftDebit: 0, draftCredit: 0, openingBalance: 650_000, priorPostedDebit: 650_000, priorPostedCredit: 0 },
  { code: "1610", name: "Accumulated depreciation", type: "Asset", postedDebit: 0, postedCredit: 185_000, draftDebit: 0, draftCredit: 5_000, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 172_000 },
  { code: "2000", name: "Accounts payable — trade", type: "Liability", postedDebit: 0, postedCredit: 756_300, draftDebit: 4_000, draftCredit: 22_000, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 702_000 },
  { code: "2100", name: "FEP commission payable", type: "Liability", postedDebit: 0, postedCredit: 128_400, draftDebit: 0, draftCredit: 6_200, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 115_000 },
  { code: "2200", name: "Accrued expenses", type: "Liability", postedDebit: 0, postedCredit: 54_200, draftDebit: 0, draftCredit: 0, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 61_000 },
  { code: "2300", name: "Short-term bank loan", type: "Liability", postedDebit: 0, postedCredit: 500_000, draftDebit: 0, draftCredit: 0, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 500_000 },
  { code: "3000", name: "Owner capital", type: "Equity", postedDebit: 0, postedCredit: 2_000_000, draftDebit: 0, draftCredit: 0, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 2_000_000 },
  { code: "3100", name: "Retained earnings", type: "Equity", postedDebit: 0, postedCredit: 412_800, draftDebit: 0, draftCredit: 8_000, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 398_000 },
  {
    code: "3200",
    name: "Current year earnings (plug)",
    type: "Equity",
    postedDebit: 0,
    postedCredit: 2_555_800,
    draftDebit: 0,
    draftCredit: 0,
    openingBalance: 0,
    priorPostedDebit: 0,
    priorPostedCredit: 2_400_000,
  },
  { code: "4000", name: "Sales revenue — rough", type: "Revenue", postedDebit: 0, postedCredit: 4_250_000, draftDebit: 0, draftCredit: 35_000, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 3_980_000 },
  { code: "4010", name: "Sales revenue — polished", type: "Revenue", postedDebit: 0, postedCredit: 1_890_000, draftDebit: 0, draftCredit: 0, openingBalance: 0, priorPostedDebit: 0, priorPostedCredit: 1_720_000 },
  { code: "4100", name: "Sales discounts", type: "Revenue", postedDebit: 42_000, postedCredit: 0, draftDebit: 2_000, draftCredit: 0, openingBalance: 0, priorPostedDebit: 38_000, priorPostedCredit: 0 },
  { code: "5000", name: "Cost of sales", type: "Expense", postedDebit: 2_980_000, postedCredit: 0, draftDebit: 85_000, draftCredit: 0, openingBalance: 0, priorPostedDebit: 2_750_000, priorPostedCredit: 0 },
  { code: "5100", name: "Commission expense", type: "Expense", postedDebit: 168_000, postedCredit: 0, draftDebit: 4_500, draftCredit: 0, openingBalance: 0, priorPostedDebit: 152_000, priorPostedCredit: 0 },
  { code: "5200", name: "Rent expense", type: "Expense", postedDebit: 144_000, postedCredit: 0, draftDebit: 0, draftCredit: 0, openingBalance: 0, priorPostedDebit: 144_000, priorPostedCredit: 0 },
  { code: "5300", name: "Utilities & office", type: "Expense", postedDebit: 62_400, postedCredit: 0, draftDebit: 0, draftCredit: 0, openingBalance: 0, priorPostedDebit: 58_200, priorPostedCredit: 0 },
  { code: "5400", name: "Bank charges", type: "Expense", postedDebit: 18_600, postedCredit: 0, draftDebit: 0, draftCredit: 0, openingBalance: 0, priorPostedDebit: 16_800, priorPostedCredit: 0 },
];

function pickBranch(i: number): string {
  return BRANCHES[i % BRANCHES.length]!;
}

export function buildTrialBalanceSource(): TbAccountSource[] {
  return SEED.map((row, i) => ({
    ...row,
    id: `tb-${row.code}`,
    branch: pickBranch(i),
    currency: i % 7 === 0 ? "USD" : "PKR",
  }));
}

export function netToDebitCredit(debit: number, credit: number): { debit: number; credit: number } {
  const net = debit - credit;
  if (net > 0) return { debit: net, credit: 0 };
  if (net < 0) return { debit: 0, credit: -net };
  return { debit: 0, credit: 0 };
}

export function applyRounding(n: number, mode: RoundingMode): number {
  if (!Number.isFinite(n)) return 0;
  switch (mode) {
    case "whole":
      return Math.round(n);
    case "thousands":
      return Math.round(n / 1000) * 1000;
    default:
      return n;
  }
}

export function miniLedgerForAccount(accountId: string, code: string): { lines: TbMiniLine[]; opening: number } {
  const seed = accountId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const opening = 50_000 + (seed % 200) * 1000;
  const lines: TbMiniLine[] = [];
  for (let i = 0; i < 5; i++) {
    const dr = i % 3 === 0 ? 12_000 + (seed % 5) * 800 : 0;
    const cr = i % 3 !== 0 ? 8_500 + (seed % 4) * 600 : 0;
    lines.push({
      id: `${accountId}-ln-${i}`,
      journalEntryId: "00000000-0000-4000-8000-000000000000",
      date: `2026-03-${String(10 + i).padStart(2, "0")}`,
      ref: `JE-2026-${420 + i + (seed % 20)}`,
      memo: i % 2 === 0 ? "Allocation — month end" : `Reclass — ${code}`,
      debit: dr,
      credit: cr,
    });
  }
  return { lines, opening };
}
