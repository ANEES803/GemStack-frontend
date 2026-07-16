"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { useState } from "react";

import { SolvraMark } from "@/components/brand/SolvraMark";
import { login } from "@/lib/authClient";
import { resolvePostLoginPath } from "@/lib/permissions";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-solvra-sans",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-solvra-display",
  display: "swap",
});

const CAPABILITIES = [
  { title: "Operations", line: "Run daily work from one clear workspace." },
  { title: "Finance", line: "Track money, reports, and approvals with control." },
  { title: "Teams", line: "Give every role the right access, nothing extra." },
] as const;

function PageAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#0b1f2a_0%,#123041_38%,#1a3d4d_68%,#214454_100%)]" />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 45% at 12% 18%, rgba(241,90,36,0.28), transparent 58%), radial-gradient(ellipse 50% 40% at 88% 12%, rgba(125,211,216,0.16), transparent 55%), radial-gradient(ellipse 70% 55% at 70% 100%, rgba(15,90,95,0.35), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute -left-20 top-10 h-80 w-80 animate-[solvra-float_14s_ease-in-out_infinite] rounded-full bg-[rgba(241,90,36,0.18)] blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 animate-[solvra-float_18s_ease-in-out_infinite_reverse] rounded-full bg-[rgba(125,211,216,0.14)] blur-3xl" />
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
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
    <div
      className={`${jakarta.variable} ${grotesk.variable} relative min-h-screen overflow-hidden text-white`}
      style={{ fontFamily: "var(--font-solvra-sans), ui-sans-serif, sans-serif" }}
    >
      <PageAtmosphere />

      {/* Full-bleed shell: logo hugs top-left, login hugs right */}
      <div className="relative z-10 flex min-h-screen w-full flex-col px-5 py-5 sm:px-8 md:px-10 lg:px-14 xl:px-20 2xl:px-28">
        <header className="flex w-full items-center justify-between animate-[solvra-rise_0.55s_ease-out_both]">
          <Link href="/" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#f15a24]/60">
            <SolvraMark size="xl" tone="onDark" />
          </Link>
          <p className="hidden text-xs font-semibold tracking-[0.18em] text-white/50 uppercase md:block">Business ERP</p>
        </header>

        <main className="grid flex-1 items-center gap-14 py-10 md:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:gap-24 xl:gap-32 lg:py-8">
          {/* Left: copy stays on the left edge of the content area */}
          <section className="w-full max-w-xl justify-self-start text-left animate-[solvra-rise_0.65s_ease-out_0.05s_both] xl:max-w-2xl">
            <h1
              className="text-[clamp(3rem,5.5vw,4.75rem)] font-bold leading-[0.95] tracking-[-0.05em] text-white"
              style={{ fontFamily: "var(--font-solvra-display), var(--font-solvra-sans), sans-serif" }}
            >
              Business solutions that keep your company moving.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              One modern ERP for operations, finance, and team access. Sign in on the right and start working.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-1">
              {CAPABILITIES.map((item) => (
                <li
                  key={item.title}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f15a24]" aria-hidden />
                  <div>
                    <p className="text-sm font-bold tracking-tight text-white">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-snug text-white/65">{item.line}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Right: login sits on the far right with clear separation */}
          <section className="w-full max-w-[420px] justify-self-start animate-[solvra-panel_0.7s_ease-out_0.1s_both] lg:justify-self-end">
            <div className="rounded-[1.75rem] border border-white/20 bg-white/12 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
              <div className="mb-6">
                <h2
                  className="text-2xl font-bold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-solvra-display), var(--font-solvra-sans), sans-serif" }}
                >
                  Sign in
                </h2>
                <p className="mt-1 text-sm text-white/65">Enter your work email and password.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {error ? (
                  <p className="rounded-xl border border-red-300/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100">
                    {error}
                  </p>
                ) : null}

                <div>
                  <label htmlFor="landing-email" className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                    Email
                  </label>
                  <input
                    id="landing-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-[#f15a24] focus:bg-white/15 focus:ring-2 focus:ring-[#f15a24]/30"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="landing-password" className="block text-xs font-bold tracking-wide text-white/70 uppercase">
                    Password
                  </label>
                  <input
                    id="landing-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-[#f15a24] focus:bg-white/15 focus:ring-2 focus:ring-[#f15a24]/30"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-1 w-full rounded-xl bg-[#f15a24] py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(241,90,36,0.35)] transition hover:bg-[#d14a1c] disabled:opacity-60"
                >
                  {busy ? "Signing in..." : "Sign in to Solvra"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-white/60">
                Need an account?{" "}
                <Link href="/signup" className="font-bold text-white hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          </section>
        </main>

        <footer className="flex w-full items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/45 animate-[solvra-rise_0.8s_ease-out_0.15s_both]">
          <p>© {new Date().getFullYear()} Solvra</p>
          <p className="font-medium tracking-wide">Built for growing businesses</p>
        </footer>
      </div>
    </div>
  );
}
