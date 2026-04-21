"use client";

import { useMemo, useState, type ReactNode } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { ROLES, type RoleDefinition, type RoleSlug } from "@/lib/roles";

type UserStatus = "active" | "invited" | "disabled";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: RoleSlug;
  status: UserStatus;
  lastLogin: string;
  otpVerified: boolean;
};

const INITIAL_USERS: UserRow[] = [
  {
    id: "u1",
    name: "Sara Malik",
    email: "sara@gemstack.demo",
    role: "owner",
    status: "active",
    lastLogin: "2026-04-01 09:12",
    otpVerified: true,
  },
  {
    id: "u2",
    name: "Omar Raza",
    email: "omar@gemstack.demo",
    role: "admin",
    status: "active",
    lastLogin: "2026-03-31 16:40",
    otpVerified: true,
  },
  {
    id: "u3",
    name: "Nadia Iqbal",
    email: "nadia@gemstack.demo",
    role: "accountant",
    status: "active",
    lastLogin: "2026-03-30 11:05",
    otpVerified: true,
  },
  {
    id: "u4",
    name: "Hassan Khan",
    email: "hassan@gemstack.demo",
    role: "stock-manager",
    status: "active",
    lastLogin: "2026-03-29 08:22",
    otpVerified: true,
  },
  {
    id: "u5",
    name: "Ali FEP",
    email: "ali.fep@gemstack.demo",
    role: "fep",
    status: "invited",
    lastLogin: "",
    otpVerified: false,
  },
];

function statusPill(status: UserStatus) {
  if (status === "active") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-950 ring-1 ring-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-100 dark:ring-emerald-700">
        Active
      </span>
    );
  }
  if (status === "invited") {
    return (
      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-950 ring-1 ring-sky-200 dark:bg-sky-950/85 dark:text-sky-100 dark:ring-sky-700">
        Invited
      </span>
    );
  }
  return <span className="inline-flex rounded-full bg-[var(--gs-hover)] px-2.5 py-0.5 text-xs font-semibold text-[var(--gs-muted)] ring-1 ring-[var(--gs-border)]">Disabled</span>;
}

