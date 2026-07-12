"use client";

import { Camera, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PermissionLevelBadge } from "@/components/rbac/PermissionLevelBadge";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import {
  ProfileCard,
  ProfileDetailField,
  ProfileDetailGrid,
  ProfileDetailInput,
  ProfileSectionTitle,
  ProfileStatusBadge,
  formatProfileDate,
} from "@/components/profile/profileUi";
import { SettingsEditButton } from "@/components/settings/settingsUi";
import { usePermissions } from "@/contexts/PermissionContext";
import {
  avatarSrc,
  displayName,
  getMe,
  getStoredUser,
  updateMe,
  uploadAvatar,
  type AuthUser,
} from "@/lib/authClient";
import { PERMISSION_MODULE_LABELS, type AccessLevel } from "@/lib/permissions";
import { ROLES } from "@/lib/roles";

function roleLabel(user: AuthUser): string {
  if (user.role_name?.trim()) return user.role_name.trim();
  return ROLES.find((r) => r.slug === user.role)?.label ?? user.role;
}

type EditFormState = {
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
};

function toEditForm(user: AuthUser): EditFormState {
  return {
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    display_name: user.display_name ?? "",
    phone: user.phone ?? "",
  };
}

function previewDisplayName(form: EditFormState, email: string): string {
  if (form.display_name.trim()) return form.display_name.trim();
  const parts = [form.first_name, form.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return email.split("@")[0] ?? "User";
}

/** My profile — card layout with avatar, details, and permissions. */
export function ProfilePagePanel() {
  const { setUser } = usePermissions();
  const { pushToast } = useAppNotifications();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setLocalUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({ first_name: "", last_name: "", display_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = getStoredUser();
    if (cached) setLocalUser(cached);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/gemstack-api";
    fetch(`${apiBase}/health/avatar-storage`)
      .then(async (r) => {
        if (r.status === 404) {
          throw new Error(
            "Old backend still on port 8000. Run GemStack-Backend/scripts/stop_port_8000.ps1, then start uvicorn once.",
          );
        }
        if (!r.ok) throw new Error(`Backend health ${r.status}`);
        console.info("[Profile] Backend connected at", apiBase);
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : `Cannot reach API at ${apiBase}. Start uvicorn on port 8000.`;
        pushToast(msg, "error");
      });

    getMe()
      .then((u) => {
        if (!cancelled) {
          setLocalUser(u);
          setUser(u);
        }
      })
      .catch(() => {
        if (!cancelled) setLocalUser(getStoredUser());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  function startEditing() {
    if (!user) return;
    setEditForm(toEditForm(user));
    setEditing(true);
  }

  function cancelEditing() {
    if (user) setEditForm(toEditForm(user));
    setEditing(false);
  }

  async function onAvatarSelected(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    pushToast("Uploading photo to server…", "info");
    if (typeof window !== "undefined") {
      console.info("[Profile] avatar upload start", file.name, file.size, file.type);
    }
    try {
      const updated = await uploadAvatar(file);
      if (typeof window !== "undefined") {
        console.info("[Profile] avatar upload ok", updated.avatar_url);
      }
      setLocalUser(updated);
      setUser(updated);
      pushToast("Profile photo updated.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSaveProfile() {
    setSaving(true);
    try {
      const updated = await updateMe({
        first_name: editForm.first_name.trim() || null,
        last_name: editForm.last_name.trim() || null,
        display_name: editForm.display_name.trim() || null,
        phone: editForm.phone.trim() || null,
      });
      setLocalUser(updated);
      setUser(updated);
      setEditing(false);
      pushToast("Profile updated.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Could not save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProfileCard>
        <div className="px-6 py-12 text-sm text-[var(--gs-muted)]">Loading profile…</div>
      </ProfileCard>
    );
  }

  if (!user) {
    return (
      <ProfileCard>
        <div className="px-6 py-12 text-sm text-[var(--gs-muted)]">Sign in to view your profile.</div>
      </ProfileCard>
    );
  }

  const src = avatarSrc(user.avatar_url);
  const headerName = editing ? previewDisplayName(editForm, user.email) : displayName(user);
  const permissions = PERMISSION_MODULE_LABELS.map((mod) => ({
    ...mod,
    level: (user.permissions[mod.key] ?? "none") as AccessLevel,
  })).filter((row) => row.level !== "none");

  return (
    <div className="space-y-6">
      <ProfileCard>
        <div className="flex flex-col gap-5 border-b border-[var(--gs-border)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-6 sm:py-6">
            <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[var(--gs-hover)] ring-2 ring-[var(--gs-border)] sm:h-24 sm:w-24">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-9 w-9 text-[var(--gs-muted)] sm:h-10 sm:w-10" strokeWidth={1.5} aria-hidden />
                  )}
                </div>
                <label
                  className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-4 w-4" strokeWidth={2} aria-hidden />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    className="sr-only"
                    onChange={(e) => {
                      const picked = e.target.files?.[0];
                      void onAvatarSelected(picked);
                    }}
                  />
                </label>
              </div>
              <div className="min-w-0 flex-1 pt-0.5 text-left sm:pt-1">
                <h2 className="text-lg font-bold leading-tight text-[var(--gs-text)] sm:text-xl">{headerName}</h2>
                <p className="mt-1 break-all text-sm text-[var(--gs-muted)]">{user.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ProfileStatusBadge active={user.is_active} />
                  <span className="text-xs text-[var(--gs-muted)]">{roleLabel(user)}</span>
                </div>
                {uploading ? <p className="mt-2 text-xs text-[var(--gs-muted)]">Uploading photo…</p> : null}
                {editing ? (
                  <p className="mt-2 text-xs text-[var(--gs-muted)]">Edit your details below, then save.</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:ml-2">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)] disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </>
              ) : (
                <SettingsEditButton onClick={startEditing} />
              )}
            </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSaveProfile();
          }}
        >
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <ProfileSectionTitle>Personal details</ProfileSectionTitle>
            <div className="mt-5">
              {editing ? (
                <ProfileDetailGrid>
                  <ProfileDetailInput
                    label="First name"
                    value={editForm.first_name}
                    onChange={(v) => setEditForm((f) => ({ ...f, first_name: v }))}
                    placeholder="First name"
                  />
                  <ProfileDetailInput
                    label="Last name"
                    value={editForm.last_name}
                    onChange={(v) => setEditForm((f) => ({ ...f, last_name: v }))}
                    placeholder="Last name"
                  />
                  <ProfileDetailInput
                    label="Display name"
                    value={editForm.display_name}
                    onChange={(v) => setEditForm((f) => ({ ...f, display_name: v }))}
                    placeholder="How your name appears"
                  />
                  <ProfileDetailInput
                    label="Phone number"
                    value={editForm.phone}
                    onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                    placeholder="Phone"
                  />
                  <ProfileDetailInput label="Email" value={user.email} readOnly />
                  <ProfileDetailInput label="Role" value={roleLabel(user)} readOnly />
                  <ProfileDetailField label="Member since" value={formatProfileDate(user.created_at)} />
                  <ProfileDetailField label="Last login" value={formatProfileDate(user.last_login_at)} />
                </ProfileDetailGrid>
              ) : (
                <ProfileDetailGrid>
                  <ProfileDetailField label="First name" value={user.first_name?.trim() || "Not provided"} />
                  <ProfileDetailField label="Last name" value={user.last_name?.trim() || "Not provided"} />
                  <ProfileDetailField label="Display name" value={user.display_name?.trim() || "Not provided"} />
                  <ProfileDetailField label="Email" value={user.email} />
                  <ProfileDetailField label="Phone number" value={user.phone?.trim() || "Not provided"} />
                  <ProfileDetailField label="Role" value={roleLabel(user)} />
                  <ProfileDetailField label="Member since" value={formatProfileDate(user.created_at)} />
                  <ProfileDetailField label="Last login" value={formatProfileDate(user.last_login_at)} />
                </ProfileDetailGrid>
              )}
            </div>
          </div>
        </form>
      </ProfileCard>

      <ProfileCard>
        <div className="px-6 py-6">
          <ProfileSectionTitle>Access &amp; permissions</ProfileSectionTitle>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">
            What your role allows you to do in GemStack (read-only).
          </p>
          {permissions.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--gs-muted)]">No module access assigned.</p>
          ) : (
            <ul className="mt-5 divide-y divide-[var(--gs-border)] rounded-xl border border-[var(--gs-border)]">
              {permissions.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm font-semibold text-[var(--gs-text)]">{row.label}</span>
                  <PermissionLevelBadge level={row.level} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </ProfileCard>
    </div>
  );
}
