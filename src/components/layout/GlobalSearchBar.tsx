"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { filterGlobalSearch, type GlobalSearchEntry } from "@/lib/globalSearchIndex";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function GlobalSearchBar() {
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => filterGlobalSearch(query), [query]);

  const showPanel = open && query.trim().length > 0 && suggestions.length > 0;

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query, suggestions.length]);

  const clearAfterNavigate = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) {
      if (ev.key === "ArrowDown" && query.trim()) {
        setOpen(true);
      }
      return;
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      setOpen(false);
      return;
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (ev.key === "Enter" && suggestions[active]) {
      ev.preventDefault();
      router.push(suggestions[active].href);
      clearAfterNavigate();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="sr-only" htmlFor="global-search">
        Search
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gs-muted)]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </span>
        <input
          id="global-search"
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search accounts, invoices, items…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="min-h-10 w-full rounded-full border border-[var(--gs-input-border)] bg-[var(--gs-input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--gs-text)] shadow-sm outline-none ring-0 placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/25"
        />
      </div>

      {showPanel ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-xl ring-1 ring-[var(--gs-border)]"
        >
          {suggestions.map((e, i) => (
            <li key={e.id} role="presentation">
              <Link
                href={e.href}
                role="option"
                aria-selected={i === active}
                id={`${listId}-opt-${i}`}
                className={cx(
                  "flex items-start gap-2 px-3 py-2 text-left text-xs transition",
                  i === active
                    ? "bg-[var(--gs-accent-soft)] text-[var(--gs-text)]"
                    : "text-[var(--gs-text)] hover:bg-[var(--gs-hover)]",
                )}
                onMouseEnter={() => setActive(i)}
                onClick={clearAfterNavigate}
              >
                <span
                  className={cx(
                    "mt-0.5 shrink-0 rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                      e.category === "Go to" && "bg-[var(--gs-hover)] text-[var(--gs-muted)]",
                      e.category === "Settings" && "bg-orange-50 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200",
                      e.category === "Account" && "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
                      e.category === "Invoice" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
                      e.category === "Item" && "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
                  )}
                >
                  {e.category}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{e.title}</span>
                  {e.subtitle ? <span className="mt-0.5 block text-[11px] text-[var(--gs-muted)]">{e.subtitle}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : query.trim().length > 0 && open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2.5 text-xs text-[var(--gs-muted)] shadow-lg">
          No matches — try another word or check spelling.
        </div>
      ) : null}
    </div>
  );
}
