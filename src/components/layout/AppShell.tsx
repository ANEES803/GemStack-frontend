"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavIcon } from "@/components/icons";
import { navigation } from "@/lib/navigation";
import { ROLES } from "@/lib/roles";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** List index pages render their own <h1> in ListPageLayout — hide the shell title to avoid “Lots / Lots” duplication. */
const PATHS_WITH_PAGE_OWNED_TITLE = new Set(["/lots", "/parcels", "/sales"]);

const ROUTE_HEADINGS: Record<string, { title: string; sub?: string }> = {
  "/lots": { title: "Lots", sub: "Bulk purchases" },
  "/lots/new": { title: "Create lot", sub: "New bulk purchase or third-party stock" },
  "/parcels": { title: "Parcels", sub: "Inventory by grade & FEP" },
  "/parcels/new": { title: "New parcel", sub: "Split from a lot — grade, carats & FEP" },
  "/sales": { title: "Invoices", sub: "Sales & payments" },
  "/sales/new": { title: "Create invoice", sub: "Add a new sales invoice" },
  "/accounting": { title: "Accounting", sub: "COA, masters, purchase, sales lines & journals" },
  "/expenses": { title: "Expenses", sub: "Categories & cash/bank postings" },
  "/reports": { title: "Reports", sub: "P&L, BS, ledger, inventory & sales" },
  "/fep": { title: "FEP & commission", sub: "Earned vs paid (4% COGS)" },
  "/partners": { title: "Partners", sub: "Capital, drawings & profit split" },
  "/users": { title: "Users & roles", sub: "Create users, roles & permissions (SRS)" },
};

function shellHeading(pathname: string): { title: string; sub?: string } {
  if (pathname === "/dashboard") {
    return { title: "Role dashboards", sub: "Choose a workspace to preview" };
  }
  if (pathname.startsWith("/dashboard/")) {
    const slug = pathname.split("/")[2];
    const role = ROLES.find((r) => r.slug === slug);
    if (role) {
      return { title: role.title, sub: `${role.label} · demo view` };
    }
  }
  const mapped = ROUTE_HEADINGS[pathname];
  if (mapped) return mapped;
  return { title: "GemStack", sub: "Workspace" };
}

function TopBarActionIcons() {
  return (
    <>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Messages"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      </button>
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold text-white">
          3
        </span>
      </button>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
        aria-label="Account menu"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-100 text-sm font-semibold text-slate-600 ring-1 ring-slate-200/80">
          GS
        </span>
        <span className="hidden text-sm font-medium text-slate-700 sm:inline">Account</span>
        <svg className="hidden h-4 w-4 text-slate-400 sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { title, sub } = shellHeading(pathname);
  const showShellPageTitle = !PATHS_WITH_PAGE_OWNED_TITLE.has(pathname);

  return (
    <div
      className="flex min-h-screen bg-gradient-to-b from-slate-50 via-[var(--gs-page-bg)] to-slate-100/60 text-[var(--gs-text)]"
      suppressHydrationWarning
    >
      <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--gs-border)] bg-[var(--gs-sidebar)] shadow-[4px_0_32px_rgba(15,23,42,0.04)]">
        <div className="border-b border-orange-100/70 bg-gradient-to-br from-orange-50/95 via-white to-white px-5 py-7">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--gs-accent)] shadow-sm ring-1 ring-orange-100/80">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-50 via-white to-white" />
              <svg className="relative h-7 w-7 drop-shadow-[0_8px_22px_rgba(241,90,36,0.22)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="block truncate text-2xl font-black tracking-tight text-[var(--gs-navy)] hover:text-[var(--gs-accent)]"
                >
                  <span className="bg-gradient-to-r from-[var(--gs-navy)] via-slate-900 to-[var(--gs-accent)] bg-clip-text text-transparent">
                    GemStack
                  </span>
                </Link>
                <span className="hidden rounded-full bg-orange-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-800 ring-1 ring-orange-200/70 sm:inline">
                  Beta
                </span>
              </div>
              <p className="truncate text-sm font-medium text-[var(--gs-muted)]">Gemstone ERP • Inventory · Sales · Accounting</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {navigation.map((section, si) => (
            <div key={section.title} className={cx(si > 0 && "mt-7")}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{section.title}</p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const activeItem =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard" || pathname.startsWith("/dashboard/")
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cx(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                          activeItem
                            ? "bg-[var(--gs-accent)] text-white shadow-md shadow-orange-200/45"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <span className={activeItem ? "text-white" : "text-slate-400"}>
                          <NavIcon name={item.icon} />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--gs-border)] p-4">
          <div className="rounded-2xl border border-slate-100/80 bg-slate-50/90 px-3 py-3.5">
            <p className="text-xs font-bold text-slate-800">Signed in</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Authentication will plug in later.</p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pl-72" suppressHydrationWarning>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
          <div
            className={cx(
              "flex items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6",
              showShellPageTitle ? "min-h-[4.5rem] py-3 sm:min-h-[5rem] sm:py-3.5" : "h-14 sm:h-[3.75rem]",
            )}
          >
            {showShellPageTitle ? (
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">{title}</h1>
                {sub ? <p className="mt-0.5 truncate text-sm font-medium text-slate-500">{sub}</p> : null}
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            <div className="flex shrink-0 items-center gap-1">
              <TopBarActionIcons />
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </header>

        <main
          className={cx(
            "flex w-full min-w-0 flex-1 justify-center px-3 sm:px-5 md:px-10",
            showShellPageTitle ? "py-5 sm:py-7 md:py-9" : "pb-6 pt-5 sm:pb-8 sm:pt-7 md:pb-10 md:pt-9",
          )}
        >
          <div className="w-full min-w-0 max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
