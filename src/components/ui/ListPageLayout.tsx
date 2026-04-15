import { ArrowUpDown, Filter } from "lucide-react";
import type { ReactNode } from "react";

type ListPageLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function ListPageLayout({ title, subtitle, actions, toolbar, children }: ListPageLayoutProps) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-10 space-y-7 sm:space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--gs-text)] sm:text-4xl sm:tracking-tight md:text-[2.75rem]">{title}</h1>
          {subtitle ? (
            <p className="max-w-3xl text-base leading-relaxed text-[var(--gs-muted)] sm:text-[17px] md:text-lg sm:leading-relaxed">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:pt-1">
            {actions}
          </div>
        ) : null}
      </div>

      <div className="overflow-visible rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_40px_rgba(15,23,42,0.06)]">
        {toolbar ? <div className="rounded-t-2xl border-b border-[var(--gs-border)] bg-[var(--gs-card)]">{toolbar}</div> : null}
        <div className="rounded-b-2xl bg-[var(--gs-card)]">{children}</div>
      </div>
    </div>
  );
}

type ListToolbarProps = {
  placeholder?: string;
};

export function ListToolbar({ placeholder = "Search…" }: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 md:p-6">
      <div className="relative min-w-0 max-w-xl flex-1">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gs-muted)]"
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
          placeholder={placeholder}
          className="w-full rounded-full border border-[var(--gs-input-border)] bg-[var(--gs-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--gs-text)] shadow-sm outline-none transition placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/15"
          aria-label="Search"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm transition hover:border-[var(--gs-border-strong)] hover:bg-[var(--gs-hover)]"
          aria-label="Sort by"
          title="Sort by"
        >
          <ArrowUpDown className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gs-navy)] text-white shadow-sm transition hover:bg-slate-800"
          aria-label="Filter"
          title="Filter"
        >
          <Filter className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
