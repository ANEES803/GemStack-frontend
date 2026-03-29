import Link from "next/link";

import { ROLES, roleHref, type RoleDefinition } from "@/lib/roles";

const cardAccent: Record<RoleDefinition["accent"], string> = {
  orange: "from-[var(--gs-accent)]/90 to-orange-500/80",
  blue: "from-blue-500 to-sky-500",
  violet: "from-violet-500 to-indigo-500",
  emerald: "from-emerald-500 to-teal-500",
  teal: "from-teal-500 to-cyan-500",
};

export function DashboardHub() {
  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--gs-navy)] md:text-4xl">Role dashboards</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[var(--gs-muted)] md:mx-0">
          Pick a role to preview what that person should see in GemStack (aligned with your SRS). This is for UI review
          until login is wired — each link is a separate dashboard.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((role) => (
          <Link
            key={role.slug}
            href={roleHref(role.slug)}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(15,23,42,0.1)]"
          >
            <div className={`h-2 bg-gradient-to-r ${cardAccent[role.accent]}`} aria-hidden />
            <div className="flex flex-1 flex-col p-6">
              <h2 className="text-lg font-bold text-[var(--gs-navy)] group-hover:text-[var(--gs-accent)]">{role.title}</h2>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">{role.label}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {role.canSee.slice(0, 3).map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--gs-accent)]" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--gs-accent)]">
                Open dashboard
                <span className="transition group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </p>
              <p className="mt-2 truncate font-mono text-[11px] text-slate-400">{roleHref(role.slug)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
