"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { login } from "@/lib/authClient";
import { resolvePostLoginPath } from "@/lib/permissions";
import { isRoleSlug, ROLES } from "@/lib/roles";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-[#f15a24] focus:bg-white/15 focus:ring-2 focus:ring-[#f15a24]/30";

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
      subtitle={role ? `Signing in as ${role.title}.` : "Use your work email to access Solvra."}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-white hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {role ? (
        <div className="mb-4 rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-white/60">Selected role</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{role.title}</p>
              <p className="mt-0.5 text-xs text-white/60">{role.label}</p>
            </div>
            <Link href="/" className="text-xs font-semibold text-[#f15a24] hover:underline">
              Change
            </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-red-300/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100">{error}</p>
        ) : null}
        <div>
          <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wide text-white/70">
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
            className={fieldClass}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wide text-white/70">
              Password
            </label>
            <span className="text-[11px] font-medium text-white/50">Ask admin to reset</span>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={fieldClass}
            placeholder="••••••••"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/65">
          <input type="checkbox" className="h-4 w-4 rounded border-white/30 bg-white/10 text-[#f15a24] focus:ring-[#f15a24]" />
          Remember this device
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#f15a24] py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(241,90,36,0.35)] transition hover:bg-[#d14a1c] disabled:opacity-60"
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
          <p className="text-sm text-white/65">Loading…</p>
        </AuthShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
