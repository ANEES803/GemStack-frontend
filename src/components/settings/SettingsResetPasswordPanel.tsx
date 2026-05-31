"use client";

import { useState } from "react";

import { SettingsPanelHeader } from "@/components/settings/settingsUi";
import { adminResetPassword } from "@/lib/authClient";

/** Admin temporary password reset form. */
export function SettingsResetPasswordPanel() {
  const [userId, setUserId] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await adminResetPassword(userId, temporaryPassword);
      setMessage("Temporary password set. User must change password on next login.");
      setTemporaryPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingsPanelHeader
        title="Admin password reset"
        description="Set a temporary password for a user account."
      />
      <form className="space-y-4 px-5 py-5 sm:px-6" onSubmit={onSubmit}>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">User ID</label>
          <input
            type="text"
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[var(--gs-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)]"
            placeholder="UUID"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Temporary password</label>
          <input
            type="password"
            required
            minLength={10}
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-[var(--gs-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)]"
          />
        </div>
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)] disabled:opacity-60"
        >
          {busy ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </>
  );
}
