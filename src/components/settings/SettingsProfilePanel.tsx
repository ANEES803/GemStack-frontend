"use client";

import { useEffect, useState } from "react";

import { SettingsEditButton, SettingsPanelHeader, SettingsRow } from "@/components/settings/settingsUi";
import { getMe, getStoredUser, type AuthUser } from "@/lib/authClient";
import { ROLES } from "@/lib/roles";

function displayName(user: AuthUser): string {
  if (user.display_name?.trim()) return user.display_name.trim();
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return user.email.split("@")[0] ?? "User";
}

function roleLabel(role: AuthUser["role"]): string {
  return ROLES.find((r) => r.slug === role)?.label ?? role;
}

/** My profile tab — read-only rows with demo edit actions. */
export function SettingsProfilePanel() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(!getStoredUser());

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(getStoredUser());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <SettingsPanelHeader title="My profile" description="Your personal account details." />
        <div className="px-6 py-8 text-sm text-[var(--gs-muted)]">Loading profile…</div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SettingsPanelHeader title="My profile" description="Your personal account details." />
        <div className="px-6 py-8 text-sm text-[var(--gs-muted)]">Sign in to view your profile.</div>
      </>
    );
  }

  return (
    <>
      <SettingsPanelHeader
        title="My profile"
        description="Manage how you appear in GemStack and how we contact you."
      />
      <SettingsRow
        title="Display name"
        description={displayName(user)}
        action={<SettingsEditButton onClick={() => undefined} />}
      />
      <SettingsRow
        title="Email address"
        description={user.email}
        action={<SettingsEditButton onClick={() => undefined} />}
      />
      <SettingsRow
        title="Role"
        description={`${roleLabel(user.role)} — assigned by your workspace admin.`}
      />
      <SettingsRow
        title="Business ID"
        description={user.business_id ?? "Not linked to a business yet (demo)."}
        action={user.business_id ? <SettingsEditButton label="View" onClick={() => undefined} /> : undefined}
      />
    </>
  );
}
