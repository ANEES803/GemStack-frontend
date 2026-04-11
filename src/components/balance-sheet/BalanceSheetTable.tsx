"use client";

import { formatMoney } from "@/lib/format";

import type { BsRow } from "./types";

type Props = {
  rows: BsRow[];
  balanceDifference: number;
  onAccountClick: (row: BsRow) => void;
};

export function BalanceSheetTable({ rows, balanceDifference, onAccountClick }: Props) {
  const showWarning = Math.abs(balanceDifference) >= 0.01;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
      <div className="max-h-[min(560px,70vh)] overflow-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead className="sticky top-0 z-[1] border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-left text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            <tr>
              <th className="px-4 py-3">Account name</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isDetail = row.kind === "detail";
              const isTotal = row.kind === "total";
              const isGrand = row.kind === "grand_total";
              const isSection = row.kind === "section";
              const isSub = row.kind === "subsection";
              const isCheck = row.kind === "check";
              const pad = 12 + row.depth * 18;

              const labelClass = isSection
                ? "pt-5 text-xs font-bold uppercase tracking-wide text-[var(--gs-text)]"
                : isSub
                  ? "pt-3 text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]"
                  : isGrand
                    ? "font-bold text-[var(--gs-text)]"
                    : isTotal
                      ? "font-bold text-[var(--gs-text)]"
                      : "font-medium text-[var(--gs-text)]";

              const amountClass =
                isGrand || isTotal
                  ? "font-bold tabular-nums text-[var(--gs-text)]"
                  : "tabular-nums text-[var(--gs-text)]";

              const checkClass = showWarning ? "bg-red-50 font-bold text-red-800" : "bg-emerald-50/60 font-semibold text-[var(--gs-text)]";

              return (
                <tr
                  key={row.id}
                  onClick={() => isDetail && onAccountClick(row)}
                  className={`border-b border-[var(--gs-border)] ${
                    isDetail ? "cursor-pointer hover:bg-[var(--gs-accent-soft)]/50" : ""
                  } ${isCheck ? checkClass : "bg-[var(--gs-card)]"}`}
                >
                  <td className="px-4 py-2.5 align-top" style={{ paddingLeft: pad }}>
                    <span className={labelClass}>{row.label}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${amountClass} ${isCheck && showWarning ? "text-red-700" : ""}`}>
                    {isCheck ? (
                      balanceDifference < 0 ? (
                        `(${formatMoney(Math.abs(balanceDifference), "PKR")})`
                      ) : balanceDifference > 0 ? (
                        formatMoney(balanceDifference, "PKR")
                      ) : (
                        formatMoney(0, "PKR")
                      )
                    ) : row.amount === null ? (
                      "—"
                    ) : row.amount < 0 ? (
                      `(${formatMoney(Math.abs(row.amount), "PKR")})`
                    ) : (
                      formatMoney(row.amount, "PKR")
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showWarning ? (
        <p className="border-t border-red-100 bg-red-50/80 px-4 py-3 text-xs font-semibold text-red-800">
          Assets do not equal liabilities plus equity. Review the balance check line.
        </p>
      ) : (
        <p className="border-t border-emerald-100 bg-emerald-50/50 px-4 py-3 text-xs font-medium text-[var(--gs-text)]">
          Statement balances: total assets equal total liabilities plus equity.
        </p>
      )}
    </div>
  );
}