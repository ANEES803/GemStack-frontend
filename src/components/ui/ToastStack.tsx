"use client";

export type ToastItem = {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
};

type ToastStackProps = {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
  /**
   * Tailwind classes for the fixed container (inset from viewport).
   * Default: top-right, below typical browser chrome; newest toast appears nearest the top.
   */
  positionClass?: string;
};

/**
 * Fixed stack of notifications. Caller should schedule removal (e.g. setTimeout)
 * after pushing a toast.
 */
export function ToastStack({
  toasts,
  onRemove,
  positionClass = "right-4 top-4 sm:right-6 sm:top-6",
}: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`pointer-events-none fixed z-[260] flex max-w-sm flex-col-reverse gap-2 ${positionClass}`}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
            t.variant === "success"
              ? "border-emerald-300/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100"
              : t.variant === "info"
                ? "border-sky-300/80 bg-sky-50/95 text-sky-950 dark:border-sky-800 dark:bg-sky-950/90 dark:text-sky-100"
                : "border-red-300/80 bg-red-50/95 text-red-900 dark:border-red-900 dark:bg-red-950/90 dark:text-red-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => onRemove(t.id)}
              className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
