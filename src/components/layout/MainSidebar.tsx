"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { NavIcon } from "@/components/icons";
import { navigation, type NavModule } from "@/lib/navigation";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function parseHref(href: string): { pathname: string; params: URLSearchParams } {
  const u = new URL(href, "http://x");
  return { pathname: u.pathname, params: u.searchParams };
}

function hrefMatches(href: string, pathname: string, current: URLSearchParams): boolean {
  const { pathname: p, params: need } = parseHref(href);
  if (p === "/dashboard" && pathname.startsWith("/dashboard")) {
    return [...need.keys()].length === 0 && [...current.keys()].length === 0;
  }
  if (pathname !== p) return false;
  if ([...need.keys()].length === 0) {
    return [...current.keys()].length === 0;
  }
  for (const [k, v] of need.entries()) {
    if (current.get(k) !== v) return false;
  }
  return true;
}

function moduleActive(mod: NavModule, pathname: string, search: URLSearchParams): boolean {
  if (mod.children.length > 0) {
    return mod.children.some((c) => hrefMatches(c.href, pathname, search));
  }
  return hrefMatches(mod.href, pathname, search);
}

/** Uppercase header for flyout (reference-style) */
function flyoutHeading(mod: NavModule): string {
  return mod.label.toUpperCase();
}

