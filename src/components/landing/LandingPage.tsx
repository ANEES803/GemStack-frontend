"use client";

import Link from "next/link";

import { ROLES, type RoleDefinition } from "@/lib/roles";

function roleBadge(role: RoleDefinition) {
  switch (role.slug) {
    case "owner":
      return "All KPIs";
    case "admin":
      return "Access control";
    case "accountant":
      return "Books & reports";
    case "stock-manager":
      return "Inventory ops";
    case "fep":
      return "Field sales";
    default:
      return "Role";
  }
}

/** Subtle mesh behind hero — works on light and dark via page/card tokens */
function HeroMesh() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-90"
      style={{
        backgroundImage:
          "radial-gradient(circle at 10% 10%, rgba(241,90,36,0.14), transparent 40%), radial-gradient(circle at 80% 15%, rgba(96,165,250,0.12), transparent 45%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.08), transparent 50%)",
      }}
      aria-hidden
    />
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--gs-page-bg)] text-[var(--gs-text)]">
      <HeroMesh />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)]/50"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gs-card)] ring-1 ring-[var(--gs-border)]">
            <svg className="h-4 w-4 text-[var(--gs-accent)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
            </svg>
          </span>
          <span className="text-base font-black tracking-tight text-[var(--gs-text)]">GemStack</span>
          <span className="rounded-full bg-[var(--gs-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gs-accent)] ring-1 ring-[var(--gs-border)]">
            ERP
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg bg-[var(--gs-accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)]/50"
          >
            Open demo dashboards
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-5 pb-14 pt-8 sm:px-8 sm:pb-20">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-1 text-xs font-semibold text-[var(--gs-muted)]">
              Minimal, professional UI · Front-end only
            </p>
            <h1 className="mt-5 text-balance text-3xl font-black tracking-tight text-[var(--gs-text)] sm:text-5xl">
              Gemstone ERP for inventory, sales, and accounting — built to be fast and easy to scan.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-[var(--gs-muted)] sm:text-base">
              Theme-aware workspace, clear tables, focused actions, and role-based dashboards aligned with your SRS: Owner, Admin, Accountant,
              Stock Manager, and FEP.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-[var(--gs-accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)]/50"
              >
                Login
              </Link>
              <Link
                href="#roles"
                className="rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-5 py-3 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)]"
              >
                Choose a role →
              </Link>
            </div>

            <dl className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Themed workspace", "Neutral dark grey surfaces with consistent tokens and contrast."],
                ["Scannable tables", "Zebra rows, hover states, and soft borders."],
                ["Single accent", "One primary color for consistent actions."],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                  <dt className="text-sm font-bold text-[var(--gs-text)]">{k}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-[var(--gs-muted)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-[var(--gs-border)] bg-gradient-to-b from-[var(--gs-card)] to-[var(--gs-page-bg)] p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[var(--gs-text)]">Login bar (UI demo)</p>
                <span className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-input-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--gs-muted)]">
                  No backend
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--gs-muted)]">Email</label>
                    <div className="mt-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] px-4 py-3 text-sm text-[var(--gs-muted)]">
                      you@company.com
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--gs-muted)]">Password</label>
                    <div className="mt-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] px-4 py-3 text-sm text-[var(--gs-muted)]">
                      ••••••••
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--gs-muted)]">Role:</span>
                  {ROLES.map((r) => (
                    <span
                      key={r.slug}
                      className="inline-flex items-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-1 text-xs font-semibold text-[var(--gs-text)]"
                    >
                      {r.title}
                    </span>
                  ))}
                </div>

                <Link
                  href="#roles"
                  className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[var(--gs-accent)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--gs-accent-hover)]"
                >
                  Continue →
                </Link>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[var(--gs-accent)]/15 blur-3xl" aria-hidden />
          </div>
        </section>

        <section id="roles" className="mt-16 sm:mt-20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--gs-text)]">Choose a role to login</h2>
              <p className="mt-2 max-w-2xl text-sm text-[var(--gs-muted)]">
                This is a front-end demo. Clicking a role will open the login screen pre-selected for that role.
              </p>
            </div>
            <Link href="/login" className="text-sm font-semibold text-[var(--gs-accent)] hover:underline">
              Or login without selecting →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <Link
                key={role.slug}
                href={`/login?role=${role.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 transition hover:bg-[var(--gs-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)]/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--gs-muted)]">{roleBadge(role)}</p>
                    <p className="mt-1 text-lg font-black text-[var(--gs-text)]">{role.title}</p>
                    <p className="mt-1 text-sm text-[var(--gs-muted)]">{role.label}</p>
                  </div>
                  <span className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-input-bg)] px-3 py-1 text-xs font-semibold text-[var(--gs-text)] transition group-hover:border-[var(--gs-border-strong)]">
                    Login
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-[var(--gs-muted)]">
                  {role.canSee.slice(0, 3).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--gs-accent)]" aria-hidden />
                      <span className="min-w-0">{line}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-[var(--gs-border)] pt-8 text-sm text-[var(--gs-muted)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} GemStack — UI demo</p>
            <div className="flex flex-wrap gap-4">
              <Link className="hover:text-[var(--gs-text)]" href="/dashboard">
                Dashboards
              </Link>
              <Link className="hover:text-[var(--gs-text)]" href="/settings?tab=appearance">
                Appearance
              </Link>
              <Link className="hover:text-[var(--gs-text)]" href="/login">
                Login
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
