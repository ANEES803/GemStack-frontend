export type PlRowKind = "section" | "detail" | "total" | "margin";

export type ComparisonMode = "none" | "previous_period" | "previous_year";

export type AccountingMethod = "Accrual" | "Cash";


export type PlRounding = 0 | 2;

export type PlSettings = {
  showComparison: boolean;
  compactView: boolean;
  showPercentages: boolean;
  roundingDecimals: PlRounding;
};

export const DEFAULT_PL_SETTINGS: PlSettings = {
  showComparison: true,
  compactView: false,
  showPercentages: true,
  roundingDecimals: 2,
};

export type PlLine = {
  id: string;
  kind: PlRowKind;
  /** Collapsible group id (section rows and their children share this). */
  groupId: string;
  label: string;
  depth: number;
  current: number;
  prior: number;
  /** When true, negative amounts render in parentheses (e.g. closing inventory). */
  creditStyle?: boolean;
};

export type PlBreakdownLine = {
  id: string;
  name: string;
  amount: number;
};

export type PlMiniTx = {
  id: string;
  date: string;
  ref: string;
  memo: string;
  amount: number;
};
