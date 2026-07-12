"use client";

import { useEffect, useState } from "react";

import { PermissionLevelBadge } from "@/components/rbac/PermissionLevelBadge";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { AsyncActionButton, BusyOverlay, InlineSpinner, TableRefreshOverlay } from "@/components/ui/AsyncFeedback";
import { ACCESS_LEVELS, type AccessLevel } from "@/lib/permissions";
import { cloneRole, createRole, deactivateRole, fetchRoles, updateRole, type PermissionModule, type RoleRecord } from "@/lib/rbacApi";

function emptyPermissions(modules: PermissionModule[]): Record<string, AccessLevel> {
  return Object.fromEntries(modules.map((m) => [m.key, "none" as AccessLevel]));
}

export function RolesAccessTable({ embedded = false }: { embedded?: boolean }) {
  const { pushToast, confirm } = useAppNotifications();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | { edit: RoleRecord } | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: {} as Record<string, AccessLevel> });

  async function load(refresh = false) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await fetchRoles();
      setRoles(data.items);
      setModules(data.modules);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to load roles", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = roles.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q);
  });

  function openCreate() {
    setForm({ name: "", description: "", permissions: emptyPermissions(modules) });
    setModal("create");
  }

  function openEdit(role: RoleRecord) {
    setForm({ name: role.name, description: role.description ?? "", permissions: { ...role.permissions } });
    setModal({ edit: role });
  }

  async function saveRole() {
    if (!form.name.trim()) {
      pushToast("Role name is required.", "error");
      return;
    }
    try {
      setSaving(true);
      if (modal === "create") {
        await createRole({ name: form.name.trim(), description: form.description.trim() || null, permissions: form.permissions });
        pushToast("Role created.", "success");
      } else if (modal && typeof modal === "object") {
        await updateRole(modal.edit.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          permissions: modal.edit.is_system ? undefined : form.permissions,
        });
        pushToast("Role updated.", "success");
      }
      setModal(null);
      await load(true);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function runRowAction(roleId: string, action: () => Promise<void>) {
    setRowBusyId(roleId);
    try {
      await action();
    } finally {
      setRowBusyId(null);
    }
  }

  async function onClone(role: RoleRecord) {
    const name = `${role.name} (copy)`;
    try {
      await runRowAction(role.id, async () => {
        await cloneRole(role.id, name, role.description);
        pushToast("Role cloned.", "success");
        await load(true);
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Clone failed", "error");
    }
  }

  async function onDeactivate(role: RoleRecord) {
    const ok = await confirm({
      title: "Deactivate role?",
      message: `Deactivate "${role.name}"? Users must be reassigned first.`,
      confirmLabel: "Deactivate",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await runRowAction(role.id, async () => {
        await deactivateRole(role.id);
        pushToast("Role deactivated.", "success");
        await load(true);
      });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Deactivate failed", "error");
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
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Roles &amp; access control</h2>
          <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Create custom roles and set module permissions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles…"
            className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)]"
          />
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Create new role
          </button>
        </div>
      </div>

      <div
        className={
          embedded
            ? "relative min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/20 px-1 pb-3 pt-1 [-webkit-overflow-scrolling:touch]"
            : "relative overflow-x-auto overscroll-x-contain px-1 pb-2 [-webkit-overflow-scrolling:touch]"
        }
      >
        {refreshing ? <TableRefreshOverlay label="Updating roles…" /> : null}
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            <tr>
              <th className="px-4 py-3">Role</th>
              {modules.map((m) => (
                <th key={m.key} className="px-2 py-3 text-center">
                  {m.label.split(" ")[0]}
                </th>
              ))}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
            {loading ? (
              <tr>
                <td colSpan={modules.length + 3} className="px-4 py-8 text-center text-[var(--gs-muted)]">
                  Loading roles…
                </td>
              </tr>
            ) : (
              filtered.map((role) => (
                <tr key={role.id} className="hover:bg-[var(--gs-hover)]/80">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--gs-text)]">{role.name}</div>
                    <div className="text-xs text-[var(--gs-muted)]">
                      {role.slug}
                      {role.is_system ? " · system" : " · custom"}
                      {role.user_count > 0 ? ` · ${role.user_count} user(s)` : ""}
                    </div>
                  </td>
                  {modules.map((m) => (
                    <td key={m.key} className="px-2 py-3 text-center">
                      <PermissionLevelBadge level={(role.permissions[m.key] ?? "none") as AccessLevel} />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                        role.is_active
                          ? "bg-emerald-100 text-emerald-950 ring-emerald-300"
                          : "bg-[var(--gs-hover)] text-[var(--gs-muted)] ring-[var(--gs-border)]"
                      }`}
                    >
                      {role.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {rowBusyId === role.id ? (
                      <span className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-[var(--gs-muted)]">
                        <InlineSpinner className="h-3.5 w-3.5" />
                        Working…
                      </span>
                    ) : (
                      <RowActionsMenu
                        disabled={rowBusyId !== null || refreshing}
                        actions={[
                          {
                            label: role.is_system ? "View / clone" : "Edit role",
                            onSelect: () => openEdit(role),
                            tone: "accent",
                          },
                          { label: "Clone role", onSelect: () => void onClone(role), tone: "info" },
                          ...(role.is_system
                            ? []
                            : [{ label: "Deactivate", onSelect: () => void onDeactivate(role), tone: "danger" as const }]),
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
          <div className="relative max-h-[min(92vh,calc(100dvh-1.5rem))] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl sm:p-6">
            {saving ? (
              <BusyOverlay label={modal === "create" ? "Creating role…" : "Saving changes…"} />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-[var(--gs-text)]">
                {modal === "create" ? "Create new role" : modal.edit.is_system ? "System role (read-only permissions)" : "Edit role"}
              </h3>
              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(null)}
                className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <fieldset disabled={saving} className="mt-4 space-y-3 disabled:opacity-80">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Role name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={modal !== "create" && typeof modal === "object" && modal.edit.is_system}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm outline-none focus:border-[var(--gs-accent)]"
                  placeholder="Junior accountant"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm outline-none focus:border-[var(--gs-accent)]"
                  placeholder="Optional description"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--gs-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Module</th>
                      {ACCESS_LEVELS.map((level) => (
                        <th key={level} className="px-2 py-2 text-center">
                          {level}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((m) => {
                      const locked = modal !== "create" && typeof modal === "object" && modal.edit.is_system;
                      const current = (form.permissions[m.key] ?? "none") as AccessLevel;
                      return (
                        <tr key={m.key} className="border-t border-[var(--gs-border)]">
                          <td className="px-3 py-2 font-medium text-[var(--gs-text)]">{m.label}</td>
                          {ACCESS_LEVELS.map((level) => (
                            <td key={level} className="px-2 py-2 text-center">
                              <input
                                type="radio"
                                name={`perm-${m.key}`}
                                checked={current === level}
                                disabled={locked}
                                onChange={() => setForm((f) => ({ ...f, permissions: { ...f.permissions, [m.key]: level } }))}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {modal !== "create" && typeof modal === "object" && modal.edit.is_system ? (
                <p className="text-xs text-[var(--gs-muted)]">System role permissions are locked. Clone this role to customize access.</p>
              ) : null}

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
                  busyLabel={modal === "create" ? "Creating…" : "Saving…"}
                  idleLabel={modal === "create" ? "Create role" : "Save changes"}
                  onClick={() => void saveRole()}
                />
              </div>
            </fieldset>
          </div>
        </div>
      ) : null}
    </section>
  );
}
