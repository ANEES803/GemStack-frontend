import type { BsRow, BsTx } from "./types";

/** Balanced snapshot: total assets = liabilities + equity (PKR demo). */
export const BALANCE_SHEET_ROWS: BsRow[] = [
  { id: "sec-assets", kind: "section", label: "Assets", depth: 0, amount: null },

  { id: "sub-ca", kind: "subsection", label: "Current assets", depth: 1, amount: null },
  { id: "cash", kind: "detail", label: "Cash and bank", depth: 2, amount: 520_000 },
  { id: "ar", kind: "detail", label: "Accounts receivable", depth: 2, amount: 310_000 },
  { id: "inv", kind: "detail", label: "Inventory", depth: 2, amount: 60_000 },
  { id: "t-ca", kind: "total", label: "Total current assets", depth: 1, amount: 890_000 },

  { id: "sub-nca", kind: "subsection", label: "Non-current assets", depth: 1, amount: null },
  { id: "ppe", kind: "detail", label: "Property & equipment", depth: 2, amount: 1_100_000 },
  { id: "ad", kind: "detail", label: "Accumulated depreciation", depth: 2, amount: -280_000 },
  { id: "t-nca", kind: "total", label: "Total non-current assets", depth: 1, amount: 820_000 },

  { id: "t-assets", kind: "grand_total", label: "Total assets", depth: 0, amount: 1_710_000 },

  { id: "sec-liab", kind: "section", label: "Liabilities", depth: 0, amount: null },

  { id: "sub-cl", kind: "subsection", label: "Current liabilities", depth: 1, amount: null },
  { id: "ap", kind: "detail", label: "Accounts payable", depth: 2, amount: 380_000 },
  { id: "acc", kind: "detail", label: "Accrued expenses", depth: 2, amount: 120_000 },
  { id: "t-cl", kind: "total", label: "Total current liabilities", depth: 1, amount: 500_000 },

  { id: "sub-ncl", kind: "subsection", label: "Non-current liabilities", depth: 1, amount: null },
  { id: "loan", kind: "detail", label: "Long-term loan", depth: 2, amount: 430_000 },
  { id: "t-ncl", kind: "total", label: "Total non-current liabilities", depth: 1, amount: 430_000 },

  { id: "t-liab", kind: "grand_total", label: "Total liabilities", depth: 0, amount: 930_000 },

  { id: "sec-eq", kind: "section", label: "Equity", depth: 0, amount: null },

  { id: "cap", kind: "detail", label: "Capital", depth: 1, amount: 500_000 },
  { id: "re", kind: "detail", label: "Retained earnings", depth: 1, amount: 280_000 },
  { id: "t-eq", kind: "grand_total", label: "Total equity", depth: 0, amount: 780_000 },

  { id: "t-le", kind: "grand_total", label: "Total liabilities + equity", depth: 0, amount: 1_710_000 },
  { id: "check", kind: "check", label: "Balance check (assets − liabilities − equity)", depth: 0, amount: 0 },
];

export function transactionsForAccount(accountId: string): BsTx[] {
  const base = accountId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return [0, 1, 2, 3].map((i) => ({
    id: `${accountId}-tx-${i}`,
    date: `2026-03-${String(15 + i).padStart(2, "0")}`,
    ref: `JE-${480 + i + (base % 20)}`,
    memo: `Balance sheet movement — ${accountId}`,
    amount: 12_000 + (base % 7) * 5_000 + i * 8_200,
  }));
}
