"use client";

import { useMemo, useState, type ReactNode } from "react";

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
    lastLogin: "—",
    otpVerified: false,
  },
];

function statusPill(status: UserStatus) {
  if (status === "active") {
    return <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">Active</span>;
  }
  if (status === "invited") {
    return <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">Invited</span>;
  }
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Disabled</span>;
}

function userModal(
  title: string,
  onClose: () => void,
  children: ReactNode,
  wide?: boolean,
) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 pt-6 sm:items-center sm:p-4 sm:py-8">
      <div
        className={`w-full max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6 ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--gs-navy)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
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
  if (kind === "full") return <span className="text-emerald-600" title="Full">●</span>;
  if (kind === "view") return <span className="text-sky-600" title="View">◐</span>;
  if (kind === "own") return <span className="text-amber-600" title="Own / limited">◑</span>;
  return <span className="text-slate-300">—</span>;
}

export function UsersRolesWorkspace() {
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
      window.alert("Name and email are required.");
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
          lastLogin: "—",
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
    window.alert("Demo: user saved. Wire to auth API (email + password, OTP per SRS).");
  }

  function toggleDisable(u: UserRow) {
    const next: UserStatus = u.status === "disabled" ? "active" : "disabled";
    if (!window.confirm(next === "disabled" ? "Disable this user? (SRS: prefer soft-disable over hard delete.)" : "Re-enable this user?")) return;
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-[var(--gs-navy)]">User &amp; access control (SRS)</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--gs-muted)]">
          Multi-user access with role-based permissions: create users, assign roles, and restrict modules. Authentication is specified as{" "}
          <strong className="text-slate-700">email + password</strong> with <strong className="text-slate-700">one-time OTP</strong> on first login or
          verification. This screen is a frontend demo; connect your identity provider and policy engine next.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">Email + password</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">OTP (first login)</span>
          <span className="rounded-full bg-[var(--gs-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--gs-accent)] ring-1 ring-orange-200">
            Role-based access
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--gs-navy)]">Users</h2>
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
            <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
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
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-700">{u.email}</td>
                  <td className="px-5 py-3 text-slate-700">{roleBySlug[u.role]?.title ?? u.role}</td>
                  <td className="px-5 py-3">{statusPill(u.status)}</td>
                  <td className="px-5 py-3 text-slate-600">{u.otpVerified ? "Verified" : "Pending"}</td>
                  <td className="px-5 py-3 text-slate-500">{u.lastLogin}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <RowActionsMenu
                        actions={[
                          { label: "Edit user", onSelect: () => openEdit(u), tone: "accent" },
                          {
                            label: u.status === "disabled" ? "Enable user" : "Disable user",
                            onSelect: () => toggleDisable(u),
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

      <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Access matrix (illustrative)</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">
            ● full · ◐ view · ◑ own/limited · — none. Tune in your policy layer; FEP is restricted from company-wide reports per SRS.
          </p>
        </div>
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] p-5 pt-0">
          <table className="min-w-[720px] w-full text-center text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="py-3 pr-4 text-left">Area</th>
                {ROLES.map((r) => (
                  <th key={r.slug} className="px-1 py-3">
                    {r.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ACCESS_MATRIX.map((row) => (
                <tr key={row.key}>
                  <td className="py-3 pr-4 text-left font-medium text-slate-800">{row.label}</td>
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
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Full name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Email (login) *</label>
                <input
                  type="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleSlug }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  {ROLES.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.title} — {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UserStatus }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option value="invited">Invited (OTP pending)</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Password setup and OTP delivery are not implemented in this demo; your backend should enforce verification and audit logging per SRS.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
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
