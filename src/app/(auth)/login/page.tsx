"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { isRoleSlug, ROLES, roleHref } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const roleParam = sp.get("role");
  const role = roleParam && isRoleSlug(roleParam) ? ROLES.find((r) => r.slug === roleParam) : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      router.push(role ? roleHref(role.slug) : "/dashboard");
    }, 400);
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
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
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
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--gs-accent)] focus:bg-white focus:ring-2 focus:ring-orange-100"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <button type="button" className="text-xs font-semibold text-[var(--gs-accent)] hover:underline">
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--gs-accent)] focus:bg-white focus:ring-2 focus:ring-orange-100"
            placeholder="••••••••"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]" />
          Remember this device
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--gs-navy)] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
