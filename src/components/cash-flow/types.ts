export type CfRowKind = "section" | "detail" | "total" | "summary" | "grand_total" | "check";

export type CfRow = {
  id: string;
  kind: CfRowKind;
  label: string;
  depth: number;
  amount: number | null;
};

export type CfTx = {
  id: string;
  date: string;
  ref: string;
  memo: string;
  amount: number;
};
