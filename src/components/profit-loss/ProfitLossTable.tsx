"use client";

import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Download, Mail } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";

import { formatPlAmount, formatPlPercent, roundPlAmount } from "./formatPl";

import type { PlLine, PlRounding } from "./types";

const EPS = 0.005;

type Props = {
  lines: PlLine[];
  totalRevenue: number;
  displayCurrency: "PKR" | "USD";
  rounding: PlRounding;
  showComparison: boolean;
  comparisonLabel: string;
  showPercentages: boolean;
  showZeroBalances: boolean;
  compact: boolean;
  onLineClick: (line: PlLine) => void;
  onDownload: () => void;
  onEmail: () => void;
};

function pctOfRevenue(amount: number, totalRev: number): number {
  if (Math.abs(totalRev) < EPS) return 0;
  return (amount / totalRev) * 100;
}

export function ProfitLossTable({
  lines,
  totalRevenue,
  displayCurrency,
  rounding,
  showComparison,
  comparisonLabel,
  showPercentages,
  showZeroBalances,
  compact,
  onLineClick,
  onDownload,
  onEmail,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["revenue", "cogs", "opex", "other"]));

  const toggleGroup = useCallback((gid: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setExpanded(new Set(["revenue", "cogs", "opex", "other"])), []);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const visibleLines = useMemo(() => {
    return lines.filter((row) => {
      if (row.kind === "detail") {
        if (!showZeroBalances && Math.abs(row.current) < EPS && Math.abs(row.prior) < EPS) return false;
        if (!expanded.has(row.groupId)) return false;
      }
      return true;
    });
  }, [lines, expanded, showZeroBalances]);

  const cell = compact ? "px-3 py-1.5" : "px-4 py-2.5";
  const th = compact ? "px-3 py-2.5" : "px-4 py-3";

  const colCount = 2 + (showComparison ? 1 : 0) + (showPercentages ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <ChevronsDownUp className="h-4 w-4" aria-hidden />
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <ChevronsUpDown className="h-4 w-4" aria-hidden />
            Collapse all
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download report
          </button>
          <button
            type="button"
            onClick={onEmail}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Email report
          </button>
        </div>
        {showComparison ? (
          <p className="text-xs font-medium text-[var(--gs-muted)]">
            Comparison: <span className="text-[var(--gs-text)]">{comparisonLabel}</span>
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
        <div className="gs-table-scroll max-h-[min(640px,70vh)] overflow-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="sticky top-0 z-[1] border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-left text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)] shadow-sm">
              <tr>
                <th className={`${th} min-w-[200px]`}>Account name</th>
                <th className={`${th} text-right whitespace-nowrap`}>Current period</th>
                {showComparison ? (
                  <th className={`${th} text-right whitespace-nowrap`}>Comparison</th>
                ) : null}
                {showPercentages ? <th className={`${th} text-right whitespace-nowrap`}>% of revenue</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleLines.map((row, vIdx) => {
                const isSection = row.kind === "section";
                const isTotal = row.kind === "total";
                const isMargin = row.kind === "margin";
                const isDetail = row.kind === "detail";
                const open = expanded.has(row.groupId);
                const padLeft = 12 + row.depth * 16;
                const amtCur = roundPlAmount(row.current, rounding);
                const amtPrior = roundPlAmount(row.prior, rounding);
                const pct = pctOfRevenue(row.current, totalRevenue);

                const netProfitRow = row.id === "m-np";
                const marginPositive = isMargin && amtCur >= 0;
                const marginLoss = isMargin && amtCur < 0;

                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() => {
                        if (!isSection) onLineClick(row);
                      }}
                      className={`border-b border-[var(--gs-border)] transition-colors ${
                        isSection
                          ? "bg-[var(--gs-hover)]/95"
                          : isMargin
                            ? "bg-[var(--gs-table-head)]"
                            : isDetail && vIdx % 2 === 1
                              ? "bg-[var(--gs-table-row-alt)] hover:bg-[var(--gs-hover)]"
                              : "bg-[var(--gs-table-row)] hover:bg-[var(--gs-hover)]"
                      } ${!isSection ? "cursor-pointer" : ""} ${netProfitRow && marginPositive ? "bg-emerald-100/70 dark:bg-emerald-950/35" : ""} ${
                        netProfitRow && marginLoss ? "bg-red-100/70 dark:bg-red-950/35" : ""
                      }`}
                    >
                      <td className={`${cell} align-middle`} style={{ paddingLeft: padLeft }}>
                        <div className="flex items-center gap-2">
                          {isSection ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(row.groupId);
                              }}
                              className="flex shrink-0 items-center gap-1 text-left text-[var(--gs-text)]"
                              aria-expanded={open}
                            >
                              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : (
                            <span className="inline-block w-4 shrink-0" aria-hidden />
                          )}
                          <span
                            className={`${
                              isTotal || isMargin
                                ? "font-bold text-[var(--gs-text)]"
                                : isSection
                                  ? "text-sm font-bold uppercase tracking-wide text-[var(--gs-text)]"
                                  : "font-medium text-[var(--gs-text)]"
                            } ${isMargin && netProfitRow ? (marginPositive ? "text-emerald-950 dark:text-emerald-100" : "text-red-900 dark:text-red-100") : ""}`}
                          >
                            {row.label}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`${cell} text-right font-mono tabular-nums ${
                          isTotal || isMargin ? "font-bold" : ""
                        } ${row.creditStyle && amtCur < 0 ? "text-[var(--gs-text)]" : "text-[var(--gs-text)]"} ${
                          netProfitRow ? (marginPositive ? "text-emerald-950 dark:text-emerald-100" : "text-red-900 dark:text-red-100") : ""
                        }`}
                      >
                        {row.creditStyle && amtCur < 0 ? `(${formatPlAmount(Math.abs(amtCur), displayCurrency, rounding)})` : formatPlAmount(amtCur, displayCurrency, rounding)}
                      </td>
                      {showComparison ? (
                        <td
                          className={`${cell} text-right font-mono text-[var(--gs-muted)] tabular-nums ${isTotal || isMargin ? "font-bold" : ""}`}
                        >
                          {row.creditStyle && amtPrior < 0
                            ? `(${formatPlAmount(Math.abs(amtPrior), displayCurrency, rounding)})`
                            : formatPlAmount(amtPrior, displayCurrency, rounding)}
                        </td>
                      ) : null}
                      {showPercentages ? (
                        <td
                          className={`${cell} text-right font-mono text-[var(--gs-muted)] tabular-nums ${isTotal || isMargin ? "font-semibold text-[var(--gs-text)]" : ""}`}
                        >
                          {isSection ? "—" : formatPlPercent(pct, rounding)}
                        </td>
                      ) : null}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--gs-border)] px-4 py-3 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--gs-muted)]">
          Statement columns: {colCount} · Click a line for detail (except section headers)
        </div>
      </div>
    </div>
  );
}