"use client";

/**
 * Centered spinner + label for list pages and panels while data is fetching.
 */
export function LoadingBlock({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-14 ${className}`}
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--gs-border)] border-t-[var(--gs-accent)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--gs-muted)]">{label}</p>
    </div>
  );
}
