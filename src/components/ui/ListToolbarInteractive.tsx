"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export type SortOption = { id: string; label: string };

type PanelPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Fixed position under (or above) anchor; stays inside viewport with scrollable max height. */
function computePanelPosition(anchor: DOMRect, panelWidth: number, maxHeightCap: number, align: "start" | "end"): PanelPos {
  const margin = 10;
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  const w = clamp(panelWidth, 200, vw - margin * 2);
  let left = align === "end" ? anchor.right - w : anchor.left;
  left = clamp(left, margin, vw - w - margin);

  const spaceBelow = vh - anchor.bottom - margin * 2;
  const spaceAbove = anchor.top - margin * 2;
  const openBelow = spaceBelow >= 140 || spaceBelow >= spaceAbove;

  let maxH: number;
  let top: number;
  if (openBelow) {
    top = anchor.bottom + margin;
    maxH = Math.min(maxHeightCap, Math.max(100, spaceBelow));
  } else {
    maxH = Math.min(maxHeightCap, Math.max(100, spaceAbove));
    top = anchor.top - margin - maxH;
  }

  if (top < margin) {
    top = margin;
    maxH = Math.min(maxH, vh - top - margin);
  }
  if (top + maxH > vh - margin) {
    maxH = Math.max(100, vh - margin - top);
  }
  maxH = clamp(maxH, 100, maxHeightCap);

  return { top, left, width: w, maxHeight: maxH };
}

type ListToolbarInteractiveProps = {
  placeholder: string;
  search: string;
  onSearchChange: (value: string) => void;
  sortOptions: SortOption[];
  sortValue: string;
  onSortChange: (id: string) => void;
  filterChildren: ReactNode;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
};

