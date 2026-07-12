"use client";

import type { ReactNode } from "react";

import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  /** Larger modals for wide tables (e.g. account activity). */
  size?: "md" | "lg";
  /** Stack above another modal (e.g. journal on top of account activity). */
  zIndexClass?: string;
};

/**
 * Centered overlay dialog for report drill-downs (consistent with TB / P&amp;L / BS).
 */
export function ReportModalShell({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = "md",
  zIndexClass = "z-[190]",
}: Props) {
  if (!open) return null;

  const maxW = size === "lg" ? "max-w-3xl" : "max-w-lg";

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/45 p-4`}>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close modal" onClick={onClose} />
      <div
        className={`relative flex max-h-[min(90vh,720px)] w-full ${maxW} flex-col overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--gs-border)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="report-modal-title" className="text-lg font-bold tracking-tight text-[var(--gs-text)]">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-[var(--gs-muted)]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="shrink-0 border-t border-[var(--gs-border)] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
