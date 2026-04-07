"use client";

import { X } from "lucide-react";

import type { GlSettings, SortDir, SortKey } from "./types";
import { COLUMN_LABELS } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: GlSettings;
  onChange: (s: GlSettings) => void;
  /** Persist current filter panel values as the user’s default (e.g. localStorage). */
  onSaveDefaultFilters?: () => void;
  /** Apply stored default filters to the panel. */
  onApplyDefaultFilters?: () => void;
};

const SORT_KEYS = Object.keys(COLUMN_LABELS) as SortKey[];

export function SettingsModal({ open, onClose, settings, onChange, onSaveDefaultFilters, onApplyDefaultFilters }: Props) {
  if (!open) return null;

  function patch<K extends keyof GlSettings>(k: K, v: GlSettings[K]) {
    onChange({ ...settings, [k]: v });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="gl-settings-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="gl-settings-title" className="text-lg font-bold text-[var(--gs-navy)]">
            Ledger display settings
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[min(70dvh,520px)] space-y-5 overflow-y-auto px-5 py-5">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">Show running balance</span>
            <input
              type="checkbox"
              checked={settings.showRunningBalance}
              onChange={(e) => patch("showRunningBalance", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">Show zero-balance lines</span>
            <input
              type="checkbox"
              checked={settings.showZeroBalances}
              onChange={(e) => patch("showZeroBalances", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">Compact view</span>
            <input
              type="checkbox"
              checked={settings.compactView}
              onChange={(e) => patch("compactView", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Default sort column</label>
            <select
              value={settings.defaultSortKey}
              onChange={(e) => patch("defaultSortKey", e.target.value as SortKey)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {COLUMN_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Default sort direction</label>
            <select
              value={settings.defaultSortDir}
              onChange={(e) => patch("defaultSortDir", e.target.value as SortDir)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          {(onSaveDefaultFilters || onApplyDefaultFilters) && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Default filters</p>
              <p className="mt-1 text-xs text-slate-500">Saved in this browser (demo).</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {onApplyDefaultFilters ? (
                  <button
                    type="button"
                    onClick={onApplyDefaultFilters}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                  >
                    Apply saved defaults
                  </button>
                ) : null}
                {onSaveDefaultFilters ? (
                  <button
                    type="button"
                    onClick={onSaveDefaultFilters}
                    className="rounded-full bg-[var(--gs-accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--gs-accent)] ring-1 ring-[var(--gs-accent)]/25 hover:bg-orange-100/80"
                  >
                    Save current as default
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[var(--gs-navy)] py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