function userModal(
  title: string,
  onClose: () => void,
  children: ReactNode,
  wide?: boolean,
) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 pt-6 sm:items-center sm:p-4 sm:py-8">
      <div
        className={`w-full max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4 shadow-2xl sm:p-6 ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--gs-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** SRS §1.7 / User module: coarse access by role (demo matrix). */
const ACCESS_MATRIX: { key: string; label: string }[] = [
  { key: "dash", label: "Dashboards & KPIs" },
  { key: "inv", label: "Lots & parcels" },
  { key: "sales", label: "Sales / invoices" },
  { key: "fin", label: "Accounting & expenses" },
  { key: "rep", label: "Company reports & exports" },
  { key: "fep", label: "FEP commission (company)" },
  { key: "part", label: "Partners & capital" },
  { key: "sys", label: "Users & roles" },
];

function matrixCell(role: RoleSlug, rowKey: string): "full" | "view" | "own" | "none" {
  const r = role;
  const map: Record<RoleSlug, Record<string, "full" | "view" | "own" | "none">> = {
    owner: { dash: "view", inv: "view", sales: "view", fin: "view", rep: "view", fep: "view", part: "view", sys: "view" },
    admin: { dash: "full", inv: "full", sales: "full", fin: "full", rep: "full", fep: "full", part: "full", sys: "full" },
    accountant: { dash: "view", inv: "view", sales: "view", fin: "full", rep: "full", fep: "view", part: "view", sys: "none" },
    "stock-manager": { dash: "view", inv: "full", sales: "view", fin: "none", rep: "view", fep: "view", part: "none", sys: "none" },
    fep: { dash: "own", inv: "own", sales: "full", fin: "none", rep: "none", fep: "own", part: "none", sys: "none" },
  };
  return map[r][rowKey] ?? "none";
}

function CellIcon({ kind }: { kind: "full" | "view" | "own" | "none" }) {
  if (kind === "full") return <span className="text-[var(--gs-accent)]" title="Full">✓</span>;
  if (kind === "view") return <span className="text-[var(--gs-muted)]" title="View">○</span>;
  if (kind === "own") return <span className="text-[var(--gs-muted)]" title="Own / limited">○</span>;
  return <span className="text-[var(--gs-muted)]"></span>;
}

export function UsersRolesWorkspace() {
  const { pushToast, confirm } = useAppNotifications();
  const [users, setUsers] = useState<UserRow[]>(INITIAL_USERS);
  const [modal, setModal] = useState<"add" | { edit: UserRow } | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "fep" as RoleSlug,
    status: "invited" as UserStatus,
  });

  const roleBySlug = useMemo(() => Object.fromEntries(ROLES.map((r) => [r.slug, r])) as Record<RoleSlug, RoleDefinition>, []);

  function openAdd() {
    setForm({ name: "", email: "", role: "fep", status: "invited" });
    setModal("add");
  }

  function openEdit(u: UserRow) {
    setForm({ name: u.name, email: u.email, role: u.role, status: u.status });
    setModal({ edit: u });
  }

  function saveUser() {
    if (!form.name.trim() || !form.email.trim()) {
      pushToast("Name and email are required.", "error");
      return;
    }
    if (modal === "add") {
      setUsers((prev) => [
        {
          id: `u-${Date.now()}`,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          status: form.status,
          lastLogin: "",
          otpVerified: false,
        },
        ...prev,
      ]);
    } else if (modal && typeof modal === "object") {
      const id = modal.edit.id;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                role: form.role,
                status: form.status,
              }
            : u,
        ),
      );
    }
    setModal(null);
    pushToast("Demo: user saved. Wire to auth API (email + password, OTP per SRS).", "info");
  }

  async function toggleDisable(u: UserRow) {
    const next: UserStatus = u.status === "disabled" ? "active" : "disabled";
    const ok = await confirm({
      title: next === "disabled" ? "Disable user?" : "Re-enable user?",
      message:
        next === "disabled"
          ? "Disable this user? (SRS: prefer soft-disable over hard delete.)"
          : "Re-enable this user?",
      confirmLabel: next === "disabled" ? "Disable" : "Re-enable",
      variant: next === "disabled" ? "danger" : "default",
    });
    if (!ok) return;
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[var(--gs-text)]">User &amp; access control (SRS)</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--gs-muted)]">
          Multi-user access with role-based permissions: create users, assign roles, and restrict modules. Authentication is specified as{" "}
          <strong className="text-[var(--gs-text)]">email + password</strong> with <strong className="text-[var(--gs-text)]">one-time OTP</strong> on first login or
          verification. This screen is a frontend demo; connect your identity provider and policy engine next.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--gs-hover)] px-3 py-1 text-xs font-semibold text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]">Email + password</span>
          <span className="rounded-full bg-[var(--gs-hover)] px-3 py-1 text-xs font-semibold text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]">OTP (first login)</span>
          <span className="rounded-full bg-[var(--gs-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--gs-accent)] ring-1 ring-orange-200">
            Role-based access
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--gs-text)]">Users</h2>
            <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Create users and assign a single primary role (demo list).</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Add user
          </button>
        </div>
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">OTP</th>
                <th className="px-5 py-3">Last login</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--gs-hover)]/80">
                  <td className="px-5 py-3 font-medium text-[var(--gs-text)]">{u.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[var(--gs-text)]">{u.email}</td>
                  <td className="px-5 py-3 text-[var(--gs-text)]">{roleBySlug[u.role]?.title ?? u.role}</td>
                  <td className="px-5 py-3">{statusPill(u.status)}</td>
                  <td className="px-5 py-3 text-[var(--gs-muted)]">{u.otpVerified ? "Verified" : "Pending"}</td>
                  <td className="px-5 py-3 text-[var(--gs-muted)]">{u.lastLogin}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <RowActionsMenu
                        actions={[
                          { label: "Edit user", onSelect: () => openEdit(u), tone: "accent" },
                          {
                            label: u.status === "disabled" ? "Enable user" : "Disable user",
                            onSelect: () => void toggleDisable(u),
                            tone: u.status === "disabled" ? "success" : "warning",
                          },
                          { label: "View profile", tone: "default" },
                          { label: "Reset OTP", tone: "info" },
                          { label: "Force logout", tone: "danger" },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
        <div className="border-b border-[var(--gs-border)] p-5">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Access matrix (illustrative)</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">
            ✓ full · ○ view · ○ own/limited ·  none. Tune in your policy layer; FEP is restricted from company-wide reports per SRS.
          </p>
        </div>
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] p-5 pt-0">
          <table className="min-w-[720px] w-full text-center text-sm">
            <thead>
              <tr className="border-b border-[var(--gs-border)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <th className="py-3 pr-4 text-left">Area</th>
                {ROLES.map((r) => (
                  <th key={r.slug} className="px-1 py-3">
                    {r.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
              {ACCESS_MATRIX.map((row) => (
                <tr key={row.key}>
                  <td className="py-3 pr-4 text-left font-medium text-[var(--gs-text)]">{row.label}</td>
                  {ROLES.map((r) => (
                    <td key={r.slug} className="px-1 py-3">
                      <CellIcon kind={matrixCell(r.slug, row.key)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal
        ? userModal(
            modal === "add" ? "Add user" : "Edit user",
            () => setModal(null),
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Full name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Email (login) *</label>
                <input
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleSlug }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  {ROLES.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.title}  {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UserStatus }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option value="invited">Invited (OTP pending)</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <p className="rounded-lg bg-[var(--gs-hover)] px-3 py-2 text-xs text-[var(--gs-muted)]">
                Password setup and OTP delivery are not implemented in this demo; your backend should enforce verification and audit logging per SRS.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)]">
                  Cancel
                </button>
                <button type="button" onClick={saveUser} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </div>,
          )
        : null}
    </div>
  );
}