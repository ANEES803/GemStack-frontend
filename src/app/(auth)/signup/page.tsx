"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";

export default function SignupPage() {
  const { pushToast } = useAppNotifications();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      pushToast("Passwords do not match.", "error");
      return;
    }
    if (!accept) {
      pushToast("Please accept the terms to continue.", "error");
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      router.push("/dashboard");
    }, 500);
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Start with your company details. You can invite teammates after setup."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--gs-accent)] hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            Full name
          </label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-text)] outline-none transition focus:border-[var(--gs-accent)] focus:bg-[var(--gs-card)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            placeholder="Sara Malik"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            Work email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-text)] outline-none transition focus:border-[var(--gs-accent)] focus:bg-[var(--gs-card)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-text)] outline-none transition focus:border-[var(--gs-accent)] focus:bg-[var(--gs-card)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-text)] outline-none transition focus:border-[var(--gs-accent)] focus:bg-[var(--gs-card)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            placeholder="Repeat password"
          />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--gs-muted)]">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--gs-border-strong)] text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]"
          />
          <span>
            I agree to the <button type="button" className="font-semibold text-[var(--gs-accent)] hover:underline">Terms</button> and{" "}
            <button type="button" className="font-semibold text-[var(--gs-accent)] hover:underline">Privacy policy</button> (demo).
          </span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--gs-accent)] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}