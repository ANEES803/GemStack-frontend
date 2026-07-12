"use client";

import { formatMoney } from "@/lib/format";

import type { BsRow } from "./types";

type Props = {
  rows: BsRow[];
  balanceDifference: number;
  currency: string;
  onAccountClick: (row: BsRow) => void;
};

export function BalanceSheetTable({ rows, balanceDifference, currency, onAccountClick }: Props) {
  const showWarning = Math.abs(balanceDifference) >= 0.01;
  const ccy = currency || "USD";

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
      <div className="gs-table-scroll max-h-[min(560px,70vh)] overflow-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead className="sticky top-0 z-[1] border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-left text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            <tr>
              <th className="px-4 py-3">Account name</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="gs-striped-rows">
            {rows.map((row) => {
              const isDetail = row.kind === "detail";
              const isBridge = row.kind === "pl_bridge";
              const isClickable = isDetail;
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
                      : isBridge
                        ? "text-sm italic text-[var(--gs-muted)]"
                        : "font-medium text-[var(--gs-text)]";

              const amountClass =
                isGrand || isTotal
                  ? "font-bold tabular-nums text-[var(--gs-text)]"
                  : "tabular-nums text-[var(--gs-text)]";

              const checkClass = showWarning ? "bg-red-50 font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200" : "bg-emerald-100/90 font-semibold text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100";

              return (
                <tr
                  key={row.id}
                  onClick={() => isClickable && onAccountClick(row)}
                  className={`border-b border-[var(--gs-border)] ${
                    isClickable ? "cursor-pointer hover:bg-[var(--gs-accent-soft)]/50" : ""
                  } ${isCheck ? checkClass : ""}`}
                >
                  <td className="px-4 py-2.5 align-top" style={{ paddingLeft: pad }}>
                    <span className={labelClass}>{row.label}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${amountClass} ${isCheck && showWarning ? "text-red-700" : ""}`}>
                    {isCheck ? (
                      balanceDifference < 0 ? (
                        `(${formatMoney(Math.abs(balanceDifference), ccy)})`
                      ) : balanceDifference > 0 ? (
                        formatMoney(balanceDifference, ccy)
                      ) : (
                        formatMoney(0, ccy)
                      )
                    ) : row.amount === null ? (
                      "—"
                    ) : row.amount < 0 ? (
                      `(${formatMoney(Math.abs(row.amount), ccy)})`
                    ) : (
                      formatMoney(row.amount, ccy)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showWarning ? (
        <p className="border-t border-red-200 bg-red-50/90 px-4 py-3 text-xs font-semibold text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100">
          Assets still do not equal liabilities plus equity after the P&amp;L bridge. Review account types, missing retained
          earnings, or other classification issues.
        </p>
      ) : (
        <p className="border-t border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-medium text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          Statement balances: total assets equal total liabilities plus equity.
        </p>
      )}
    </div>
  );
}