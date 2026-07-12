import Link from "next/link";

import { RoleDashboardIntro } from "@/components/dashboard/RoleDashboardIntro";
import { KpiTile } from "@/components/dashboard/shared/KpiTile";
import { PanelCard } from "@/components/dashboard/shared/PanelCard";
import { SalesAreaChart } from "@/components/dashboard/shared/SalesAreaChart";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { ROLES } from "@/lib/roles";

const ownerRole = ROLES.find((r) => r.slug === "owner")!;

const invoiceRows = [
  { id: "INV-1042", channel: "Facebook", fep: "A. Khan", amount: "$2,840", status: "Paid" as const },
  { id: "INV-1041", channel: "Direct", fep: "M. Ali", amount: "$4,120", status: "Pending" as const },
  { id: "INV-1040", channel: "PayPal", fep: "A. Khan", amount: "$910", status: "Paid" as const },
  { id: "INV-1039", channel: "Bank", fep: "S. Noor", amount: "$6,400", status: "Paid" as const },
];

const activities = [
  { text: "Parcel P-228 assigned to A. Khan", time: "2 hours ago" },
  { text: "Invoice INV-1042 marked paid (PayPal)", time: "5 hours ago" },
  { text: "New lot LO-09 received — 120 ct", time: "Yesterday" },
  { text: "Commission run exported for March", time: "2 days ago" },
];

function statusPill(status: "Paid" | "Pending") {
  if (status === "Paid") {
    return (
      <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-300">
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[var(--gs-accent)]/12 px-2.5 py-1 text-xs font-semibold text-[var(--gs-accent)] ring-1 ring-[var(--gs-accent)]/30 dark:text-orange-200">
      Pending
    </span>
  );
}

export function OwnerDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
      <RoleDashboardIntro role={ownerRole} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label="Sales (30 days)"
          value="$128.4k"
          sub="+12% vs prior"
          tone="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.59-2.28m5.59 2.28l-2.28 5.59" />
            </svg>
          }
        />
        <KpiTile
          label="Gross profit"
          value="$34.2k"
          sub="After COGS"
          tone="orange"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiTile
          label="Inventory value"
          value="$512k"
          sub="Parcel cost basis"
          tone="violet"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          }
        />
        <KpiTile
          label="Carats in stock"
          value="4,280 ct"
          tone="teal"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
            </svg>
          }
        />
        <KpiTile
          label="FEP commission due"
          value="$3,870"
          sub="4% on COGS"
          tone="emerald"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-1.03 9.344 9.344 0 002.624-2.681 9.344 9.344 0 001.03-4.122c0-1.417-.311-2.747-.886-3.951M15 19.128v-.003c0-1.024-.311-1.978-.857-2.778m0 4.781V20.25M4.875 18.75a9.37 9.37 0 01-.372-2.625 9.337 9.337 0 011.03-4.121 9.344 9.344 0 012.681-2.624 9.344 9.344 0 014.122-1.03c1.417 0 2.747.311 3.951.886M4.875 18.75h2.25" />
            </svg>
          }
        />
        <KpiTile
          label="Open invoices"
          value="6"
          sub="Awaiting payment"
          tone="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <PanelCard className="lg:col-span-2" bodyClassName="!pt-2 !px-6 !pb-6">
          <SalesAreaChart />
        </PanelCard>

        <div className="space-y-6">
          <PanelCard title="Payment mix" description="Paid vs outstanding (sample)">
            <div className="relative mx-auto h-40 w-40">
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: "conic-gradient(#22c55e 0deg 202deg, #f15a24 202deg 360deg)",
                }}
              />
              <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full bg-[var(--gs-card)] text-center shadow-inner ring-1 ring-[var(--gs-border)]">
                <span className="text-xs font-medium text-[var(--gs-muted)]">Mix</span>
                <span className="text-lg font-bold text-[var(--gs-text)]">56% / 44%</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="flex items-center gap-2 text-[var(--gs-muted)]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid
                </span>
                <span className="font-semibold text-[var(--gs-text)]">56%</span>
              </li>
              <li className="flex justify-between">
                <span className="flex items-center gap-2 text-[var(--gs-muted)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--gs-accent)]" /> Pending
                </span>
                <span className="font-semibold text-[var(--gs-text)]">44%</span>
              </li>
            </ul>
          </PanelCard>

          <PanelCard title="Recent activity">
            <ul className="space-y-4">
              {activities.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--gs-hover)] text-[var(--gs-muted)] ring-1 ring-[var(--gs-border)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium text-[var(--gs-text)]">{a.text}</p>
                    <p className="mt-0.5 text-xs text-[var(--gs-muted)]">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </PanelCard>
        </div>
      </section>

      <PanelCard
        title="Recent invoices"
        description="Company-wide — latest sales and FEP attribution"
        action={
          <Link href="/sales" className="text-sm font-semibold text-[var(--gs-accent)] hover:text-[var(--gs-accent-hover)]">
            View all →
          </Link>
        }
        bodyClassName="!p-0"
      >
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--gs-border)] bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">FEP</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
              {invoiceRows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--gs-hover)]">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-medium text-[var(--gs-text)]">{row.id}</td>
                  <td className="px-6 py-4 text-[var(--gs-text)]">{row.channel}</td>
                  <td className="px-6 py-4 text-[var(--gs-muted)]">{row.fep}</td>
                  <td className="px-6 py-4 text-right font-semibold text-[var(--gs-text)]">{row.amount}</td>
                  <td className="px-6 py-4">{statusPill(row.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <RowActionsMenu items={["Open invoice", "Send reminder", "Download PDF"]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/reports"
          className="rounded-xl bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(241,90,36,0.22)] transition hover:bg-[var(--gs-accent-hover)]"
        >
          Open reports
        </Link>
        <Link
          href="/partners"
          className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)]"
        >
          Partners & profit
        </Link>
      </div>
    </div>
  );
}
