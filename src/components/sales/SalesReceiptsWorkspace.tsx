"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/format";
import { getAccessToken } from "@/lib/authClient";
import {
  fetchCustomerOpenBalances,
  fetchCustomerPayments,
  type CustomerOpenBalanceDto,
  type CustomerPaymentListItemDto,
} from "@/lib/salesInvoicesApi";

const PAYMENT_METHODS = ["cash", "bank", "cheque"] as const;

const filterInputClass =
  "w-full min-h-[42px] rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm text-[var(--gs-text)] outline-none transition placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20";

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: "Cash",
    bank: "Bank",
    cheque: "Cheque",
  };
  return labels[method] ?? method;
}

type OpenInvoiceOption = {
  apiId: string;
  invoiceCode: string;
  customerName: string;
  balanceDue: number;
  currency: string;
};

type Props = {
  openInvoices: OpenInvoiceOption[];
  showSalespersonColumn: boolean;
  onReceivePayment: (initial?: {
    invoiceId?: string;
    customerName?: string;
    amount?: string;
  }) => void;
  refreshKey?: number;
};

export function SalesReceiptsWorkspace({
  openInvoices,
  showSalespersonColumn,
  onReceivePayment,
  refreshKey = 0,
}: Props) {
  const [payments, setPayments] = useState<CustomerPaymentListItemDto[]>([]);
  const [openBalances, setOpenBalances] = useState<CustomerOpenBalanceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setPayments([]);
      setOpenBalances([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const [paymentRes, balances] = await Promise.all([
        fetchCustomerPayments({
          search: search.trim() || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          paymentMethod: methodFilter || null,
          limit: 100,
        }),
        fetchCustomerOpenBalances(),
      ]);
      setPayments(paymentRes.items);
      setOpenBalances(balances);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load receipts");
      setPayments([]);
      setOpenBalances([]);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo, methodFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const totalReceived = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [payments],
  );
  const totalOpenAr = useMemo(
    () => openBalances.reduce((sum, b) => sum + Number(b.open_balance || 0), 0),
    [openBalances],
  );
  const currency = payments[0]?.currency ?? openInvoices[0]?.currency ?? "USD";
  const openBalanceRows = openBalances.filter((b) => Number(b.open_balance) > 0);

  function resetFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setMethodFilter("");
  }

  const hasActiveFilters = Boolean(search.trim() || dateFrom || dateTo || methodFilter);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--gs-text)]">Receipts & customer payments</h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--gs-muted)]">
              Track money received from customers, open balances, and GL posting status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onReceivePayment()}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Receive payment
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Payments shown</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gs-text)]">{payments.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Total received</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gs-text)]">{formatMoney(totalReceived, currency)}</p>
          </div>
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Open AR</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gs-text)]">{formatMoney(totalOpenAr, currency)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-bold text-[var(--gs-text)]">Customers with open balances</h3>
        <p className="mt-1 text-sm text-[var(--gs-muted)]">
          Posted invoices still awaiting payment. Record a receipt against a specific invoice.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Oldest due</th>
                <th className="px-4 py-3 text-right">Open AR</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
              {openBalanceRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--gs-muted)]">
                    {loading ? "Loading open balances..." : "No open customer balances."}
                  </td>
                </tr>
              ) : (
                openBalanceRows.map((b) => {
                  const matchInvoice = openInvoices.find((inv) => inv.customerName === b.customer_name);
                  return (
                    <tr key={b.customer_id} className="hover:bg-[var(--gs-hover)]/80">
                      <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{b.customer_name || "—"}</td>
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{b.oldest_due_date ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-[var(--gs-text)]">
                        {formatMoney(Number(b.open_balance), currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onReceivePayment({
                              invoiceId: matchInvoice?.apiId,
                              customerName: b.customer_name,
                              amount: matchInvoice ? String(matchInvoice.balanceDue) : undefined,
                            })
                          }
                          className="inline-flex rounded-full border border-[var(--gs-accent)]/40 bg-[var(--gs-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--gs-accent)] transition hover:bg-[var(--gs-accent)]/20"
                        >
                          Receive payment
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-10 border-t border-[var(--gs-border)] pt-8">
          <div>
            <h3 className="text-base font-bold text-[var(--gs-text)]">Payment history</h3>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">
              All customer receipts with invoice, bank account, and GL posting details.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12 xl:items-end">
              <div className="xl:col-span-4">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  Search
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Customer, invoice, reference..."
                  className={filterInputClass}
                />
              </div>
              <div className="xl:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  From
                </label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={filterInputClass} />
              </div>
              <div className="xl:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  To
                </label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={filterInputClass} />
              </div>
              <div className="xl:col-span-2">
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  Method
                </label>
                <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={filterInputClass}>
                  <option value="">All methods</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {formatPaymentMethod(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 xl:col-span-2">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-xl bg-[var(--gs-accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)] disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-[var(--gs-border)] px-4 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)]"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Deposited to</th>
                  {showSalespersonColumn ? <th className="px-4 py-3">Salesperson</th> : null}
                  <th className="px-4 py-3">GL</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={showSalespersonColumn ? 9 : 8} className="px-4 py-10 text-center text-[var(--gs-muted)]">
                      {loading
                        ? "Loading payments..."
                        : getAccessToken()
                          ? "No payments recorded yet."
                          : "Sign in to view payment history."}
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--gs-hover)]/80">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--gs-muted)]">{p.pay_date}</td>
                      <td className="px-4 py-3 text-[var(--gs-text)]">{p.reference_no || "—"}</td>
                      <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{p.customer_name}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/sales/${p.sales_invoice_id}`}
                          className="font-semibold text-[var(--gs-accent)] hover:underline"
                        >
                          {p.invoice_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--gs-muted)]">{formatPaymentMethod(p.payment_method)}</td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-[var(--gs-muted)]" title={p.gl_bank_account_name ?? undefined}>
                        {p.gl_bank_account_name || "Default bank"}
                      </td>
                      {showSalespersonColumn ? (
                        <td className="px-4 py-3 text-[var(--gs-muted)]">{p.salesperson_name || "—"}</td>
                      ) : null}
                      <td className="px-4 py-3">
                        {p.posted_to_gl && p.journal_entry_id ? (
                          <Link
                            href={`/accounting?tab=journals&journalId=${encodeURIComponent(p.journal_entry_id)}`}
                            className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300"
                          >
                            Posted
                          </Link>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-200">
                            Not posted
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-[var(--gs-text)]">
                        {formatMoney(Number(p.amount), p.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!getAccessToken() ? (
        <p className="text-center text-sm text-[var(--gs-muted)]">Sign in to load live payment data from the server.</p>
      ) : null}
    </section>
  );
}
