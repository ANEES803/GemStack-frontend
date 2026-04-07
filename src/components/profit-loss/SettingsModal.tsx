"use client";

import { X } from "lucide-react";

import type { PlRounding, PlSettings } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: PlSettings;
  onChange: (s: PlSettings) => void;
};

export function SettingsModal({ open, onClose, settings, onChange }: Props) {
  if (!open) return null;

  function patch<K extends keyof PlSettings>(k: K, v: PlSettings[K]) {
    onChange({ ...settings, [k]: v });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="pl-settings-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="pl-settings-title" className="text-lg font-bold text-[var(--gs-navy)]">
            P&amp;L display settings
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">Show comparison column</span>
            <input
              type="checkbox"
              checked={settings.showComparison}
              onChange={(e) => patch("showComparison", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">Show percentages</span>
            <input
              type="checkbox"
              checked={settings.showPercentages}
              onChange={(e) => patch("showPercentages", e.target.checked)}
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
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Rounding</label>
            <select
              value={String(settings.roundingDecimals)}
              onChange={(e) => patch("roundingDecimals", Number(e.target.value) as PlRounding)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            >
              <option value="2">2 decimals</option>
              <option value="0">0 decimals (whole units)</option>
            </select>
          </div>
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
