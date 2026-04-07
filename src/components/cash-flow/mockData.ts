import type { CfRow, CfTx } from "./types";

/**
 * Indirect-style line labels; amounts are cash effect (inflow + / outflow −).
 * Opening + net change = closing (PKR demo).
 */
export const CASH_FLOW_ROWS: CfRow[] = [
  { id: "sec-op", kind: "section", label: "Operating activities", depth: 0, amount: null },
  { id: "op-cust", kind: "detail", label: "Cash from customers", depth: 1, amount: 1_200_000 },
  { id: "op-sup", kind: "detail", label: "Cash paid to suppliers", depth: 1, amount: -720_000 },
  { id: "op-exp", kind: "detail", label: "Expenses paid", depth: 1, amount: -310_000 },
  { id: "t-op", kind: "total", label: "Net cash from operating activities", depth: 1, amount: 170_000 },

  { id: "sec-inv", kind: "section", label: "Investing activities", depth: 0, amount: null },
  { id: "inv-buy", kind: "detail", label: "Asset purchases", depth: 1, amount: -180_000 },
  { id: "inv-sell", kind: "detail", label: "Asset sales", depth: 1, amount: 45_000 },
  { id: "t-inv", kind: "total", label: "Net cash from investing activities", depth: 1, amount: -135_000 },

  { id: "sec-fin", kind: "section", label: "Financing activities", depth: 0, amount: null },
  { id: "fin-cap", kind: "detail", label: "Capital introduced", depth: 1, amount: 100_000 },
  { id: "fin-loan", kind: "detail", label: "Loans received / (repaid)", depth: 1, amount: -40_000 },
  { id: "t-fin", kind: "total", label: "Net cash from financing activities", depth: 1, amount: 60_000 },

  { id: "sum-net", kind: "grand_total", label: "Net increase (decrease) in cash", depth: 0, amount: 95_000 },
  { id: "sum-open", kind: "summary", label: "Opening cash balance", depth: 0, amount: 400_000 },
  { id: "sum-close", kind: "grand_total", label: "Closing cash balance", depth: 0, amount: 495_000 },
  { id: "check", kind: "check", label: "Reconciliation (opening + net change − closing)", depth: 0, amount: 0 },
];

export function transactionsForCashLine(lineId: string): CfTx[] {
  const base = lineId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return [0, 1, 2, 3].map((i) => ({
    id: `${lineId}-tx-${i}`,
    date: `2026-03-${String(8 + i).padStart(2, "0")}`,
    ref: `CF-${520 + i + (base % 25)}`,
    memo: `Cash movement — ${lineId}`,
    amount: 25_000 + (base % 9) * 6_000 + i * 11_000,
  }));
}
