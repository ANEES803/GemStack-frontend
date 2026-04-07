import type { LedgerDrawerData, LedgerRow } from "./types";

const ACCOUNTS: Pick<LedgerRow, "accountCode" | "accountName" | "accountType">[] = [
  { accountCode: "1100", accountName: "Cash — PKR", accountType: "Asset" },
  { accountCode: "1200", accountName: "Accounts receivable", accountType: "Asset" },
  { accountCode: "1300", accountName: "Inventory — Grade A", accountType: "Asset" },
  { accountCode: "2100", accountName: "Accounts payable", accountType: "Liability" },
  { accountCode: "4000", accountName: "Sales revenue", accountType: "Revenue" },
  { accountCode: "5000", accountName: "Cost of sales", accountType: "Expense" },
  { accountCode: "5100", accountName: "Commission expense", accountType: "Expense" },
  { accountCode: "3000", accountName: "Retained earnings", accountType: "Equity" },
];

const CONTACTS = ["Gem Traders LLC", "Sapphire Co.", "—", "Retail Jewels", "Rough Traders Ltd"];
const BRANCHES = ["Head office", "Karachi", "Dubai", "—"];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

export function buildMockLedgerRows(): LedgerRow[] {
  const rows: LedgerRow[] = [];
  const types = ["Journal", "Invoice", "Payment", "Bill"] as const;
  const statuses = ["Posted", "Posted", "Posted", "Draft"] as const;

  let n = 0;
  for (let d = 1; d <= 28; d++) {
    if (d % 3 !== 0 && d % 5 !== 0) continue;
    const date = `2026-03-${String(d).padStart(2, "0")}`;
    const acc = pick(ACCOUNTS, n);
    const debit = n % 4 === 0 ? 0 : 1200 + (n % 7) * 350;
    const credit = n % 4 === 0 ? 800 + (n % 5) * 220 : n % 3 === 0 ? 400 : 0;
    rows.push({
      id: `gl-${n}`,
      date,
      journalNo: `JE-2026-${String(120 + n).padStart(3, "0")}`,
      transactionType: pick(types, n),
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountType: acc.accountType,
      description:
        n % 5 === 0
          ? "Month-end accrual — commission"
          : n % 4 === 0
            ? "Vendor invoice allocation"
            : "Customer receipt allocation",
      reference: n % 2 === 0 ? `INV-${1040 + n}` : `PO-${2400 + n}`,
      debit,
      credit,
      contact: pick(CONTACTS, n),
      branch: pick(BRANCHES, n),
      currency: n % 6 === 0 ? "USD" : "PKR",
      status: pick(statuses, n),
    });
    n++;
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.journalNo.localeCompare(b.journalNo));
}

export function drawerDataForRow(row: LedgerRow): LedgerDrawerData {
  const totalDr = row.debit > 0 ? row.debit : row.credit;
  const lines =
    row.transactionType === "Journal"
      ? [
          { id: "1", account: `${row.accountCode} — ${row.accountName}`, debit: row.debit, credit: 0, memo: row.description },
          {
            id: "2",
            account: row.debit > 0 ? "2200 — FEP commission payable" : "1100 — Cash — PKR",
            debit: row.credit,
            credit: row.debit,
            memo: "Offset",
          },
        ]
      : [
          { id: "1", account: `${row.accountCode} — ${row.accountName}`, debit: row.debit, credit: row.credit, memo: row.description },
          {
            id: "2",
            account: "1100 — Cash — PKR",
            debit: row.credit > row.debit ? totalDr : 0,
            credit: row.debit > row.credit ? totalDr : 0,
            memo: "Cash impact",
          },
        ];

  return {
    row,
    lines,
    attachments: [
      { id: "a1", name: "supporting-scan.pdf", size: "240 KB" },
      { id: "a2", name: "bank-slip.png", size: "89 KB" },
    ],
    notes: "Reviewed by A. Khan — demo entry for GL drill-down.",
  };
}
