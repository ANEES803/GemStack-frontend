"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_DATE_FORMAT,
  loadStoredDateFormat,
  saveDateFormat,
  type DateFormatId,
  formatIsoDateString,
  formatYearMonthKey,
} from "@/lib/dateFormat";

type Ctx = {
  formatId: DateFormatId;
  setFormatId: (id: DateFormatId) => void;
  formatIso: (iso: string) => string;
  formatYm: (ym: string) => string;
};

const DateFormatContext = createContext<Ctx | null>(null);

export function DateFormatProvider({ children }: { children: ReactNode }) {
  const [formatId, setFormatIdState] = useState<DateFormatId>(DEFAULT_DATE_FORMAT);

  useEffect(() => {
    setFormatIdState(loadStoredDateFormat());
  }, []);

  const setFormatId = useCallback((id: DateFormatId) => {
    setFormatIdState(id);
    saveDateFormat(id);
  }, []);

  const formatIso = useCallback((iso: string) => formatIsoDateString(iso, formatId), [formatId]);

  const formatYm = useCallback((ym: string) => formatYearMonthKey(ym, formatId), [formatId]);

  const value = useMemo(
    () => ({ formatId, setFormatId, formatIso, formatYm }),
    [formatId, setFormatId, formatIso, formatYm],
  );

  return <DateFormatContext.Provider value={value}>{children}</DateFormatContext.Provider>;
}

export function useDateFormat() {
  const ctx = useContext(DateFormatContext);
  if (!ctx) {
    throw new Error("useDateFormat must be used within DateFormatProvider");
  }
  return ctx;
}

/** Safe when provider is missing — falls back to default format */
export function useDateFormatOptional() {
  const ctx = useContext(DateFormatContext);
  const formatId = ctx?.formatId ?? DEFAULT_DATE_FORMAT;
  const formatIso = useCallback((iso: string) => formatIsoDateString(iso, formatId), [formatId]);
  const formatYm = useCallback((ym: string) => formatYearMonthKey(ym, formatId), [formatId]);
  return { formatId, formatIso, formatYm, setFormatId: ctx?.setFormatId };
}
