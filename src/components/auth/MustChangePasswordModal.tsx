"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { changePassword, logout, type AuthUser } from "@/lib/authClient";
import { resolvePostLoginPath } from "@/lib/permissions";
import { ROLES } from "@/lib/roles";

type MustChangePasswordModalProps = {
  user: AuthUser;
  onComplete: (user: AuthUser) => void;
};

/** Blocks the app until a user with a temporary password sets a new one. */
export function MustChangePasswordModal({ user, onComplete }: MustChangePasswordModalProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = ROLES.find((r) => r.slug === user.role)?.title ?? user.role_name ?? user.role;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 10) {
      setError("New password must be at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      onComplete(updated);
      router.replace(resolvePostLoginPath(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="must-change-password-title"
    >
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-stretch lg:gap-10">
          <div className="min-w-0 flex-1 lg:max-w-sm lg:border-r lg:border-[var(--gs-border)] lg:pr-8">
            <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/80 dark:text-amber-100 dark:ring-amber-700">
              Required step
            </div>
            <h2 id="must-change-password-title" className="mt-4 text-2xl font-bold text-[var(--gs-text)]">
              Set your new password
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--gs-muted)]">
              Welcome, <span className="font-semibold text-[var(--gs-text)]">{user.display_name ?? user.email}</span>.
              Your admin gave you a temporary password. You must choose a new one before using GemStack.
            </p>
            <div className="mt-4 rounded-xl bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]">
              <p className="font-semibold">{user.email}</p>
              <p className="mt-1 text-xs text-[var(--gs-muted)]">{roleLabel}</p>
            </div>
            <p className="mt-4 text-xs text-[var(--gs-muted)]">Minimum 10 characters. You cannot skip this step.</p>
          </div>

          <form className="flex min-w-0 flex-1 flex-col justify-center" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  Current temporary password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">New password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Confirm password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20"
                />
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={busy || signingOut}
                onClick={() => void onSignOut()}
                className="text-sm font-semibold text-[var(--gs-muted)] transition hover:text-[var(--gs-text)] disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out instead"}
              </button>
              <button
                type="submit"
                disabled={busy || signingOut}
                className="rounded-xl bg-[var(--gs-accent)] px-8 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--gs-accent-hover)] disabled:opacity-60 sm:min-w-[12rem]"
              >
                {busy ? "Saving…" : "Save and continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
