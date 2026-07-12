"use client";

import { formatMoney } from "@/lib/format";

import type { CfRow } from "./types";

type Props = {
  rows: CfRow[];
  reconciliationDiff: number;
  onLineClick: (row: CfRow) => void;
};

export function CashFlowTable({ rows, reconciliationDiff, onLineClick }: Props) {
  const showWarning = Math.abs(reconciliationDiff) >= 0.01;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
      <div className="gs-table-scroll max-h-[min(560px,70vh)] overflow-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead className="sticky top-0 z-[1] border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-left text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            <tr>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="gs-striped-rows">
            {rows.map((row) => {
              const isDetail = row.kind === "detail";
              const isTotal = row.kind === "total";
              const isGrand = row.kind === "grand_total";
              const isSection = row.kind === "section";
              const isSummary = row.kind === "summary";
              const isCheck = row.kind === "check";
              const pad = 12 + row.depth * 18;

              const labelClass = isSection
                ? "pt-5 text-xs font-bold uppercase tracking-wide text-[var(--gs-text)]"
                : isGrand
                  ? "font-bold text-[var(--gs-text)]"
                  : isTotal
                    ? "font-bold text-[var(--gs-text)]"
                    : isSummary
                      ? "font-semibold text-[var(--gs-text)]"
                      : "font-medium text-[var(--gs-text)]";

              const amountClass =
                isGrand || isTotal
                  ? "font-bold tabular-nums text-[var(--gs-text)]"
                  : isSummary
                    ? "font-semibold tabular-nums text-[var(--gs-text)]"
                    : "tabular-nums text-[var(--gs-text)]";

              const checkClass = showWarning ? "bg-red-50 font-bold text-red-800 dark:bg-red-950/50 dark:text-red-200" : "bg-emerald-100/90 font-semibold text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100";

              const fmt = (n: number) =>
                n < 0 ? `(${formatMoney(Math.abs(n), "PKR")})` : formatMoney(n, "PKR");

              return (
                <tr
                  key={row.id}
                  onClick={() => isDetail && onLineClick(row)}
                  className={`border-b border-[var(--gs-border)] ${
                    isDetail ? "cursor-pointer hover:bg-[var(--gs-accent-soft)]/50" : ""
                  } ${isCheck ? checkClass : ""}`}
                >
                  <td className="px-4 py-2.5 align-top" style={{ paddingLeft: pad }}>
                    <span className={labelClass}>{row.label}</span>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${amountClass} ${isCheck && showWarning ? "text-red-700" : ""}`}>
                    {isCheck ? (
                      reconciliationDiff === 0 ? (
                        fmt(0)
                      ) : reconciliationDiff < 0 ? (
                        `(${formatMoney(Math.abs(reconciliationDiff), "PKR")})`
                      ) : (
                        formatMoney(reconciliationDiff, "PKR")
                      )
                    ) : row.amount === null ? (
                      "—"
                    ) : (
                      fmt(row.amount)
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
          Opening cash plus net change does not equal closing cash. Review the reconciliation line.
        </p>
      ) : (
        <p className="border-t border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-medium text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          Cash roll-forward ties: opening + net change = closing balance.
        </p>
      )}
    </div>
  );
}