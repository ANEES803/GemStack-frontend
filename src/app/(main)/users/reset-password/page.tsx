"use client";

import { useState } from "react";

import { adminResetPassword } from "@/lib/authClient";

export default function AdminResetPasswordPage() {
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
    <section className="mx-auto max-w-xl rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[var(--gs-text)]">Admin password reset</h2>
      <p className="mt-1 text-sm text-[var(--gs-muted)]">Set a temporary password for a user account.</p>
      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
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
        {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </section>
  );
}