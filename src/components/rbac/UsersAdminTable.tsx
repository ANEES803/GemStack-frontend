"use client";

import { useEffect, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { AsyncActionButton, BusyOverlay, InlineSpinner, TableRefreshOverlay } from "@/components/ui/AsyncFeedback";
import { adminResetPassword } from "@/lib/authClient";
import {
  createAdminUser,
  fetchAdminUsers,
  fetchRoles,
  generateTempPassword,
  revokeUserSessions,
  updateAdminUser,
  type AdminUserRecord,
  type RoleRecord,
} from "@/lib/rbacApi";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function UsersAdminTable({ embedded = false }: { embedded?: boolean }) {
  const { pushToast, confirm, prompt } = useAppNotifications();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | { edit: AdminUserRecord } | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
    tempPassword: "",
    isActive: true,
  });

  async function load(refresh = false) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [userRows, roleData] = await Promise.all([fetchAdminUsers(), fetchRoles()]);
      setUsers(userRows);
      setRoles(roleData.items.filter((r) => r.is_active));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to load users", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.role_name ?? "").toLowerCase().includes(q)
    );
  });

  function openAdd() {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      roleId: roles[0]?.id ?? "",
      tempPassword: generateTempPassword(),
      isActive: true,
    });
    setModal("add");
  }

  function openEdit(user: AdminUserRecord) {
    setForm({
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      email: user.email,
      roleId: user.role_id ?? roles[0]?.id ?? "",
      tempPassword: "",
      isActive: user.is_active,
    });
    setModal({ edit: user });
  }

  async function saveUser() {
    if (!form.firstName.trim() || !form.email.trim() || !form.roleId) {
      pushToast("Name, email, and role are required.", "error");
      return;
    }
    const normalizedEmail = form.email.trim().toLowerCase();
    if (modal === "add") {
      const alreadyListed = users.some((u) => u.email.toLowerCase() === normalizedEmail);
      if (alreadyListed) {
        pushToast("This email is already in your user list. Use Reset password on that user instead.", "error");
        return;
      }
      if (form.tempPassword.length < 10) {
        pushToast("Temporary password must be at least 10 characters.", "error");
        return;
      }
    }
    try {
      setSaving(true);
      if (modal === "add") {
        await createAdminUser({
          email: normalizedEmail,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim() || null,
          role_id: form.roleId,
          temporary_password: form.tempPassword,
          is_active: form.isActive,
        });
        pushToast("User created. Share the temporary password securely.", "success");
      } else if (modal && typeof modal === "object") {
        await updateAdminUser(modal.edit.id, {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim() || null,
          role_id: form.roleId,
          is_active: form.isActive,
        });
        pushToast("User updated.", "success");
      }
      setModal(null);
      await load(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      if (modal === "add" && message.toLowerCase().includes("already registered")) {
        pushToast("This email is already registered. Find the user and use Reset password.", "error");
      } else {
        pushToast(message, "error");
      }
    } finally {
      setSaving(false);
    }
  }

  async function runRowAction(userId: string, action: () => Promise<void>) {
    setRowBusyId(userId);
    try {
      await action();
    } finally {
      setRowBusyId(null);
    }
  }

  async function toggleActive(user: AdminUserRecord) {
    const next = !user.is_active;
    const ok = await confirm({
      title: next ? "Enable user?" : "Disable user?",
      message: next ? `Re-enable ${user.email}?` : `Disable ${user.email}? They will be logged out.`,
      confirmLabel: next ? "Enable" : "Disable",
      variant: next ? "default" : "danger",
    });
    if (!ok) return;
    try {
      await runRowAction(user.id, async () => {
        await updateAdminUser(user.id, { is_active: next });
        pushToast(next ? "User enabled." : "User disabled.", "success");
        await load(true);
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Update failed", "error");
    }
  }

  async function resetPassword(user: AdminUserRecord) {
    const temp = generateTempPassword();
    const ok = await confirm({
      title: "Reset password?",
      message: `Set a new temporary password for ${user.email}?`,
      confirmLabel: "Reset",
      variant: "warning",
    });
    if (!ok) return;
    try {
      await runRowAction(user.id, async () => {
        await adminResetPassword(user.id, temp);
        await prompt({
          title: "Temporary password",
          message: `Copy this password and share it securely with ${user.email}:`,
          defaultValue: temp,
          submitLabel: "Done",
        });
        pushToast("Password reset.", "success");
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Reset failed", "error");
    }
  }

  async function forceLogout(user: AdminUserRecord) {
    try {
      await runRowAction(user.id, async () => {
        await revokeUserSessions(user.id);
        pushToast("Sessions revoked.", "success");
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to revoke sessions", "error");
    }
  }

  return (
    <section
      className={
        embedded
          ? "flex min-w-0 flex-col gap-4"
          : "overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm"
      }
    >
      <div
        className={
          embedded
            ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            : "flex flex-col gap-3 border-b border-[var(--gs-border)] p-5 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        <div>
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Users</h2>
          <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Add teammates and assign a role.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm outline-none focus:border-[var(--gs-accent)]"
          />
          <button
            type="button"
            onClick={openAdd}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Add user
          </button>
        </div>
      </div>

      <div
        className={
          embedded
            ? "relative min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/20 px-1 pb-3 pt-1 [-webkit-overflow-scrolling:touch]"
            : "relative overflow-x-auto overscroll-x-contain px-5 pb-4 [-webkit-overflow-scrolling:touch]"
        }
      >
        {refreshing ? <TableRefreshOverlay label="Updating users…" /> : null}
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Last login</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[var(--gs-muted)]">
                  Loading users…
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--gs-hover)]/80">
                  <td className="px-5 py-3 font-medium text-[var(--gs-text)]">{u.display_name ?? u.first_name ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-5 py-3">{u.role_name ?? u.role_slug ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        u.is_active
                          ? "bg-emerald-100 text-emerald-950 ring-emerald-300"
                          : "bg-[var(--gs-hover)] text-[var(--gs-muted)] ring-[var(--gs-border)]"
                      }`}
                    >
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--gs-muted)]">{formatDate(u.last_login_at)}</td>
                  <td className="px-5 py-3 text-right">
                    {rowBusyId === u.id ? (
                      <span className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-[var(--gs-muted)]">
                        <InlineSpinner className="h-3.5 w-3.5" />
                        Working…
                      </span>
                    ) : (
                      <RowActionsMenu
                        disabled={rowBusyId !== null || refreshing}
                        actions={[
                          { label: "Edit user", onSelect: () => openEdit(u), tone: "accent" },
                          {
                            label: u.is_active ? "Disable user" : "Enable user",
                            onSelect: () => void toggleActive(u),
                            tone: u.is_active ? "warning" : "success",
                          },
                          { label: "Reset password", onSelect: () => void resetPassword(u), tone: "info" },
                          { label: "Force logout", onSelect: () => void forceLogout(u), tone: "danger" },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 pt-6 sm:items-center sm:p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl sm:p-6">
            {saving ? <BusyOverlay label={modal === "add" ? "Creating user…" : "Saving user…"} /> : null}
            <h3 className="text-lg font-bold text-[var(--gs-text)]">{modal === "add" ? "Add user" : "Edit user"}</h3>
            <fieldset disabled={saving} className="mt-4 space-y-3 disabled:opacity-80">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">First name *</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm outline-none focus:border-[var(--gs-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Last name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm outline-none focus:border-[var(--gs-accent)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  disabled={modal !== "add"}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm outline-none focus:border-[var(--gs-accent)] disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Role *</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm outline-none focus:border-[var(--gs-accent)]"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.is_system ? " (system)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {modal === "add" ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Temporary password *</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={form.tempPassword}
                      onChange={(e) => setForm((f) => ({ ...f, tempPassword: e.target.value }))}
                      className="w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--gs-accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tempPassword: generateTempPassword() }))}
                      className="shrink-0 rounded-full border border-[var(--gs-border)] px-3 py-2 text-xs font-semibold"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-[var(--gs-text)]">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Active account
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModal(null)}
                  className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <AsyncActionButton
                  busy={saving}
                  busyLabel={modal === "add" ? "Creating…" : "Saving…"}
                  idleLabel="Save"
                  onClick={() => void saveUser()}
                />
              </div>
            </fieldset>
          </div>
        </div>
      ) : null}
    </section>
  );
}
