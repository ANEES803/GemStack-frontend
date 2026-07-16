import Link from "next/link";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import { SolvraMark } from "@/components/brand/SolvraMark";

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

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div
      className={`${jakarta.variable} ${grotesk.variable} relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-white`}
      style={{ fontFamily: "var(--font-solvra-sans), ui-sans-serif, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#0b1f2a_0%,#123041_38%,#1a3d4d_68%,#214454_100%)]" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 55% 45% at 18% 20%, rgba(241,90,36,0.28), transparent 58%), radial-gradient(ellipse 50% 40% at 82% 15%, rgba(125,211,216,0.16), transparent 55%), radial-gradient(ellipse 70% 55% at 60% 100%, rgba(15,90,95,0.35), transparent 60%)",
          }}
        />
        <div className="absolute -left-20 top-10 h-80 w-80 animate-[solvra-float_14s_ease-in-out_infinite] rounded-full bg-[rgba(241,90,36,0.18)] blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 animate-[solvra-float_18s_ease-in-out_infinite_reverse] rounded-full bg-[rgba(125,211,216,0.14)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-[420px] sm:max-w-[480px]">
        <Link
          href="/"
          className="mb-8 flex justify-center rounded-xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#f15a24]"
        >
          <SolvraMark size="md" tone="onDark" />
        </Link>

        <div className="rounded-[1.75rem] border border-white/20 bg-white/12 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">
          <h1
            className="text-center text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-solvra-display), var(--font-solvra-sans), sans-serif" }}
          >
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-center text-sm leading-relaxed text-white/65">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-white/60">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
