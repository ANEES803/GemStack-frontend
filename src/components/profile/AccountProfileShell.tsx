"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import {
  PROFILE_SIDEBAR_NAV,
  profileTabHref,
  resolveProfileTab,
  type ProfileTabId,
} from "@/lib/accountMenuLinks";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function AccountProfileShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = resolveProfileTab(sp.get("tab"));

  function navigate(next: ProfileTabId) {
    router.push(profileTabHref(next), { scroll: false });
  }

  return (
    <div className="-mx-4 rounded-none bg-[var(--gs-settings-bg)] px-4 py-5 sm:-mx-5 sm:px-5 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 2xl:-mx-20 2xl:px-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav
          aria-label="Profile sections"
          className="w-full shrink-0 overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm lg:w-60 xl:w-64"
        >
          <ul className="flex flex-col p-2">
            {PROFILE_SIDEBAR_NAV.map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={profileTabHref(item.id)}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(item.id);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150",
                      active
                        ? "bg-[var(--gs-accent)] text-white shadow-sm"
                        : "text-[var(--gs-text)] hover:bg-[var(--gs-hover)]",
                    )}
                  >
                    <Icon
                      className={cx("h-4 w-4 shrink-0", active ? "text-white" : "text-[var(--gs-muted)]")}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** Profile hub layout: sidebar + content. */
export function AccountProfileShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading profile…</div>}>
      <AccountProfileShellInner>{children}</AccountProfileShellInner>
    </Suspense>
  );
}

export function useProfileTab(): ProfileTabId {
  const sp = useSearchParams();
  return resolveProfileTab(sp.get("tab"));
}
