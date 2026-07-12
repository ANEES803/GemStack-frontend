/** Stored preference id — maps to DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD */
export type DateFormatId = "dmY" | "mdY" | "Ymd";

export const DATE_FORMAT_OPTIONS: { id: DateFormatId; label: string; example: string }[] = [
  { id: "dmY", label: "DD/MM/YYYY", example: "31/12/2026" },
  { id: "mdY", label: "MM/DD/YYYY", example: "12/31/2026" },
  { id: "Ymd", label: "YYYY-MM-DD", example: "2026-12-31" },
];

export const DATE_FORMAT_STORAGE_KEY = "gemstack-date-format-v1";

export const DEFAULT_DATE_FORMAT: DateFormatId = "Ymd";

export function isDateFormatId(v: string | null | undefined): v is DateFormatId {
  return v === "dmY" || v === "mdY" || v === "Ymd";
}

export function loadStoredDateFormat(): DateFormatId {
  if (typeof window === "undefined") return DEFAULT_DATE_FORMAT;
  try {
    const raw = localStorage.getItem(DATE_FORMAT_STORAGE_KEY);
    return isDateFormatId(raw) ? raw : DEFAULT_DATE_FORMAT;
  } catch {
    return DEFAULT_DATE_FORMAT;
  }
}

export function saveDateFormat(id: DateFormatId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DATE_FORMAT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Normalize `YYYY-MM-DD` or ISO datetime prefix to display per setting */
export function formatIsoDateString(iso: string, format: DateFormatId): string {
  const s = iso.trim();
  const datePart = s.length >= 10 ? s.slice(0, 10) : s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) return iso;
  const [, y, mo, d] = m;
  if (format === "Ymd") return `${y}-${mo}-${d}`;
  if (format === "dmY") return `${d}/${mo}/${y}`;
  return `${mo}/${d}/${y}`;
}

/** `YYYY-MM` month keys (reports) → display */
export function formatYearMonthKey(ym: string, format: DateFormatId): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const [, y, mo] = m;
  if (format === "Ymd") return `${y}-${mo}`;
  if (format === "dmY") return `${mo}/${y}`;
  return `${mo}/${y}`;
}
