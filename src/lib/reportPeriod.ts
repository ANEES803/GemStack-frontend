/**
 * Shared report period helpers (URL ?from= & ?to=) for Reports hub and GL-style pages.
 */

/** Today's date in UTC YYYY-MM-DD (matches HTML date inputs). */
export function isoTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** First calendar day of the year containing `isoDate` (YYYY-MM-DD). */
export function calendarYearStart(isoDate: string): string {
  const y = Number.parseInt(isoDate.slice(0, 4), 10);
  if (!Number.isFinite(y)) return `${new Date().getUTCFullYear()}-01-01`;
  return `${y}-01-01`;
}

/** Default range when URL has no period: Jan 1 of current year → today. */
export function defaultReportPeriod(): { from: string; to: string } {
  const to = isoTodayUtc();
  return { from: calendarYearStart(to), to };
}

/** Read ?from= & ?to= from search params with sane fallbacks. */
export function periodFromSearchParams(searchParams: URLSearchParams | null): { from: string; to: string } {
  const fallback = defaultReportPeriod();
  if (!searchParams) return fallback;
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();
  if (from && to && from <= to) return { from, to };
  if (from && !to) return { from, to: from };
  if (!from && to) return { from: calendarYearStart(to), to };
  return fallback;
}
