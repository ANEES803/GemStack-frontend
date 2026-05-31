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
        amountDue={balance}
        onSubmitPayment={(payload) => {
          void (async () => {
            try {
              const updated = await addSalesInvoicePayment(inv.id, {
                amount: payload.amount,
                payment_method: payload.method === "Cash" ? "cash" : "bank",
                pay_date: payload.date,
                reference_no: payload.depositTo,
              });
              setInv(updated);
              pushToast("Payment recorded.", "success");
            } catch (e) {
              pushToast(e instanceof Error ? e.message : "Payment failed", "error");
            }
          })();
        }}
      />
    </div>
  );
}
