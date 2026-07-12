import Link from "next/link";

import type { RoleDefinition } from "@/lib/roles";

const accentBar: Record<RoleDefinition["accent"], string> = {
  orange: "from-[var(--gs-accent)] to-orange-400",
  blue: "from-blue-500 to-sky-400",
  violet: "from-violet-500 to-purple-400",
  emerald: "from-emerald-500 to-teal-400",
  teal: "from-teal-500 to-cyan-400",
};

export function RoleDashboardIntro({ role }: { role: RoleDefinition }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_rgba(15,23,42,0.06)]">
      <div className={`h-1.5 bg-gradient-to-r ${accentBar[role.accent]}`} aria-hidden />
      <div className="p-6 md:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gs-accent)] transition hover:text-[var(--gs-accent-hover)]"
        >
          <span aria-hidden>←</span> All role dashboards
        </Link>
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Role view · demo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--gs-text)] md:text-3xl">{role.title} dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--gs-muted)]">{role.label}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {role.canSee.map((line) => (
            <span
              key={line}
              className="inline-flex rounded-full bg-[var(--gs-hover)] px-3.5 py-1.5 text-xs font-medium text-[var(--gs-muted)] ring-1 ring-[var(--gs-border)]/80"
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}