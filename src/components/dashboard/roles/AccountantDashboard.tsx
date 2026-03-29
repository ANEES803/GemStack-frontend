import Link from "next/link";

import { RoleDashboardIntro } from "@/components/dashboard/RoleDashboardIntro";
import { KpiTile } from "@/components/dashboard/shared/KpiTile";
import { PanelCard } from "@/components/dashboard/shared/PanelCard";
import { ROLES } from "@/lib/roles";

const roleDef = ROLES.find((r) => r.slug === "accountant")!;

const lines = [
  { ref: "JE-2046", memo: "PayPal sales — INV-1042", debit: "Cash", credit: "Revenue", amt: "$2,840" },
  { ref: "JE-2045", memo: "COGS — INV-1042", debit: "COGS", credit: "Inventory", amt: "$1,120" },
  { ref: "JE-2044", memo: "FEP commission accrual", debit: "Commission exp.", credit: "FEP payable", amt: "$45" },
];

export function AccountantDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <RoleDashboardIntro role={roleDef} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Unposted drafts"
          value="2"
          sub="Review before close"
          tone="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          }
        />
        <KpiTile
          label="Revenue (MTD)"
          value="$38.2k"
          sub="Posted"
          tone="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiTile
          label="Expenses (MTD)"
          value="$4.1k"
          sub="By category"
          tone="orange"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M3.75 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KpiTile
          label="Trial balance"
          value="Balanced"
          sub="As of today"
          tone="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.096 3.745 3.745 0 01-3.296 1.126 3.745 3.745 0 01-3.296-1.126 3.745 3.745 0 01-1.043-3.096A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068A3.745 3.745 0 016.105 5.904a3.745 3.745 0 013.296-1.126 3.745 3.745 0 013.296 1.126 3.745 3.745 0 01-3.296 1.126 3.745 3.745 0 011.043 3.096A3.745 3.745 0 013 12z" />
            </svg>
          }
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/expenses"
          className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
        >
          Record expense
        </Link>
        <Link
          href="/accounting"
          className="rounded-full bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Open journals
        </Link>
        <Link
          href="/reports"
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Financial reports
        </Link>
      </div>

      <PanelCard title="Recent journal lines" description="Auto-posted from sales & expenses (demo)" bodyClassName="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3.5">Entry</th>
                <th className="px-6 py-3.5">Memo</th>
                <th className="px-6 py-3.5">Debit</th>
                <th className="px-6 py-3.5">Credit</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((row) => (
                <tr key={row.ref} className="hover:bg-slate-50/80">
                  <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-900">{row.ref}</td>
                  <td className="max-w-[220px] truncate px-6 py-3.5 text-slate-700">{row.memo}</td>
                  <td className="px-6 py-3.5 text-slate-600">{row.debit}</td>
                  <td className="px-6 py-3.5 text-slate-600">{row.credit}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-slate-900">{row.amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