export function MainSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sp = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const [open, setOpen] = useState<Record<string, boolean>>({});

  const ensureOpenForRoute = useCallback(() => {
    setOpen((prev) => {
      const next = { ...prev };
      for (const mod of navigation) {
        if (moduleActive(mod, pathname, sp)) {
          next[mod.id] = true;
        }
      }
      return next;
    });
  }, [pathname, sp]);

  useEffect(() => {
    ensureOpenForRoute();
  }, [ensureOpenForRoute]);

  const toggle = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* —— Collapsed flyout (hover + click + portal) —— */
  const [flyoutModuleId, setFlyoutModuleId] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleCloseFlyout = useCallback(() => {
    cancelCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setFlyoutModuleId(null);
      setFlyoutPos(null);
      closeTimerRef.current = null;
    }, 220);
  }, [cancelCloseTimer]);

  const updateFlyoutPosition = useCallback(() => {
    if (!flyoutModuleId) {
      setFlyoutPos(null);
      return;
    }
    const el = document.querySelector(`[data-nav-flyout-anchor="${flyoutModuleId}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    setFlyoutPos({ top: r.top, left: r.right + gap });
  }, [flyoutModuleId]);

  useLayoutEffect(() => {
    updateFlyoutPosition();
  }, [updateFlyoutPosition]);

  useEffect(() => {
    if (!flyoutModuleId) return;
    function onResizeOrScroll() {
      updateFlyoutPosition();
    }
    window.addEventListener("resize", onResizeOrScroll);
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [flyoutModuleId, updateFlyoutPosition]);

  useEffect(() => {
    setFlyoutModuleId(null);
    setFlyoutPos(null);
    cancelCloseTimer();
  }, [pathname, sp, cancelCloseTimer]);

  useEffect(() => {
    if (!flyoutModuleId) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      const panel = document.getElementById("nav-flyout-panel");
      const anchor = document.querySelector(`[data-nav-flyout-anchor="${flyoutModuleId}"]`);
      if (panel?.contains(t) || anchor?.contains(t)) return;
      cancelCloseTimer();
      setFlyoutModuleId(null);
      setFlyoutPos(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [flyoutModuleId, cancelCloseTimer]);

  useEffect(() => {
    if (!flyoutModuleId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cancelCloseTimer();
        setFlyoutModuleId(null);
        setFlyoutPos(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flyoutModuleId, cancelCloseTimer]);

  useEffect(() => () => cancelCloseTimer(), [cancelCloseTimer]);

  const flyoutMod = flyoutModuleId ? navigation.find((m) => m.id === flyoutModuleId) : undefined;

  const flyoutPanel =
    mounted &&
    flyoutMod &&
    flyoutMod.children.length > 0 &&
    flyoutPos &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            id="nav-flyout-panel"
            role="menu"
            aria-label={`${flyoutMod.label} menu`}
            className="fixed z-[100] max-h-[min(75vh,26rem)] w-[min(100vw-2.5rem,21rem)] overflow-y-auto rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-[0_8px_30px_rgba(15,23,42,0.12)] dark:shadow-xl"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
            onMouseEnter={cancelCloseTimer}
            onMouseLeave={scheduleCloseFlyout}
          >
            <p className="border-b border-[var(--gs-border)] px-3 py-2.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-[var(--gs-muted)]">
              {flyoutHeading(flyoutMod)}
            </p>
            <ul className="py-1">
              {flyoutMod.children.map((child) => {
                const childActive = hrefMatches(child.href, pathname, sp);
                return (
                  <li key={child.href + child.label}>
                    <Link
                      href={child.href}
                      role="menuitem"
                      onClick={() => {
                        cancelCloseTimer();
                        setFlyoutModuleId(null);
                        setFlyoutPos(null);
                      }}
                      className={cx(
                        "block break-words px-3 py-2 text-[13px] font-medium leading-snug text-[var(--gs-text)] transition-colors",
                        childActive ? "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)]" : "hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]",
                      )}
                    >
                      {child.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-[var(--gs-border)]">
              <Link
                href={flyoutMod.href}
                onClick={() => {
                  cancelCloseTimer();
                  setFlyoutModuleId(null);
                  setFlyoutPos(null);
                }}
                className="block px-3 py-2 text-[11px] font-semibold text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
              >
                Open {flyoutMod.label} →
              </Link>
            </div>
          </div>,
          document.body,
        )
      : null;

  if (collapsed) {
    return (
      <>
        <nav className="flex flex-1 flex-col overflow-y-auto px-1.5 py-2" aria-label="Main navigation">
          <p className="mb-2 select-none px-0.5 text-center text-[9px] font-bold uppercase tracking-widest text-[var(--gs-muted)]">
            Pinned
          </p>
          <div className="flex flex-col gap-1">
            {navigation.map((mod) => {
              const modActive = moduleActive(mod, pathname, sp);
              const hasChildren = mod.children.length > 0;

              const cellClass = cx(
                "flex w-full flex-col items-center gap-1 rounded-xl px-0.5 py-2 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--gs-sidebar)]",
                modActive
                  ? "bg-emerald-50/80 ring-1 ring-emerald-200/60 dark:bg-emerald-900/30 dark:ring-emerald-800"
                  : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]",
              );

              const iconWrap = cx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all",
                modActive ? "bg-[var(--gs-accent)] text-white shadow-sm" : "bg-[var(--gs-hover)] text-[var(--gs-muted)] group-hover:text-[var(--gs-text)]",
              );

              if (!hasChildren) {
                return (
                  <Link
                    key={mod.id}
                    href={mod.href}
                    title={mod.label}
                    className={cx(cellClass, "group")}
                  >
                    <span className={iconWrap}>
                      <NavIcon name={mod.icon} />
                    </span>
                    <span className="max-w-[5rem] text-center text-[9px] font-semibold leading-tight text-[var(--gs-muted)] [overflow-wrap:anywhere]">
                      {mod.label}
                    </span>
                  </Link>
                );
              }

              return (
                <div key={mod.id} className="group w-full">
                  <button
                    type="button"
                    data-nav-flyout-anchor={mod.id}
                    title={mod.label}
                    aria-expanded={flyoutModuleId === mod.id}
                    aria-haspopup="menu"
                    className={cx(cellClass, "group w-full cursor-pointer")}
                    onMouseEnter={() => {
                      cancelCloseTimer();
                      setFlyoutModuleId(mod.id);
                    }}
                    onMouseLeave={scheduleCloseFlyout}
                    onClick={() => {
                      cancelCloseTimer();
                      setFlyoutModuleId((prev) => (prev === mod.id ? null : mod.id));
                    }}
                  >
                    <span className={iconWrap}>
                      <NavIcon name={mod.icon} />
                    </span>
                    <span className="max-w-[5rem] text-center text-[9px] font-semibold leading-tight text-[var(--gs-muted)] [overflow-wrap:anywhere]">
                      {mod.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </nav>
        {flyoutPanel}
      </>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto px-2.5 py-4">
      {navigation.map((mod, mi) => {
        const expanded = open[mod.id] ?? true;
        const modActive = moduleActive(mod, pathname, sp);

        return (
          <div key={mod.id} className={cx(mi > 0 && "mt-1.5")}>
            <div className="flex items-center gap-0.5">
              <Link
                href={mod.href}
                className={cx(
                  "group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-semibold leading-snug transition-all",
                  modActive ? "bg-[var(--gs-accent)] text-white shadow-md shadow-orange-200/45 dark:shadow-orange-900/50" : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]",
                )}
              >
                <span
                  className={cx(
                    "transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.03]",
                    modActive ? "text-white" : "text-[var(--gs-muted)] group-hover:text-[var(--gs-text)]",
                  )}
                >
                  <NavIcon name={mod.icon} />
                </span>
                <span className="min-w-0 break-words leading-snug">{mod.label}</span>
              </Link>
              {mod.children.length > 0 ? (
                <button
                  type="button"
                  onClick={() => toggle(mod.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                  aria-expanded={expanded}
                  aria-label={expanded ? `Collapse ${mod.label}` : `Expand ${mod.label}`}
                >
                  <svg
                    className={cx("h-3 w-3 transition-transform", expanded && "rotate-180")}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              ) : null}
            </div>
            {expanded && mod.children.length > 0 ? (
              <ul className="ml-3 mt-0.5 space-y-px border-l border-[var(--gs-border)] pl-3">
                {mod.children.map((child) => {
                  const childActive = hrefMatches(child.href, pathname, sp);
                  return (
                    <li key={child.href + child.label}>
                      <Link
                        href={child.href}
                        className={cx(
                          "block break-words rounded-md px-2.5 py-1.5 text-[10px] font-semibold leading-snug transition",
                          childActive
                            ? "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)] ring-1 ring-[var(--gs-border)]"
                            : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]",
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
