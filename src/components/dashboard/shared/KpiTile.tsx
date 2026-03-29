import type { ReactNode } from "react";

export type KpiTone = "blue" | "orange" | "violet" | "teal" | "emerald" | "amber";

const tones: Record<KpiTone, string> = {
  blue: "from-sky-50 to-sky-50/40 text-sky-900 ring-sky-100/90",
  orange: "from-orange-50 to-orange-50/40 text-orange-950 ring-orange-100/90",
  violet: "from-violet-50 to-violet-50/40 text-violet-950 ring-violet-100/90",
  teal: "from-teal-50 to-teal-50/40 text-teal-950 ring-teal-100/90",
  emerald: "from-emerald-50 to-emerald-50/40 text-emerald-950 ring-emerald-100/90",
  amber: "from-amber-50 to-amber-50/40 text-amber-950 ring-amber-100/90",
};

const iconBg: Record<KpiTone, string> = {
  blue: "bg-white/80 text-sky-600 shadow-sm shadow-sky-100/50 ring-1 ring-sky-100/80",
  orange: "bg-white/80 text-orange-600 shadow-sm shadow-orange-100/50 ring-1 ring-orange-100/80",
  violet: "bg-white/80 text-violet-600 shadow-sm shadow-violet-100/50 ring-1 ring-violet-100/80",
  teal: "bg-white/80 text-teal-600 shadow-sm shadow-teal-100/50 ring-1 ring-teal-100/80",
  emerald: "bg-white/80 text-emerald-600 shadow-sm shadow-emerald-100/50 ring-1 ring-emerald-100/80",
  amber: "bg-white/80 text-amber-700 shadow-sm shadow-amber-100/50 ring-1 ring-amber-100/80",
};

export function KpiTile({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: KpiTone;
  icon: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-inset ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500/90">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {sub ? <p className="mt-1 text-xs font-medium text-slate-600/90">{sub}</p> : null}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