export function ListToolbarInteractive({
  placeholder,
  search,
  onSearchChange,
  sortOptions,
  sortValue,
  onSortChange,
  filterChildren,
  onResetFilters,
  hasActiveFilters,
}: ListToolbarInteractiveProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [sortPos, setSortPos] = useState<PanelPos | null>(null);
  const [filterPos, setFilterPos] = useState<PanelPos | null>(null);

  useEffect(() => setMounted(true), []);

  function updateSortPosition() {
    const el = sortRef.current;
    if (!el || !sortOpen) return;
    const r = el.getBoundingClientRect();
    setSortPos(computePanelPosition(r, Math.min(288, window.innerWidth - 20), Math.min(360, Math.floor(window.innerHeight * 0.55)), "start"));
  }

  function updateFilterPosition() {
    const el = filterRef.current;
    if (!el || !filterOpen) return;
    const r = el.getBoundingClientRect();
    const targetW = Math.min(400, window.innerWidth - 20);
    setFilterPos(computePanelPosition(r, targetW, Math.min(480, Math.floor(window.innerHeight * 0.65)), "end"));
  }

  useLayoutEffect(() => {
    if (!sortOpen) {
      setSortPos(null);
      return;
    }
    updateSortPosition();
    const onWin = () => updateSortPosition();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [sortOpen]);

  useLayoutEffect(() => {
    if (!filterOpen) {
      setFilterPos(null);
      return;
    }
    updateFilterPosition();
    const onWin = () => updateFilterPosition();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [filterOpen]);

  useEffect(() => {
    if (!sortOpen && !filterOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (sortRef.current?.contains(t) || filterRef.current?.contains(t)) return;
      const inSortPanel = (e.target as HTMLElement).closest?.("[data-gs-sort-panel]");
      const inFilterPanel = (e.target as HTMLElement).closest?.("[data-gs-filter-panel]");
      if (inSortPanel || inFilterPanel) return;
      setSortOpen(false);
      setFilterOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [sortOpen, filterOpen]);

  const sortStyle: CSSProperties | undefined =
    sortPos && sortOpen
      ? {
          position: "fixed",
          top: sortPos.top,
          left: sortPos.left,
          width: sortPos.width,
          maxHeight: sortPos.maxHeight,
          zIndex: 280,
        }
      : undefined;

  const filterStyle: CSSProperties | undefined =
    filterPos && filterOpen
      ? {
          position: "fixed",
          top: filterPos.top,
          left: filterPos.left,
          width: filterPos.width,
          maxHeight: filterPos.maxHeight,
          zIndex: 280,
        }
      : undefined;

  const sortPanel =
    mounted && sortOpen && sortStyle ? (
      <div
        data-gs-sort-panel
        style={sortStyle}
        className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
        role="listbox"
      >
        <div className="h-1 shrink-0 rounded-t-xl bg-[var(--gs-navy)]" aria-hidden />
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5 [scrollbar-gutter:stable]">
          {sortOptions.map((opt) => {
            const selected = opt.id === sortValue;
            return (
              <li key={opt.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onSortChange(opt.id);
                    setSortOpen(false);
                  }}
                  className={cx(
                    "w-full px-4 py-2.5 text-left text-sm leading-snug transition",
                    selected ? "font-semibold text-[var(--gs-navy)]" : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                  )}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  const filterPanel =
    mounted && filterOpen && filterStyle ? (
      <div
        data-gs-filter-panel
        style={filterStyle}
        className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-base font-bold text-slate-900">Filter</span>
          <button
            type="button"
            onClick={() => {
              onResetFilters();
            }}
            className="text-sm font-semibold text-[var(--gs-accent)] underline decoration-[var(--gs-accent)]/40 underline-offset-2 hover:decoration-[var(--gs-accent)]"
          >
            Reset
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">{filterChildren}</div>
      </div>
    ) : null;

  return (
    <>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4 sm:p-6 md:items-center">
        <div className="relative min-w-0 w-full max-w-md flex-1 md:max-w-xl">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-full border border-slate-200/90 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-[var(--gs-accent)]/15"
            aria-label="Search"
          />
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-stretch gap-2 sm:w-auto sm:items-center md:flex-nowrap">
          <div className="relative min-w-0 flex-1 sm:min-w-[auto] sm:flex-initial" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setFilterOpen(false);
                setSortOpen((o) => !o);
              }}
              className="inline-flex h-full min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
            >
              Sort by
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          <div className="relative min-w-0 flex-1 sm:min-w-[auto] sm:flex-initial" ref={filterRef}>
            <button
              type="button"
              onClick={() => {
                setSortOpen(false);
                setFilterOpen((o) => !o);
              }}
              className={cx(
                "inline-flex h-full min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition sm:w-auto",
                "bg-[var(--gs-navy)] hover:bg-slate-800",
                hasActiveFilters && "ring-2 ring-[var(--gs-accent)]/50 ring-offset-2",
              )}
              aria-expanded={filterOpen}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              Filter
            </button>
          </div>
        </div>
      </div>
      {sortPanel ? createPortal(sortPanel, document.body) : null}
      {filterPanel ? createPortal(filterPanel, document.body) : null}
    </>
  );
}

type FilterSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function FilterSection({ title, defaultOpen = true, children }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-slate-900">{title}</span>
        <svg
          className={cx("h-4 w-4 shrink-0 text-slate-400 transition", open && "-rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open ? <div className="space-y-2 px-4 pb-4 pt-0">{children}</div> : null}
    </div>
  );
}

type FilterCheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function FilterCheckboxRow({ label, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 hover:border-slate-100 hover:bg-slate-50/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]"
      />
      <span className="min-w-0 text-xs font-semibold leading-snug text-slate-700 sm:text-sm">{label}</span>
    </label>
  );
}

/** Compact 2-column grid for multi-option filters (e.g. payment methods, grades). */
export function FilterCheckboxGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">{children}</div>;
}

type FilterDateRangeProps = {
  title?: string;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
};

export function FilterDateRangeRow({ title = "Date range", from, to, onFromChange, onToChange }: FilterDateRangeProps) {
  return (
    <div className="space-y-3">
      {title ? <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          />
        </div>
      </div>
    </div>
  );
}
