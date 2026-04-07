"use client";

import { X } from "lucide-react";

import type { RoundingMode, SortDirTB, SortKeyTB, TbSettings } from "./types";
import { DEFAULT_TB_SETTINGS, TB_COLUMN_LABELS } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: TbSettings;
  onChange: (s: TbSettings) => void;
};

const SORT_KEYS: SortKeyTB[] = ["code", "name", "type", "debit", "credit", "priorDebit", "priorCredit"];

const ROUNDING_OPTIONS: { value: RoundingMode; label: string }[] = [
  { value: "none", label: "No extra rounding (display 2 dp)" },
  { value: "whole", label: "Whole units" },
  { value: "thousands", label: "Nearest thousand" },
];

export function SettingsModal({ open, onClose, settings, onChange }: Props) {
  if (!open) return null;

  function patch<K extends keyof TbSettings>(k: K, v: TbSettings[K]) {
    onChange({ ...settings, [k]: v });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="tb-settings-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="tb-settings-title" className="text-lg font-bold text-[var(--gs-navy)]">
            Trial balance display
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[min(70dvh,560px)] space-y-4 overflow-y-auto px-5 py-5">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">Show account codes</span>
            <input
              type="checkbox"
              checked={settings.showAccountCodes}
              onChange={(e) => patch("showAccountCodes", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <span className="text-sm font-medium text-slate-800">Show account type</span>
            <input
              type="checkbox"
              checked={settings.showAccountType}
              onChange={(e) => patch("showAccountType", e.target.checked)}
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
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Default sorting</label>
            <select
              value={settings.defaultSortKey}
              onChange={(e) => patch("defaultSortKey", e.target.value as SortKeyTB)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {TB_COLUMN_LABELS[k]}
                </option>
              ))}
            </select>
            <select
              value={settings.defaultSortDir}
              onChange={(e) => patch("defaultSortDir", e.target.value as SortDirTB)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Rounding</label>
            <select
              value={settings.rounding}
              onChange={(e) => patch("rounding", e.target.value as RoundingMode)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            >
              {ROUNDING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_TB_SETTINGS })}
            className="w-full rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset display to defaults
          </button>
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
