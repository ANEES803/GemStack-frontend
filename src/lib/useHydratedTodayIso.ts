"use client";

import { useEffect, useState } from "react";

/**
 * Returns "" on server and first client paint, then today's YYYY-MM-DD (UTC) after mount.
 * Use for date input defaults to avoid SSR/client HTML mismatches.
 */
export function useHydratedTodayIso() {
  const [iso, setIso] = useState("");
  useEffect(() => {
    setIso(new Date().toISOString().slice(0, 10));
  }, []);
  return iso;
}
