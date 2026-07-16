"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-[#f15a24] focus:bg-white/15 focus:ring-2 focus:ring-[#f15a24]/30";

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
      subtitle="Start with your company details. Invite teammates after setup."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-white hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="block text-xs font-bold uppercase tracking-wide text-white/70">
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
            className={fieldClass}
            placeholder="Sara Malik"
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-wide text-white/70">
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
            className={fieldClass}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-xs font-bold uppercase tracking-wide text-white/70">
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
            className={fieldClass}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="block text-xs font-bold uppercase tracking-wide text-white/70">
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
            className={fieldClass}
            placeholder="Repeat password"
          />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-white/65">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-white/10 text-[#f15a24] focus:ring-[#f15a24]"
          />
          <span>
            I agree to the{" "}
            <button type="button" className="font-semibold text-white hover:underline">
              Terms
            </button>{" "}
            and{" "}
            <button type="button" className="font-semibold text-white hover:underline">
              Privacy policy
            </button>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#f15a24] py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(241,90,36,0.35)] transition hover:bg-[#d14a1c] disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
