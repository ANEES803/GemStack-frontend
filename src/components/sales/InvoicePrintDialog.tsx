"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_INVOICE_PRINT_SETTINGS,
  downloadInvoicePdf,
  openInvoicePrintPreview,
  type InvoicePdfData,
  type InvoicePrintSettings,
} from "@/lib/invoicePdf";

type Props = {
  open: boolean;
  onClose: () => void;
  data: InvoicePdfData;
};

export function InvoicePrintDialog({ open, onClose, data }: Props) {
  const [settings, setSettings] = useState<InvoicePrintSettings>(DEFAULT_INVOICE_PRINT_SETTINGS);

  useEffect(() => {
    if (open) setSettings(DEFAULT_INVOICE_PRINT_SETTINGS);
  }, [open]);

  if (!open) return null;

  function patch<K extends keyof InvoicePrintSettings>(key: K, value: InvoicePrintSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog overlay" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="invoice-print-title"
        className="relative z-10 flex max-h-[min(92dvh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-[var(--gs-border)] px-5 py-4 sm:px-6">
          <h2 id="invoice-print-title" className="text-lg font-bold text-[var(--gs-text)]">
            Print invoice
          </h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">
            Choose layout options, then download a PDF or open the system print dialog (copies, color, duplex, printer, paper tray).
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <fieldset className="space-y-4">
            <legend className="sr-only">Page and layout</legend>
            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Paper size</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["a4", "A4"],
                    ["letter", "US Letter"],
                    ["legal", "US Legal"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patch("paperSize", v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      settings.paperSize === v ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Orientation</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["portrait", "Portrait"],
                    ["landscape", "Landscape"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patch("orientation", v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      settings.orientation === v ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Margins (PDF &amp; print preview)</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(
                  [
                    ["narrow", "Narrow"],
                    ["normal", "Normal"],
                    ["wide", "Wide"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => patch("marginPreset", v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      settings.marginPreset === v ? "bg-[var(--gs-accent)] text-white" : "border border-[var(--gs-border)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="mt-6 space-y-3 border-t border-[var(--gs-border)] pt-6">
            <legend className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Content on PDF / print</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-3">
              <input
                type="checkbox"
                checked={settings.includeCompanyHeader}
                onChange={(e) => patch("includeCompanyHeader", e.target.checked)}
                className="mt-0.5 rounded border-[var(--gs-border-strong)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--gs-text)]">Company header</span>
                <span className="text-xs text-[var(--gs-muted)]">GemStack Trading Co. and tag line</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-3">
              <input
                type="checkbox"
                checked={settings.includeParcelAndLinks}
                onChange={(e) => patch("includeParcelAndLinks", e.target.checked)}
                className="mt-0.5 rounded border-[var(--gs-border-strong)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--gs-text)]">Parcel &amp; FB invoice link</span>
                <span className="text-xs text-[var(--gs-muted)]">Parcel number and external link row</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-3">
              <input
                type="checkbox"
                checked={settings.includeCustomerNotes}
                onChange={(e) => patch("includeCustomerNotes", e.target.checked)}
                className="mt-0.5 rounded border-[var(--gs-border-strong)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--gs-text)]">Customer notes</span>
                <span className="text-xs text-[var(--gs-muted)]">Detail / notes field from the form</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-3">
              <input
                type="checkbox"
                checked={settings.includePaymentFooter}
                onChange={(e) => patch("includePaymentFooter", e.target.checked)}
                className="mt-0.5 rounded border-[var(--gs-border-strong)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--gs-text)]">Payment footer</span>
                <span className="text-xs text-[var(--gs-muted)]">Short thank-you / remittance line</span>
              </span>
            </label>
          </fieldset>

          <p className="mt-6 rounded-xl border border-sky-100 bg-sky-50/80 p-3 text-xs leading-relaxed text-sky-950">
            <strong className="font-semibold">System print options:</strong> &ldquo;Open print dialog&rdquo; uses your browser&apos;s print window;
            there you can set copies, page range, color / grayscale, duplex, paper source, and choose any installed printer. Those options are
            controlled by your OS and printer driver, not GemStack.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--gs-border)] p-4 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="order-last rounded-full border border-[var(--gs-border)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:order-first"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              openInvoicePrintPreview(data, settings);
              onClose();
            }}
            className="rounded-full border-2 border-[var(--gs-border-strong)] bg-[var(--gs-card)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] shadow-sm hover:bg-[var(--gs-hover)]"
          >
            Open print dialog...
          </button>
          <button
            type="button"
            onClick={() => {
              downloadInvoicePdf(data, settings);
              onClose();
            }}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--gs-accent-hover)]"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}