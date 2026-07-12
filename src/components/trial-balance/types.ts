export type AccountTypeTB = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

export type TbColumnId = "code" | "name" | "type" | "debit" | "credit" | "priorDebit" | "priorCredit";

export type SortKeyTB = TbColumnId;

export type SortDirTB = "asc" | "desc";

export type RoundingMode = "none" | "whole" | "thousands";

export type TbSettings = {
  showAccountCodes: boolean;
  showAccountType: boolean;
  compactView: boolean;
  defaultSortKey: SortKeyTB;
  defaultSortDir: SortDirTB;
  rounding: RoundingMode;
};

export const DEFAULT_TB_SETTINGS: TbSettings = {
  showAccountCodes: true,
  showAccountType: true,
  compactView: false,
  defaultSortKey: "code",
  defaultSortDir: "asc",
  rounding: "none",
};

export const TB_COLUMN_LABELS: Record<TbColumnId, string> = {
  code: "Account code",
  name: "Account name",
  type: "Account type",
  debit: "Debit",
  credit: "Credit",
  priorDebit: "Prior debit",
  priorCredit: "Prior credit",
};

export type TbAccountSource = {
  id: string;
  code: string;
  name: string;
  type: AccountTypeTB;
  branch: string;
  currency: "PKR" | "USD";
  postedDebit: number;
  postedCredit: number;
  draftDebit: number;
  draftCredit: number;
  openingBalance: number;
  priorPostedDebit: number;
  priorPostedCredit: number;
};

export type TbDisplayRow = {
  id: string;
  code: string;
  name: string;
  type: AccountTypeTB;
  branch: string;
  currency: "PKR" | "USD";
  debit: number;
  credit: number;
  priorDebit: number;
  priorCredit: number;
  openingBalance: number;
};

export type TbMiniLine = {
  id: string;
  journalEntryId: string;
  date: string;
  ref: string;
  memo: string;
  debit: number;
  credit: number;
};
