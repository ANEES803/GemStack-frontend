"use client";

import { useEffect, useState } from "react";

import {
  ProfileCard,
  ProfileDetailField,
  ProfileDetailGrid,
  ProfileSectionTitle,
  formatProfileDate,
} from "@/components/profile/profileUi";
import { SettingsEditButton } from "@/components/settings/settingsUi";
import { usePermissions } from "@/contexts/PermissionContext";
import { changePassword, displayName, getMe, getStoredUser, type AuthUser } from "@/lib/authClient";
import { canAccess } from "@/lib/permissions";
import { ROLES } from "@/lib/roles";

function roleLabel(user: AuthUser): string {
  if (user.role_name?.trim()) return user.role_name.trim();
  return ROLES.find((r) => r.slug === user.role)?.label ?? user.role;
}

/** Login & security — password change and session summary. */
export function ProfileSecurityPanel() {
  const { user: ctxUser, setUser } = usePermissions();
  const [user, setLocalUser] = useState<AuthUser | null>(ctxUser ?? getStoredUser());
  const [editingPassword, setEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((u) => {
        if (!cancelled) {
          setLocalUser(u);
          setUser(u);
        }
      })
      .catch(() => {
        if (!cancelled) setLocalUser(getStoredUser());
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const canResetOthers = canAccess(user?.permissions.users_roles, "edit");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      setUser(updated);
      setLocalUser(updated);
      setMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setEditingPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <ProfileCard>
        <div className="px-6 py-12 text-sm text-[var(--gs-muted)]">Sign in to manage security settings.</div>
      </ProfileCard>
    );
  }

  return (
    <div className="space-y-6">
      <ProfileCard>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--gs-border)] px-6 py-5">
          <div>
            <ProfileSectionTitle>Password</ProfileSectionTitle>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">Use at least 10 characters with letters and numbers.</p>
          </div>
          {!editingPassword ? (
            <SettingsEditButton onClick={() => setEditingPassword(true)} label="Change" />
          ) : (
            <SettingsEditButton label="Cancel" onClick={() => setEditingPassword(false)} />
          )}
        </div>
        {editingPassword ? (
          <form className="space-y-4 px-6 py-5" onSubmit={onSubmit}>
            <div>
              <label className="gs-label">Current password</label>
              <input
                type="password"
                required
                className="gs-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="gs-label">New password</label>
              <input
                type="password"
                required
                minLength={10}
                className="gs-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
            {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        ) : null}
      </ProfileCard>

      <ProfileCard>
        <div className="px-6 py-6">
          <ProfileSectionTitle>Account</ProfileSectionTitle>
          <div className="mt-5">
            <ProfileDetailGrid>
              <ProfileDetailField label="Signed in as" value={user.email} />
              <ProfileDetailField label="Display name" value={displayName(user)} />
              <ProfileDetailField label="Role" value={roleLabel(user)} />
              <ProfileDetailField
                label="Password policy"
                value={
                  user.must_change_password ? (
                    <span className="text-amber-700 dark:text-amber-300">You must change your password on next sign-in.</span>
                  ) : (
                    "Up to date"
                  )
                }
              />
            </ProfileDetailGrid>
          </div>
        </div>
      </ProfileCard>

      <ProfileCard>
        <div className="px-6 py-6">
          <ProfileSectionTitle>Session</ProfileSectionTitle>
          <p className="mt-5 text-sm font-semibold text-[var(--gs-text)]">
            {user.email} · {roleLabel(user)}
          </p>
          <p className="mt-2 text-sm text-[var(--gs-muted)]">
            Last login: {formatProfileDate(user.last_login_at)}
          </p>
        </div>
      </ProfileCard>

      {!canResetOthers ? (
        <ProfileCard>
          <div className="px-6 py-6">
            <ProfileSectionTitle>Need a reset?</ProfileSectionTitle>
            <p className="mt-2 text-sm text-[var(--gs-muted)]">
              If you forgot your password, contact your workspace admin. They can set a temporary password from{" "}
              <strong>Settings → Users &amp; roles</strong>.
            </p>
          </div>
        </ProfileCard>
      ) : null}
    </div>
  );
}
