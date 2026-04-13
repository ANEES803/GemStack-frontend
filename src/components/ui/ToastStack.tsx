"use client";

export type ToastItem = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type ToastStackProps = {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
  /** Distance from bottom (e.g. above a fixed action bar). */
  bottomOffsetClass?: string;
};

/**
 * Fixed stack of notifications. Caller should schedule removal (e.g. setTimeout)
 * after pushing a toast.
 */
export function ToastStack({ toasts, onRemove, bottomOffsetClass = "bottom-6" }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`pointer-events-none fixed right-4 z-[260] flex max-w-sm flex-col gap-2 sm:right-6 ${bottomOffsetClass}`}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
            t.variant === "success"
              ? "border-emerald-300/80 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100"
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
