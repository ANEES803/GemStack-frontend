"use client";

import { Suspense, useEffect, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { downloadGeneralLedgerCsv } from "@/lib/glApi";
import { defaultReportPeriod, periodFromSearchParams } from "@/lib/reportPeriod";
import { useRouter, useSearchParams } from "next/navigation";

const HUB_REPORTS = [
  { id: "gl", title: "General ledger", desc: "Account activity with running balance and drill-down." },
  { id: "trial", title: "Trial balance", desc: "All accounts  debits vs credits (as of date)." },
  { id: "pl", title: "Profit & loss", desc: "Revenue, COGS, expenses, net profit." },
  { id: "bs", title: "Balance sheet", desc: "Assets vs liabilities + equity snapshot." },
  { id: "cf", title: "Cash flow", desc: "Operating, investing, financing sections." },
  { id: "sales", title: "Sales report", desc: "Channel, customer, and product breakdown." },
  { id: "purchase", title: "Purchase report", desc: "Vendor and category spend." },
  { id: "inv", title: "Inventory report", desc: "Stock valuation and movement (lots & parcels)." },
  { id: "aging", title: "Aging (AR / AP)", desc: "Outstanding customer and vendor balances by bucket." },
] as const;

function withPeriod(path: string, from: string, to: string): string {
  return `${path}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

function ReportsContent() {
  const { pushToast } = useAppNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "hub";

  const initial = periodFromSearchParams(searchParams);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  useEffect(() => {
    const p = periodFromSearchParams(searchParams);
    setFrom(p.from);
    setTo(p.to);
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      const p = periodFromSearchParams(searchParams);
      router.replace(
        `/reports?tab=hub&from=${encodeURIComponent(p.from)}&to=${encodeURIComponent(p.to)}`,
        { scroll: false },
      );
    }
  }, [router, searchParams]);

  const applyRange = () => {
    router.replace(`/reports?tab=${tab}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { scroll: false });
    pushToast(`Report period set: ${from} → ${to}`, "success");
  };

  const openReport = (id: string) => {
    if (id === "gl") router.push(withPeriod("/reports/general-ledger", from, to));
    else if (id === "trial") router.push(withPeriod("/reports/trial-balance", from, to));
    else if (id === "pl") router.push(withPeriod("/reports/profit-loss", from, to));
    else if (id === "bs") router.push(withPeriod("/reports/balance-sheet", from, to));
    else if (id === "cf") router.push(withPeriod("/reports/cash-flow", from, to));
    else if (id === "sales") router.push(withPeriod("/reports/sales", from, to));
    else if (id === "purchase") router.push(withPeriod("/reports/purchases", from, to));
    else if (id === "inv") router.push(withPeriod("/reports/inventory-financial", from, to));
    else if (id === "aging") router.push(withPeriod("/reports/aging", from, to));
  };

  const exportGlCsv = () => {
    void downloadGeneralLedgerCsv({ dateFrom: from, dateTo: to, status: null }).catch((e) =>
      pushToast(e instanceof Error ? e.message : "Export failed", "error"),
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <p className="text-sm leading-relaxed text-[var(--gs-muted)]">
        Central report hub: pick a period, apply it to sync child reports via URL{" "}
        <span className="font-mono text-[var(--gs-text)]">?from=&amp;to=</span>. Operational summaries use live APIs where
        available.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            router.push(`/reports?tab=hub&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
              scroll: false,
            })
          }
          className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
            tab === "hub"
              ? "bg-[var(--gs-accent)] text-white"
              : "border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
          }`}
        >
          Report hub
        </button>
        <button
          type="button"
          onClick={() =>
            router.push(`/reports?tab=accounting&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
              scroll: false,
            })
          }
          className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
            tab === "accounting"
              ? "bg-[var(--gs-accent)] text-white"
              : "border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
          }`}
        >
          Accounting bundle
        </button>
      </div>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[var(--gs-text)]">Report period</h2>
        <p className="mt-1 text-xs text-[var(--gs-muted)]">
          Default when missing: {defaultReportPeriod().from} → {defaultReportPeriod().to} (current year — today).
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">From *</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-2 rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">To *</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-2 rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          <button
            type="button"
            onClick={applyRange}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Apply range
          </button>
        </div>
      </section>

      {tab === "hub" && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-[var(--gs-text)]">Available reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {HUB_REPORTS.map((r) => (
              <div
                key={r.id}
                className="flex flex-col rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm transition hover:border-[var(--gs-border-strong)] hover:shadow-md"
              >
                <h3 className="font-bold text-[var(--gs-text)]">{r.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--gs-muted)]">{r.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openReport(r.id)}
                    className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (r.id === "gl") exportGlCsv();
                      else pushToast("CSV export for this report is not wired yet. Use General ledger for CSV.", "info");
                    }}
                    className="rounded-full bg-[var(--gs-accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--gs-accent)] ring-1 ring-[var(--gs-accent)]/30 hover:bg-orange-100/80"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast("PDF export is not implemented yet.", "info")}
                    className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                  >
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "accounting" && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-[var(--gs-text)]">Accounting reports</h2>
          <p className="mb-4 text-sm text-[var(--gs-muted)]">
            GL, trial balance, P&amp;L, balance sheet, and cash flow — same period query string as the hub.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {HUB_REPORTS.filter((r) => ["gl", "trial", "pl", "bs", "cf"].includes(r.id)).map((r) => (
              <div key={r.id} className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm">
                <h3 className="font-bold text-[var(--gs-text)]">{r.title}</h3>
                <p className="mt-2 text-sm text-[var(--gs-muted)]">{r.desc}</p>
                <button
                  type="button"
                  onClick={() => openReport(r.id)}
                  className="mt-4 text-xs font-semibold text-[var(--gs-accent)] hover:underline"
                >
                  Open report →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
