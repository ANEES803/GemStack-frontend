"use client";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Small spinning indicator for buttons and inline status. */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cx("h-4 w-4 animate-spin text-current", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

/** Covers a panel/modal while an async action runs. */
export function BusyOverlay({ label = "Working…" }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-[var(--gs-card)]/85 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm">
        <InlineSpinner />
        <span>{label}</span>
      </div>
    </div>
  );
}

/** Subtle table overlay for background refresh (keeps rows visible). */
export function TableRefreshOverlay({ label = "Updating…" }: { label?: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-[var(--gs-card)]/45 pt-8 backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm">
        <InlineSpinner className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
    </div>
  );
}

type AsyncActionButtonProps = {
  busy?: boolean;
  busyLabel: string;
  idleLabel: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

/** Primary action button with built-in saving state. */
export function AsyncActionButton({
  busy = false,
  busyLabel,
  idleLabel,
  disabled = false,
  onClick,
  type = "button",
  className,
}: AsyncActionButtonProps) {
  return (
    <button
      type={type}
      disabled={busy || disabled}
      onClick={onClick}
      className={cx(
        "inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {busy ? (
        <>
          <InlineSpinner className="text-white" />
          {busyLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}
