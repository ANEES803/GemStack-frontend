import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-[var(--gs-page-bg)] to-slate-100/80 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, rgba(241,90,36,0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(15,23,42,0.06), transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-[420px] sm:max-w-[520px]">
        <Link
          href="/dashboard"
          className="mb-8 flex items-center justify-center gap-2 rounded-xl outline-none ring-offset-2 transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)]"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gs-card)] text-[var(--gs-accent)] shadow-sm ring-1 ring-orange-100/80">
            <svg className="relative h-4 w-4 drop-shadow-[0_4px_12px_rgba(241,90,36,0.2)]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
            </svg>
          </span>
          <span className="bg-gradient-to-r from-[var(--gs-navy)] via-slate-900 to-[var(--gs-accent)] bg-clip-text text-xl font-black tracking-tight text-transparent">
            GemStack
          </span>
          <span className="rounded-full bg-orange-100/80 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-orange-800 ring-1 ring-orange-200/70">
            Beta
          </span>
        </Link>

        <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)]/95 p-6 shadow-[0_8px_40px_rgba(15,23,42,0.08)] sm:p-8 md:p-10">
          <h1 className="text-center text-2xl font-bold tracking-tight text-[var(--gs-text)] md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-center text-sm leading-relaxed text-[var(--gs-muted)] md:text-base">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 border-t border-[var(--gs-border)] pt-5 text-center text-sm text-[var(--gs-muted)]">{footer}</div> : null}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--gs-muted)]">
          Demo only — connect your auth API (email + password, OTP per SRS).
        </p>
      </div>
    </div>
  );
}