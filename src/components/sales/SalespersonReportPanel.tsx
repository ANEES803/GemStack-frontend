"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchSalesByPerson,
  fetchSalesInvoices,
  type SalesInvoiceSummaryDto,
  type SalespersonSalesReportRow,
} from "@/lib/salesInvoicesApi";

function money(v: string | number): string {
  return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Admin-facing "who sold what" leaderboard backed by
 * GET /sales-invoices/reports/by-salesperson (admin-only). Click a salesperson
 * to drill into the individual invoices they are credited with.
 */
export function SalespersonReportPanel() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<SalespersonSalesReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SalesInvoiceSummaryDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await fetchSalesByPerson({ dateFrom: dateFrom || null, dateTo: dateTo || null });
      setRows(report.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load salesperson report");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const openSalesperson = useCallback(
    async (row: SalespersonSalesReportRow) => {
      if (!row.salesperson_id) return;
      if (openId === row.salesperson_id) {
        setOpenId(null);
        setDetail([]);
        return;
      }
      setOpenId(row.salesperson_id);
      setDetail([]);
      setDetailLoading(true);
      try {
        const list = await fetchSalesInvoices({
          salespersonId: row.salesperson_id,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        });
        setDetail(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load invoices for this salesperson");
      } finally {
        setDetailLoading(false);
      }
    },
    [openId, dateFrom, dateTo],
  );

  const maxTotal = rows.reduce((m, r) => Math.max(m, Number(r.total_amount)), 0);

  return (
    <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--gs-text)]">Team sales</h2>
          <p className="mt-1 text-xs text-[var(--gs-muted)]">
            Who sold what. Click a salesperson to see their invoices. Excludes voided invoices.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs font-semibold text-[var(--gs-muted)]">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="gs-field !mt-1 !py-1.5"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-[var(--gs-muted)]">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="gs-field !mt-1 !py-1.5"
            />
          </label>
          {dateFrom || dateTo ? (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="rounded-lg border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--gs-muted)]">Loading report…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--gs-muted)]">No sales recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {rows.map((r, i) => {
            const clickable = Boolean(r.salesperson_id);
            const isOpen = openId === r.salesperson_id;
            return (
              <li key={r.salesperson_id ?? `unassigned-${i}`} className="rounded-xl border border-[var(--gs-border)]">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => void openSalesperson(r)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left ${
                    clickable ? "hover:bg-[var(--gs-hover)]" : "cursor-default"
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--gs-hover)] text-xs font-bold text-[var(--gs-muted)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-semibold text-[var(--gs-text)]">{r.salesperson_name}</p>
                      <p className="shrink-0 font-semibold text-[var(--gs-text)]">{money(r.total_amount)}</p>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--gs-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--gs-accent)]"
                        style={{ width: `${maxTotal > 0 ? (Number(r.total_amount) / maxTotal) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--gs-muted)]">
                      {r.invoice_count} invoice{r.invoice_count === 1 ? "" : "s"} · collected {money(r.paid_amount)} · outstanding {money(r.balance_due)}
                    </p>
                  </div>
                  {clickable ? (
                    <span className="shrink-0 text-xs font-semibold text-[var(--gs-accent)]">{isOpen ? "Hide" : "View"}</span>
                  ) : null}
                </button>

                {isOpen ? (
                  <div className="border-t border-[var(--gs-border)] px-3 py-3">
                    {detailLoading ? (
                      <p className="text-sm text-[var(--gs-muted)]">Loading invoices…</p>
                    ) : detail.length === 0 ? (
                      <p className="text-sm text-[var(--gs-muted)]">No invoices in this range.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-sm">
                          <thead className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                            <tr>
                              <th className="py-2 pr-3">Invoice</th>
                              <th className="py-2 pr-3">Date</th>
                              <th className="py-2 pr-3">Customer</th>
                              <th className="py-2 pr-3 text-right">Amount</th>
                              <th className="py-2 pr-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--gs-border)]">
                            {detail.map((d) => (
                              <tr key={d.id}>
                                <td className="py-2 pr-3 font-mono text-xs font-semibold text-[var(--gs-text)]">{d.invoice_code}</td>
                                <td className="py-2 pr-3 text-[var(--gs-muted)]">{d.invoice_date}</td>
                                <td className="py-2 pr-3 text-[var(--gs-text)]">{d.customer_name}</td>
                                <td className="py-2 pr-3 text-right font-semibold text-[var(--gs-text)]">{money(d.total_amount)}</td>
                                <td className="py-2 pr-3 capitalize text-[var(--gs-muted)]">{d.status.replace(/_/g, " ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
