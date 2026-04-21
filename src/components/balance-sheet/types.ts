export type BsRowKind = "section" | "subsection" | "detail" | "pl_bridge" | "total" | "grand_total" | "check";

export type BsRow = {
  id: string;
  kind: BsRowKind;
  label: string;
  depth: number;
  /** null for non-amount rows (section headers). */
  amount: number | null;
};

export type BsTx = {
  id: string;
  date: string;
  ref: string;
  memo: string;
  amount: number;
};
