import Link from "next/link";

import { RoleDashboardIntro } from "@/components/dashboard/RoleDashboardIntro";
import { KpiTile } from "@/components/dashboard/shared/KpiTile";
import { PanelCard } from "@/components/dashboard/shared/PanelCard";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { ROLES } from "@/lib/roles";

const roleDef = ROLES.find((r) => r.slug === "stock-manager")!;

const movements = [
  { when: "Today", parcel: "P-228", from: "Warehouse", to: "A. Khan", ct: "12.5" },
  { when: "Yesterday", parcel: "P-221", from: "M. Ali", to: "Warehouse", ct: "8.0" },
  { when: "Mar 26", parcel: "P-215", from: "Warehouse", to: "S. Noor", ct: "22.0" },
];

export function StockManagerDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <RoleDashboardIntro role={roleDef} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Open lots"
          value="3"
          sub="Receiving / open"
          tone="violet"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />
        <KpiTile
          label="Active parcels"
          value="42"
          sub="In system"
          tone="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          }
        />
        <KpiTile
          label="Carats with FEPs"
          value="3,180 ct"
          sub="Field stock"
          tone="teal"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75A2.25 2.25 0 0115.75 18h2.25A2.25 2.25 0 0120.25 15.75v-2.25a2.25 2.25 0 00-2.25-2.25h-2.25a2.25 2.25 0 00-2.25 2.25v2.25z" />
            </svg>
          }
        />
        <KpiTile
          label="Unassigned"
          value="120 ct"
          sub="Split from lots"
          tone="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/lots"
          className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
        >
          Manage lots
        </Link>
        <Link
          href="/parcels"
          className="rounded-full bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Manage parcels
        </Link>
      </div>

      <PanelCard title="Recent movements" description="Transfers between warehouse and FEPs (demo)" bodyClassName="!p-0">
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3.5">When</th>
                <th className="px-6 py-3.5">Parcel</th>
                <th className="px-6 py-3.5">From</th>
                <th className="px-6 py-3.5">To</th>
                <th className="px-6 py-3.5 text-right">Carats</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((row) => (
                <tr key={row.parcel + row.when} className="hover:bg-slate-50/80">
                  <td className="px-6 py-3.5 text-slate-600">{row.when}</td>
                  <td className="px-6 py-3.5 font-mono text-xs font-semibold text-slate-900">{row.parcel}</td>
                  <td className="px-6 py-3.5 text-slate-700">{row.from}</td>
                  <td className="px-6 py-3.5 text-slate-700">{row.to}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-slate-900">{row.ct}</td>
                  <td className="px-6 py-3.5 text-right">
                    <RowActionsMenu items={["View transfer", "Reassign", "Flag"]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
