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
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((role) => (
          <Link
            key={role.slug}
            href={roleHref(role.slug)}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--gs-border)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_22px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.1)]"
          >
            <div className={`h-1.5 bg-gradient-to-r ${cardAccent[role.accent]}`} aria-hidden />
            <div className="flex flex-1 flex-col p-4">
              <h2 className="text-base font-bold text-[var(--gs-navy)] group-hover:text-[var(--gs-accent)]">{role.title}</h2>
              <p className="mt-0.5 text-xs text-[var(--gs-muted)]">{role.label}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-slate-600">
                {role.canSee.slice(0, 3).map((line) => (
                  <li key={line} className="flex gap-1.5">
                    <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-[var(--gs-accent)]" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--gs-accent)]">
                Open dashboard
                <span className="transition group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
