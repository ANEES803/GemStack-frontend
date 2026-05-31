"use client";

import { Bell, ChevronLeft, ChevronRight, LogOut, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { DateFormatProvider } from "@/contexts/DateFormatContext";
import { GlobalSearchBar } from "@/components/layout/GlobalSearchBar";
import { MainSidebar } from "@/components/layout/MainSidebar";
import { ThemeToggleTopBar } from "@/components/theme";
import { initThemeFromStorage } from "@/components/theme";
import { ACCOUNT_DROPDOWN_LINKS } from "@/lib/accountMenuLinks";
import { getAccessToken, getMe, getStoredUser, logout } from "@/lib/authClient";
import { ROLES } from "@/lib/roles";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Outside dashboard routes, root font is 80% of default (≈20% smaller); dashboard uses full scale. */
function isDashboardRoute(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/** List index pages render their own <h1> in ListPageLayout — hide the shell title to avoid “Lots / Lots” duplication. */
const PATHS_WITH_PAGE_OWNED_TITLE = new Set([
  "/dashboard",
  "/inventory",
  "/lots",
  "/lots/new",
  "/sales",
  "/reports/general-ledger",
  "/reports/trial-balance",
  "/reports/profit-loss",
  "/reports/balance-sheet",
  "/reports/cash-flow",
  "/reports/sales",
  "/reports/purchases",
  "/reports/inventory-financial",
  "/reports/aging",
]);

const ROUTE_HEADINGS: Record<string, { title: string; sub?: string }> = {
  "/lots": { title: "Lots", sub: "Bulk purchases" },
  "/lots/new": { title: "Add New LOT" },
  "/sales": { title: "Sales", sub: "Quotations · orders · invoices · receipts" },
  "/sales/new": { title: "Create invoice", sub: "Add a new sales invoice" },
  "/purchases": { title: "Purchases", sub: "Requisitions · PO · GRN · vendor bills" },
  "/inventory": { title: "Inventory", sub: "Stock · services · lots" },
  "/accounting": { title: "Accounting", sub: "COA · journals · banking · opening balances" },
  "/expenses": { title: "Expenses", sub: "Categories & cash/bank postings" },
  "/reports": { title: "Reports", sub: "GL · TB · P&L · BS · cash flow · aging" },
  "/reports/general-ledger": { title: "General Ledger", sub: "Account activity · running balance" },
  "/reports/trial-balance": { title: "Trial Balance", sub: "Debits vs credits · as of date" },
  "/reports/profit-loss": { title: "Profit & Loss", sub: "Income statement" },
  "/reports/balance-sheet": { title: "Balance Sheet", sub: "Assets · liabilities · equity" },
  "/reports/cash-flow": { title: "Cash Flow", sub: "Operating · investing · financing" },
  "/reports/sales": { title: "Sales report", sub: "Summary (API placeholder)" },
  "/reports/purchases": { title: "Purchase report", sub: "Purchase lots" },
  "/reports/inventory-financial": { title: "Inventory (financial)", sub: "Stock valuation snapshot" },
  "/reports/aging": { title: "Aging", sub: "AR / AP buckets (placeholder)" },
  "/settings": { title: "Settings", sub: "Account · company · security · integrations" },
};

function isOnSettingsSecurityTab(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (path === "/settings/security") return true;
  if (path.startsWith("/settings")) {
    return new URLSearchParams(window.location.search).get("tab") === "security";
  }
  return false;
}

function shellHeading(pathname: string): { title: string; sub?: string } {
  if (pathname.startsWith("/settings")) {
    return ROUTE_HEADINGS["/settings"] ?? { title: "Settings", sub: "Account · company · security · integrations" };
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
  return { title: "GemStack ERP", sub: "Workspace" };
}

function CreateMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = [
    { label: "New invoice", href: "/sales/new" },
    { label: "New customer", href: "/sales?tab=customers&add=1" },
    { label: "New item", href: "/inventory?tab=items" },
    { label: "New payment", href: "/sales?tab=receipts" },
    { label: "New journal entry", href: "/accounting?tab=journal_list&new=1" },
  ] as const;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] active:scale-[0.98]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="text-base leading-none">+</span>
        Create
        <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[10rem] rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-lg ring-1 ring-[var(--gs-border)]"
        >
          {items.map((it) => (
            <Link
              key={it.href + it.label}
              href={it.href}
              role="menuitem"
              className="block px-3 py-2 text-xs font-semibold leading-snug text-[var(--gs-text)] transition-colors hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
              onClick={() => setOpen(false)}
            >
              {it.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-[var(--gs-topbar-icon-hover)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account and settings"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--gs-hover)] text-xs font-semibold text-[var(--gs-muted)] ring-1 ring-[var(--gs-border)]">
          GS
        </span>
        <span className="hidden text-sm font-medium text-[var(--gs-text)] sm:inline">Account</span>
        <svg
          className={cx("hidden h-4 w-4 text-[var(--gs-muted)] transition sm:block", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-[min(100vw-1.5rem,13.5rem)] rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-xl ring-1 ring-[var(--gs-border)]"
        >
          {ACCOUNT_DROPDOWN_LINKS.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href + it.label}
                href={it.href}
                role="menuitem"
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-[var(--gs-text)] transition-colors hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
                onClick={() => setOpen(false)}
              >
                <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
                {it.label}
              </Link>
            );
          })}
          <div className="my-1 border-t border-[var(--gs-border)]" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-[var(--gs-muted)] transition-colors hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-text)] disabled:opacity-60"
            onClick={async () => {
              setOpen(false);
              setIsSigningOut(true);
              try {
                await logout();
              } finally {
                window.location.href = "/login";
              }
            }}
          >
            <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const TOPBAR_ICON_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--gs-muted)] transition hover:bg-[var(--gs-topbar-icon-hover)] hover:text-[var(--gs-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gs-shell-header)]";

function TopBarActionIcons() {
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      <button type="button" className={TOPBAR_ICON_BTN} aria-label="Messages">
        <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>
      <button type="button" className={cx(TOPBAR_ICON_BTN, "relative")} aria-label="Notifications">
        <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
          3
        </span>
      </button>
      <ThemeToggleTopBar />
      <AccountMenu />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  /** `true` = full width + labels; `false` = narrow rail with icons only */
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      if (mq.matches) setSidebarExpanded(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    initThemeFromStorage();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    if (pathname === "/") {
      return () => {
        isCancelled = true;
      };
    }

    async function verifySession() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const user = await getMe();
        if (isCancelled) return;
        if (user.must_change_password && !isOnSettingsSecurityTab()) {
          router.replace("/settings?tab=security");
          return;
        }
        if (pathname.startsWith("/dashboard/")) {
          const routeRole = pathname.split("/")[2];
          if (routeRole && routeRole !== user.role) {
            router.replace(`/dashboard/${user.role}`);
          }
        }
      } catch {
        if (!isCancelled) {
          router.replace("/login");
        }
      }
    }

    const cachedUser = getStoredUser();
    if (cachedUser?.must_change_password && !isOnSettingsSecurityTab()) {
      router.replace("/settings?tab=security");
      return () => {
        isCancelled = true;
      };
    }

    verifySession();
    return () => {
      isCancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDashboardRoute(pathname)) {
      root.style.removeProperty("font-size");
    } else {
      root.style.fontSize = "80%";
    }
    return () => {
      root.style.removeProperty("font-size");
    };
  }, [pathname]);

  // Marketing landing page: full-bleed (no sidebar / app chrome).
  if (pathname === "/") {
    return (
      <DateFormatProvider>
        <div className="min-h-screen bg-[var(--gs-page-bg)] text-[var(--gs-text)]">{children}</div>
      </DateFormatProvider>
    );
  }

  const { title, sub } = shellHeading(pathname);
  /** Role dashboards render their own heading in `RoleDashboardIntro` — hide shell duplicate. */
  const showShellPageTitle =
    !PATHS_WITH_PAGE_OWNED_TITLE.has(pathname) &&
    !/^\/dashboard\/.+/.test(pathname) &&
    !pathname.startsWith("/lots/edit");
  /** At least ~52px so icons stay tappable; scales on larger viewports */
  const collapsedSidebarWidth = "max(3.25rem, 6vw)";
  const expandedSidebarWidth = "16rem";

  return (
    <DateFormatProvider>
    <div
      className="flex min-h-screen overflow-x-hidden bg-[var(--gs-page-bg)] text-[var(--gs-text)] transition-colors duration-200 ease-out"
      suppressHydrationWarning
    >
      <aside
        id="app-sidebar"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        style={{ width: sidebarExpanded ? expandedSidebarWidth : collapsedSidebarWidth }}
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex flex-col overflow-visible border-r border-[var(--gs-border)] bg-[var(--gs-sidebar)] shadow-[4px_0_32px_rgba(15,23,42,0.06)] transition-[width,background-color,border-color] duration-200 ease-out dark:shadow-[4px_0_32px_rgba(0,0,0,0.25)]",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<div className="flex-1 px-2.5 py-5 text-[10px] font-medium text-[var(--gs-muted)]">Loading navigation…</div>}>
            <MainSidebar collapsed={!sidebarExpanded} />
          </Suspense>
        </div>

        <div className={cx("shrink-0 border-t border-[var(--gs-border)]", sidebarExpanded ? "p-3" : "hidden")}>
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-2.5 py-2.5">
            <p className="text-[10px] font-bold text-[var(--gs-text)]">Signed in</p>
            <p className="mt-0.5 text-[9px] leading-relaxed text-[var(--gs-muted)]">Session protected.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSidebarExpanded((o) => !o);
          }}
          aria-expanded={sidebarExpanded}
          aria-controls="app-sidebar"
          aria-label={sidebarExpanded ? "Collapse side menu (icons only)" : "Expand side menu"}
          className={cx(
            "absolute right-0 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-sidebar-edge)] text-[var(--gs-muted)] shadow-sm transition-[opacity,box-shadow,background-color] duration-[200ms] ease-out hover:border-[var(--gs-border-strong)] hover:bg-[var(--gs-card)] hover:text-[var(--gs-text)] hover:shadow-md focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gs-sidebar)]",
            sidebarHovered ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {sidebarExpanded ? (
            <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          )}
        </button>
      </aside>

      <div
        style={{ paddingLeft: sidebarExpanded ? expandedSidebarWidth : collapsedSidebarWidth }}
        className={cx(
          "flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden transition-[padding] duration-200 ease-out",
        )}
        suppressHydrationWarning
      >
        <header className="sticky top-0 z-30 border-b border-[var(--gs-border)] bg-[var(--gs-shell-header)] text-[var(--gs-text)] shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl transition-colors duration-200 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]">
          <div className="grid min-h-14 w-full grid-cols-1 items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 md:min-h-[3.75rem] md:grid-cols-[auto_minmax(0,1fr)_auto] md:py-3.5">
            <Link
              href="/dashboard"
              className="group flex min-w-0 max-w-[min(20rem,calc(100vw-10rem))] shrink-0 items-center gap-2.5 rounded-xl py-1 outline-none ring-offset-2 ring-offset-[var(--gs-shell-header)] transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)]"
              title="GemStack — Home"
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--gs-card)] text-[var(--gs-accent)] shadow-sm ring-1 ring-[var(--gs-border)] transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.03]">
                <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--gs-card)] via-[var(--gs-card)] to-[var(--gs-card)]" />
                <svg className="relative h-[14px] w-[14px] drop-shadow-[0_4px_12px_rgba(241,90,36,0.2)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-base font-black leading-tight tracking-tight sm:text-[1.05rem]">
                    <span className="bg-gradient-to-r from-[var(--gs-text)] via-[var(--gs-muted)] to-[var(--gs-accent)] bg-clip-text text-transparent">
                      GemStack
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--gs-accent-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--gs-accent)] ring-1 ring-[var(--gs-border)]">
                    Beta
                  </span>
                </span>
              </span>
            </Link>
            <div className="flex min-w-0 justify-center px-0 sm:px-1">
              <div className="w-full max-w-xl md:max-w-2xl">
                <GlobalSearchBar />
              </div>
            </div>
            <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:gap-3 md:w-auto">
              <CreateMenu />
              <TopBarActionIcons />
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--gs-border)] to-transparent" />
        </header>

        <main
          className={cx(
            "flex w-full min-w-0 flex-1 justify-center px-4 sm:px-5 md:px-10 lg:px-12 xl:px-16 2xl:px-20",
            showShellPageTitle ? "py-5 sm:py-7 md:py-9" : "pb-6 pt-5 sm:pb-8 sm:pt-7 md:pb-10 md:pt-9",
          )}
        >
          <div className="w-full min-w-0 max-w-[1600px] mx-auto 2xl:max-w-[1400px]">
            {showShellPageTitle ? (
              <div className="mb-4 sm:mb-6">
                <h1 className="text-xl font-black tracking-tight text-[var(--gs-text)] sm:text-2xl md:text-3xl">{title}</h1>
                {sub ? <p className="mt-1 text-xs font-medium text-[var(--gs-muted)] sm:text-sm md:text-base">{sub}</p> : null}
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
    </DateFormatProvider>
  );
}
