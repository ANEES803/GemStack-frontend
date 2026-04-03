import Link from "next/link";
import type { ReactNode } from "react";

export type CreateModuleVariant = "lots" | "parcels" | "sales";

const variantStyles: Record<
  CreateModuleVariant,
  { bar: string; shadow: string; icon: string }
> = {
  lots: {
    bar: "from-amber-500 via-orange-500 to-[var(--gs-accent)]",
    shadow: "shadow-[0_4px_14px_rgba(245,158,11,0.35)]",
    icon: "text-white/90",
  },
  parcels: {
    bar: "from-violet-600 via-indigo-600 to-blue-600",
    shadow: "shadow-[0_4px_14px_rgba(124,58,237,0.35)]",
    icon: "text-white/90",
  },
  sales: {
    bar: "from-[var(--gs-accent)] via-orange-500 to-rose-500",
    shadow: "shadow-[0_4px_14px_rgba(241,90,36,0.4)]",
    icon: "text-white/90",
  },
};

type Props = {
  href: string;
  variant: CreateModuleVariant;
  children: ReactNode;
};

export function CreateModuleLink({ href, variant, children }: Props) {
  const v = variantStyles[variant];
  return (
    <Link
      href={href}
      className={`group relative inline-flex min-h-[44px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-bold text-white transition sm:w-auto ${v.shadow} hover:brightness-105 active:scale-[0.98]`}
    >
      <span
        className={`absolute inset-0 bg-gradient-to-r ${v.bar} transition group-hover:opacity-95`}
        aria-hidden
      />
      <span className="relative flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 ${v.icon}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.25} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
        <span className="tracking-tight">{children}</span>
      </span>
    </Link>
  );
}
