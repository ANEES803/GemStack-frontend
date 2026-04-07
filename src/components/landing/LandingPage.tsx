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

export function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.9]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 10%, rgba(241,90,36,0.18), transparent 40%), radial-gradient(circle at 80% 15%, rgba(96,165,250,0.16), transparent 45%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.12), transparent 50%)",
        }}
        aria-hidden
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link href="/" className="group inline-flex items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#f15a24]/50">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
            <svg className="h-4 w-4 text-[#f15a24]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
            </svg>
          </span>
          <span className="text-base font-black tracking-tight text-white">GemStack</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70 ring-1 ring-white/10">
            ERP
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg bg-[#f15a24] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f15a24]/50"
          >
            Open demo dashboards
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-5 pb-14 pt-8 sm:px-8 sm:pb-20">
        <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              Minimal, professional UI · Front-end only
            </p>
            <h1 className="mt-5 text-balance text-3xl font-black tracking-tight text-white sm:text-5xl">
              Gemstone ERP for inventory, sales, and accounting — built to be fast and easy to scan.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-white/70 sm:text-base">
              Modern dark workspace, clear tables, focused actions, and role-based dashboards aligned with your SRS: Owner, Admin, Accountant,
              Stock Manager, and FEP.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-[#f15a24] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f15a24]/50"
              >
                Sign in
              </Link>
              <Link
                href="#roles"
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                Choose a role →
              </Link>
            </div>

            <dl className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Dark workspace", "Low-glare, clean surfaces (#0b1220 / #111827)."],
                ["Scannable tables", "Zebra rows, hover states, and soft borders."],
                ["Single accent", "One primary color for consistent actions."],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-sm font-bold text-white">{k}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-white/70">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white">Sign in bar (UI demo)</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/70">
                  No backend
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Email</label>
                    <div className="mt-2 rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white/70">
                      you@company.com
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Password</label>
                    <div className="mt-2 rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white/70">••••••••</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-white/70">Role:</span>
                  {ROLES.map((r) => (
                    <span
                      key={r.slug}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80"
                    >
                      {r.title}
                    </span>
                  ))}
                </div>

                <Link
                  href="#roles"
                  className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0b1220] transition hover:bg-white/90"
                >
                  Continue →
                </Link>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#f15a24]/15 blur-3xl" aria-hidden />
          </div>
        </section>

        <section id="roles" className="mt-16 sm:mt-20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">Choose a role to sign in</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                This is a front-end demo. Clicking a role will open the login screen pre-selected for that role.
              </p>
            </div>
            <Link href="/login" className="text-sm font-semibold text-[#f15a24] hover:underline">
              Or sign in without selecting →
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <Link
                key={role.slug}
                href={`/login?role=${role.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f15a24]/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/60">{roleBadge(role)}</p>
                    <p className="mt-1 text-lg font-black text-white">{role.title}</p>
                    <p className="mt-1 text-sm text-white/70">{role.label}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-[#111827]/60 px-3 py-1 text-xs font-semibold text-white/80 transition group-hover:border-white/20">
                    Login
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  {role.canSee.slice(0, 3).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f15a24]" aria-hidden />
                      <span className="min-w-0">{line}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-white/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} GemStack — UI demo</p>
            <div className="flex flex-wrap gap-4">
              <Link className="hover:text-white" href="/dashboard">
                Dashboards
              </Link>
              <Link className="hover:text-white" href="/settings?tab=appearance">
                Appearance
              </Link>
              <Link className="hover:text-white" href="/login">
                Login
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

