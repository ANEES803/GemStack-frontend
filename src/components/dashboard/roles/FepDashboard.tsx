import Link from "next/link";

import { RoleDashboardIntro } from "@/components/dashboard/RoleDashboardIntro";
import { KpiTile } from "@/components/dashboard/shared/KpiTile";
import { PanelCard } from "@/components/dashboard/shared/PanelCard";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { ROLES } from "@/lib/roles";

const roleDef = ROLES.find((r) => r.slug === "fep")!;

const myParcels = [
  { code: "P-228", grade: "A", ct: "12.5", status: "Listed" },
  { code: "P-219", grade: "B", ct: "6.0", status: "Hold" },
  { code: "P-205", grade: "A", ct: "4.2", status: "Listed" },
];

export function FepDashboard() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <RoleDashboardIntro role={roleDef} />

      <div className="rounded-3xl border border-[var(--gs-border)] bg-gradient-to-br from-white to-orange-50/30 p-8 shadow-[0_8px_32px_rgba(241,90,36,0.08)] ring-1 ring-orange-100/60">
        <p className="text-center text-sm font-medium text-[var(--gs-muted)]">Primary action</p>
        <Link
          href="/sales"
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[var(--gs-accent)] py-4 text-lg font-bold text-white shadow-lg shadow-orange-300/40 transition hover:bg-[var(--gs-accent-hover)]"
        >
          + Record a sale
        </Link>
        <p className="mt-3 text-center text-xs text-[var(--gs-muted)]">Per SRS: FEP records sales; no company reports here.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiTile
          label="Your carats"
          value="22.7 ct"
          sub="Held in your name"
          tone="teal"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          }
        />
        <KpiTile
          label="Sales (7 days)"
          value="$8,420"
          sub="Your invoices"
          tone="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.59-2.28m5.59 2.28l-2.28 5.59" />
            </svg>
          }
        />
        <KpiTile
          label="Commission"
          value="$312"
          sub="4% on your COGS"
          tone="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </section>

      <PanelCard title="Parcels assigned to you" description="Weight & grade — demo list" bodyClassName="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3.5">Parcel</th>
                <th className="px-6 py-3.5">Grade</th>
                <th className="px-6 py-3.5 text-right">Carats</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myParcels.map((row) => (
                <tr key={row.code} className="hover:bg-slate-50/80">
                  <td className="px-6 py-3.5 font-mono text-sm font-semibold text-slate-900">{row.code}</td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-100">
                      {row.grade}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-slate-900">{row.ct}</td>
                  <td className="px-6 py-3.5 text-slate-600">{row.status}</td>
                  <td className="px-6 py-3.5 text-right">
                    <RowActionsMenu items={["Open parcel", "Mark hold", "Request transfer"]} />
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
