type SolvraMarkProps = {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  /** `onDark` = white wordmark for dark backgrounds. */
  tone?: "onLight" | "onDark";
  className?: string;
};

const SIZE = {
  sm: { box: "h-9 w-9", icon: "h-4 w-4", text: "text-lg", gap: "gap-2.5" },
  md: { box: "h-11 w-11", icon: "h-5 w-5", text: "text-xl", gap: "gap-3" },
  lg: { box: "h-14 w-14", icon: "h-7 w-7", text: "text-3xl", gap: "gap-3.5" },
  xl: { box: "h-16 w-16", icon: "h-8 w-8", text: "text-4xl", gap: "gap-4" },
} as const;

/** Compact brand mark + wordmark for Solvra. */
export function SolvraMark({
  size = "md",
  showWordmark = true,
  tone = "onLight",
  className = "",
}: SolvraMarkProps) {
  const s = SIZE[size];
  const wordColor = tone === "onDark" ? "text-white" : "text-[#0b1f2a]";

  return (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <span
        className={`relative flex ${s.box} items-center justify-center rounded-2xl bg-[#0b1f2a] text-[#f4f7f8] shadow-[0_10px_28px_rgba(11,31,42,0.28)] ring-1 ring-white/10`}
        aria-hidden
      >
        <svg className={s.icon} viewBox="0 0 24 24" fill="none">
          <path d="M4 7.5h10.5a3.5 3.5 0 0 1 0 7H9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 16.5H9.5a3.5 3.5 0 0 1 0-7H15" stroke="#f15a24" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="7.2" cy="7.5" r="1.35" fill="#f15a24" />
          <circle cx="16.8" cy="16.5" r="1.35" fill="currentColor" />
        </svg>
      </span>
      {showWordmark ? (
        <span
          className={`${s.text} ${wordColor} font-bold tracking-[-0.04em]`}
          style={{ fontFamily: "var(--font-solvra-display), var(--font-solvra-sans), sans-serif" }}
        >
          Solvra
        </span>
      ) : null}
    </span>
  );
}
