"use client";

import { useState } from "react";

import { SettingsEditButton, SettingsPanelHeader, SettingsRow } from "@/components/settings/settingsUi";
import { changePassword, getStoredUser } from "@/lib/authClient";
import { ROLES } from "@/lib/roles";

/** Login & security tab — row layout with expandable password form. */
export function SettingsSecurityPanel() {
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const user = getStoredUser();
  const roleLabel = user ? ROLES.find((r) => r.slug === user.role)?.label ?? user.role : "—";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage("Password changed successfully. Please sign in again on other devices.");
      setCurrentPassword("");
      setNewPassword("");
      setEditingPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingsPanelHeader
        title="Login and security"
        description="Update your password and review how you sign in to GemStack."
      />
      <SettingsRow
        title="Change password"
        description="Use a strong password with at least 10 characters."
        action={
          !editingPassword ? (
            <SettingsEditButton onClick={() => setEditingPassword(true)} />
          ) : (
            <SettingsEditButton label="Cancel" onClick={() => setEditingPassword(false)} />
          )
        }
      />
      {editingPassword ? (
        <form className="space-y-4 border-b border-[var(--gs-border)] px-5 py-5 sm:px-6" onSubmit={onSubmit}>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Current password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--gs-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">New password</label>
            <input
              type="password"
              required
              minLength={10}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          <div className="flex justify-end">
            <SettingsEditButton label={busy ? "Updating…" : "Update password"} type="submit" disabled={busy} />
          </div>
        </form>
      ) : null}
      <SettingsRow
        title="Session & role"
        description={user ? `Signed in as ${user.email} · ${roleLabel}` : "Session details unavailable."}
      />
    </>
  );
}
