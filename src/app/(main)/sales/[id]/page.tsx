"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ReceivePaymentModal } from "@/components/sales/ReceivePaymentModal";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import {
  addSalesInvoicePayment,
  fetchSalesInvoice,
  postSalesInvoice,
  receivePaymentToCreateBody,
  voidSalesInvoice,
  type SalesInvoiceDetailDto,
} from "@/lib/salesInvoicesApi";

export default function SalesInvoiceDetailPage() {
  const params = useParams();
  const { pushToast } = useAppNotifications();
  const id = typeof params.id === "string" ? params.id : "";
  const [inv, setInv] = useState<SalesInvoiceDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await fetchSalesInvoice(id);
        if (!cancelled) setInv(row);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load invoice");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-red-600">{error}</p>
        <Link href="/sales" className="mt-4 inline-block text-sm font-semibold text-[var(--gs-accent)]">
          Back to sales
        </Link>
      </div>
    );
  }

  if (!inv) {
    return <div className="px-4 py-10 text-sm text-[var(--gs-muted)]">Loading invoice…</div>;
  }

  const balance = Number(inv.balance_due);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link href="/sales" className="text-sm font-semibold text-[var(--gs-accent)]">
          ← Sales transactions
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--gs-text)]">{inv.invoice_code}</h1>
        <p className="text-sm text-[var(--gs-muted)]">
          {inv.customer_name} · {inv.status} · {inv.invoice_date}
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
        <p className="text-xs font-semibold uppercase text-[var(--gs-muted)]">Total</p>
        <p className="text-3xl font-bold text-[var(--gs-text)]">${Number(inv.total_amount).toFixed(2)}</p>
        <p className="mt-2 text-sm text-[var(--gs-muted)]">
          Paid ${Number(inv.paid_amount).toFixed(2)} · Balance ${balance.toFixed(2)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {inv.status === "draft" ? (
            <button
              type="button"
              className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                void (async () => {
                  try {
                    const updated = await postSalesInvoice(inv.id);
                    setInv(updated);
                    pushToast("Invoice posted.", "success");
                  } catch (e) {
                    pushToast(e instanceof Error ? e.message : "Post failed", "error");
                  }
                })();
              }}
            >
              Post invoice
            </button>
          ) : null}
          {balance > 0 && inv.status !== "void" && inv.status !== "draft" ? (
            <button
              type="button"
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold"
              onClick={() => setPayOpen(true)}
            >
              Receive payment
            </button>
          ) : null}
          {inv.status !== "void" && inv.status !== "draft" && Number(inv.paid_amount) === 0 ? (
            <button
              type="button"
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
              onClick={() => {
                void (async () => {
                  try {
                    const updated = await voidSalesInvoice(inv.id);
                    setInv(updated);
                    pushToast("Invoice voided.", "success");
                  } catch (e) {
                    pushToast(e instanceof Error ? e.message : "Void failed", "error");
                  }
                })();
              }}
            >
              Void
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
        <h2 className="text-sm font-bold uppercase text-[var(--gs-muted)]">Activity &amp; audit</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Salesperson</dt>
            <dd className="mt-1 font-medium text-[var(--gs-text)]">{inv.salesperson_name || "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Created by</dt>
            <dd className="mt-1 font-medium text-[var(--gs-text)]">{inv.created_by_name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Created</dt>
            <dd className="mt-1 text-[var(--gs-text)]">{new Date(inv.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Posted</dt>
            <dd className="mt-1 text-[var(--gs-text)]">
              {inv.posted_at ? new Date(inv.posted_at).toLocaleString() : "Not posted"}
            </dd>
          </div>
          {inv.voided_at ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Voided</dt>
              <dd className="mt-1 text-[var(--gs-text)]">{new Date(inv.voided_at).toLocaleString()}</dd>
            </div>
          ) : null}
        </dl>
        {inv.payments.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Payments</h3>
            <ul className="mt-2 divide-y divide-[var(--gs-border)] text-sm">
              {inv.payments.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[var(--gs-muted)]">
                    {p.pay_date} · {p.payment_method}
                    {p.reference_no ? ` · ${p.reference_no}` : ""}
                    {p.gl_bank_account_name ? ` · ${p.gl_bank_account_name}` : ""}
                    {p.posted_to_gl ? (
                      p.journal_entry_id ? (
                        <>
                          {" · "}
                          <Link href={`/accounting?tab=journals&journalId=${encodeURIComponent(p.journal_entry_id)}`} className="font-semibold text-[var(--gs-accent)] hover:underline">
                            GL posted
                          </Link>
                        </>
                      ) : (
                        " · GL posted"
                      )
                    ) : (
                      " · Not posted to GL"
                    )}
                  </span>
                  <span className="font-semibold text-[var(--gs-text)]">${Number(p.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
        <h2 className="text-sm font-bold uppercase text-[var(--gs-muted)]">Lines (inventory)</h2>
        <ul className="mt-3 divide-y divide-[var(--gs-border)] text-sm">
          {inv.lines.map((ln) => (
            <li key={ln.id} className="flex justify-between gap-4 py-3">
              <span>
                <span className="font-semibold text-[var(--gs-text)]">{ln.public_code_snapshot || ln.description}</span>
                <span className="block text-xs text-[var(--gs-muted)]">{ln.description}</span>
              </span>
              <span className="font-semibold">${Number(ln.line_total).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </section>

      <ReceivePaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        initial={{
          invoiceId: inv.id,
          customerName: inv.customer_name,
          amount: String(balance),
        }}
        openInvoices={[
          {
            apiId: inv.id,
            invoiceCode: inv.invoice_code,
            customerName: inv.customer_name,
            balanceDue: balance,
          },
        ]}
        requireInvoiceSelection
        amountDue={balance}
        onSubmitPayment={async (payload) => {
          try {
            const updated = await addSalesInvoicePayment(inv.id, receivePaymentToCreateBody(payload));
            setInv(updated);
            pushToast("Payment recorded.", "success");
          } catch (e) {
            pushToast(e instanceof Error ? e.message : "Payment failed", "error");
          }
        }}
      />
    </div>
  );
}
