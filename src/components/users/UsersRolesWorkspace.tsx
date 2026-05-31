"use client";

import { useState } from "react";

import { RolesAccessTable } from "@/components/rbac/RolesAccessTable";
import { UsersAdminTable } from "@/components/rbac/UsersAdminTable";

type TabId = "roles" | "users";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function UsersRolesWorkspace({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<TabId>("roles");

  return (
    <div
      className={cx(
        embedded ? "flex min-w-0 flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6" : "mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8",
      )}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--gs-text)] sm:text-2xl">Users &amp; roles</h1>
        <p className="text-sm text-[var(--gs-muted)]">
          Manage who can access each part of GemStack. Reset a user&apos;s password from the ⋮ menu on each row in the
          Users tab.
        </p>
      </div>

      <div
        className={cx(
          embedded
            ? "flex gap-1 border-b border-[var(--gs-border)]"
            : "flex w-fit gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] p-1",
        )}
        role="tablist"
        aria-label="Users and roles sections"
      >
        {(
          [
            ["roles", "Roles & access"],
            ["users", "Users"],
          ] as const
        ).map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cx(
                "text-sm font-semibold transition",
                embedded
                  ? cx(
                      "border-b-2 px-4 py-2.5",
                      active
                        ? "border-[var(--gs-accent)] text-[var(--gs-accent)]"
                        : "border-transparent text-[var(--gs-muted)] hover:border-[var(--gs-border)] hover:text-[var(--gs-text)]",
                    )
                  : cx(
                      "rounded-full px-4 py-2",
                      active ? "bg-[var(--gs-accent)] text-white" : "text-[var(--gs-muted)] hover:text-[var(--gs-text)]",
                    ),
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className={embedded ? "min-w-0 pt-1" : undefined}>
        {tab === "roles" ? <RolesAccessTable embedded={embedded} /> : <UsersAdminTable embedded={embedded} />}
      </div>
    </div>
  );
}
