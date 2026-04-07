export type TransactionType = "Invoice" | "Bill" | "Payment" | "Journal";

export type PostingStatus = "Posted" | "Draft";

export type AccountTypeFilter = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export type LedgerRow = {
  id: string;
  date: string;
  journalNo: string;
  transactionType: TransactionType;
  accountCode: string;
  accountName: string;
  accountType: AccountTypeFilter;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  contact: string;
  branch: string;
  currency: "PKR" | "USD";
  status: PostingStatus;
};

export type JournalLine = {
  id: string;
  account: string;
  debit: number;
  credit: number;
  memo: string;
};

export type LedgerDrawerData = {
  row: LedgerRow;
  lines: JournalLine[];
  attachments: { id: string; name: string; size: string }[];
  notes: string;
};

export type ColumnId =
  | "date"
  | "journalNo"
  | "transactionType"
  | "account"
  | "description"
  | "reference"
  | "debit"
  | "credit"
  | "runningBalance";

export type SortKey = ColumnId;
export type SortDir = "asc" | "desc";

export type GroupByMode = "none" | "account" | "date" | "type";

export type GlSettings = {
  showRunningBalance: boolean;
  showZeroBalances: boolean;
  compactView: boolean;
  defaultSortKey: SortKey;
  defaultSortDir: SortDir;
};

export const DEFAULT_GL_SETTINGS: GlSettings = {
  showRunningBalance: true,
  showZeroBalances: false,
  compactView: false,
  defaultSortKey: "date",
  defaultSortDir: "asc",
};

export const COLUMN_LABELS: Record<ColumnId, string> = {
  date: "Date",
  journalNo: "Journal No",
  transactionType: "Transaction Type",
  account: "Account",
  description: "Description",
  reference: "Reference",
  debit: "Debit",
  credit: "Credit",
  runningBalance: "Running Balance",
};
