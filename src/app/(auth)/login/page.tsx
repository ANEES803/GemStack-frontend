"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { login } from "@/lib/authClient";
import { resolvePostLoginPath } from "@/lib/permissions";
import { isRoleSlug, ROLES } from "@/lib/roles";

function LoginPageContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const roleParam = sp.get("role");
  const role = roleParam && isRoleSlug(roleParam) ? ROLES.find((r) => r.slug === roleParam) : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = await login(email, password);
      router.push(resolvePostLoginPath(payload.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle={role ? `Signing in as ${role.title} (demo).` : "Use your work email to access GemStack."}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[var(--gs-accent)] hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {role ? (
        <div className="mb-4 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Selected role</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--gs-text)]">{role.title}</p>
              <p className="mt-0.5 text-xs text-[var(--gs-muted)]">{role.label}</p>
            </div>
            <Link href="/" className="text-xs font-semibold text-[var(--gs-accent)] hover:underline">
              Change
            </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-text)] outline-none transition placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:bg-[var(--gs-card)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
              Password
            </label>
            <span className="text-[11px] font-medium text-[var(--gs-muted)]">Ask admin to reset your password</span>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-text)] outline-none transition focus:border-[var(--gs-accent)] focus:bg-[var(--gs-card)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
            placeholder="••••••••"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--gs-muted)]">
          <input type="checkbox" className="h-4 w-4 rounded border-[var(--gs-border-strong)] text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]" />
          Remember this device
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--gs-accent)] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Sign in" subtitle="Loading…">
          <p className="text-sm text-[var(--gs-muted)]">Loading…</p>
        </AuthShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}