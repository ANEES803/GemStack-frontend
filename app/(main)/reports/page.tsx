"use client";

import { Suspense, useEffect, useState } from "react";
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

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "hub";

  const [from, setFrom] = useState("2026-03-01");
  const [to, setTo] = useState("2026-03-31");

  useEffect(() => {
    if (!searchParams.get("tab")) {
      router.replace("/reports?tab=hub", { scroll: false });
    }
  }, [router, searchParams]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <p className="text-sm leading-relaxed text-[var(--gs-muted)]">
        Central report hub: financial statements, operational reports, and aging  filters and export are front-end demo until the API is connected.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push("/reports?tab=hub", { scroll: false })}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
            tab === "hub" ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
          }`}
        >
          Report hub
        </button>
        <button
          type="button"
          onClick={() => router.push("/reports?tab=accounting", { scroll: false })}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
            tab === "accounting" ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
          }`}
        >
          Accounting bundle
        </button>
      </div>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[var(--gs-text)]">Report period</h2>
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
            onClick={() => window.alert(`Demo: run reports for ${from} → ${to}`)}
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
                    onClick={() => {
                      if (r.id === "gl") router.push("/reports/general-ledger");
                      else if (r.id === "trial") router.push("/reports/trial-balance");
                      else if (r.id === "pl") router.push("/reports/profit-loss");
                      else if (r.id === "bs") router.push("/reports/balance-sheet");
                      else if (r.id === "cf") router.push("/reports/cash-flow");
                      else window.alert(`Demo: preview ${r.title}`);
                    }}
                    className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => window.alert(`Demo: Excel export  ${r.title}`)}
                    className="rounded-full bg-[var(--gs-accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--gs-accent)] ring-1 ring-[var(--gs-accent)]/30 hover:bg-orange-100/80"
                  >
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => window.alert(`Demo: PDF export  ${r.title}`)}
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
          <p className="mb-4 text-sm text-[var(--gs-muted)]">GL, trial balance, P&amp;L, balance sheet, and cash flow  same export pattern as the hub.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {HUB_REPORTS.filter((r) => ["gl", "trial", "pl", "bs", "cf"].includes(r.id)).map((r) => (
              <div key={r.id} className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm">
                <h3 className="font-bold text-[var(--gs-text)]">{r.title}</h3>
                <p className="mt-2 text-sm text-[var(--gs-muted)]">{r.desc}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (r.id === "gl") router.push("/reports/general-ledger");
                    else if (r.id === "trial") router.push("/reports/trial-balance");
                    else if (r.id === "pl") router.push("/reports/profit-loss");
                    else if (r.id === "bs") router.push("/reports/balance-sheet");
                    else if (r.id === "cf") router.push("/reports/cash-flow");
                    else window.alert(`Demo: open ${r.title}`);
                  }}
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