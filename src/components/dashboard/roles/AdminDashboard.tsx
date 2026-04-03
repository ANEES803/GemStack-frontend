import Link from "next/link";

import { RoleDashboardIntro } from "@/components/dashboard/RoleDashboardIntro";
import { KpiTile } from "@/components/dashboard/shared/KpiTile";
import { PanelCard } from "@/components/dashboard/shared/PanelCard";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { ROLES } from "@/lib/roles";

const roleDef = ROLES.find((r) => r.slug === "admin")!;

const audits = [
  { who: "admin@gems.io", action: "User role updated", target: "s.noore@gems.io", when: "12 min ago" },
  { who: "admin@gems.io", action: "Journal unlocked", target: "JE-2044", when: "1 hr ago" },
  { who: "system", action: "Scheduled backup", target: "OK", when: "4 hr ago" },
];

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <RoleDashboardIntro role={roleDef} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Users"
          value="12"
          sub="Active accounts"
          tone="violet"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-1.03 9.344 9.344 0 002.624-2.681 9.344 9.344 0 001.03-4.122c0-1.417-.311-2.747-.886-3.951M15 19.128v-.003c0-1.024-.311-1.978-.857-2.778m0 4.781V20.25M4.875 18.75a9.37 9.37 0 01-.372-2.625 9.337 9.337 0 011.03-4.121 9.344 9.344 0 012.681-2.624 9.344 9.344 0 014.122-1.03c1.417 0 2.747.311 3.951.886M4.875 18.75h2.25M12 9a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          }
        />
        <KpiTile
          label="Roles in use"
          value="5"
          sub="Owner → FEP"
          tone="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h1.193A11.959 11.959 0 0121 9.75c0 5.592-3.824 10.292-9 11.623-5.176-1.33-9-6.03-9-11.622 0-1.09.17-2.134.485-3.096" />
            </svg>
          }
        />
        <KpiTile
          label="Audit events (24h)"
          value="48"
          sub="Logged actions"
          tone="orange"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6 7.5h3.75m-3.75 3H12m-9-3h3.75m-3.75 0h-.375c-.621 0-1.125.504-1.125 1.125v9.75c0 .621.504 1.125 1.125 1.125h.375m0-12h9.75" />
            </svg>
          }
        />
        <KpiTile
          label="API / jobs"
          value="Healthy"
          sub="No incidents"
          tone="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard title="System checks" description="Lightweight status board (demo)">
          <ul className="space-y-3 text-sm">
            {[
              ["Core API", "Success", "2m ago"],
              ["Database", "Success", "2m ago"],
              ["Email queue", "Success", "15m ago"],
            ].map(([name, st, t]) => (
              <li key={String(name)} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100/90">
                <span className="font-medium text-slate-800">{name}</span>
                <span className="flex items-center gap-2 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {st}
                  <span className="text-xs text-slate-400">{t}</span>
                </span>
              </li>
            ))}
          </ul>
        </PanelCard>

        <PanelCard
          title="Quick actions"
          description="Where admins spend most of their time"
          bodyClassName="flex flex-col gap-3"
        >
          <Link
            href="/users"
            className="rounded-xl bg-[var(--gs-navy)] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Manage users & roles
          </Link>
          <Link
            href="/accounting"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Review accounting modules
          </Link>
        </PanelCard>
      </div>

      <PanelCard title="Recent audit trail" description="Who changed what (sample rows)" bodyClassName="!p-0">
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Target</th>
                <th className="px-6 py-3.5 text-right">When</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audits.map((a) => (
                <tr key={a.when + a.action} className="hover:bg-slate-50/80">
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-800">{a.who}</td>
                  <td className="px-6 py-3.5 text-slate-700">{a.action}</td>
                  <td className="px-6 py-3.5 text-slate-600">{a.target}</td>
                  <td className="px-6 py-3.5 text-right text-xs text-slate-500">{a.when}</td>
                  <td className="px-6 py-3.5 text-right">
                    <RowActionsMenu items={["Inspect", "Export row", "Escalate"]} />
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
