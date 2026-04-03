"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

type AppDialogProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  size?: "md" | "lg";
};

export function AppDialog({ open, onClose, titleId, title, description, children, footer, size = "lg" }: AppDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const maxW = size === "md" ? "sm:max-w-md" : "sm:max-w-lg";

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 flex w-full ${maxW} max-h-[min(92dvh,52rem)] flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/5 sm:max-h-[min(86dvh,48rem)] sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-slate-100 px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <h2 id={titleId} className="text-lg font-bold text-[var(--gs-navy)]">
                  {title}
                </h2>
                {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>

          <div
            className="shrink-0 border-t border-slate-100 bg-white px-4 pt-3 sm:px-6 sm:pt-4"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
          >
            {footer}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
