"use client";

import { useDateFormatOptional } from "@/contexts/DateFormatContext";

type Props = {
  iso: string;
  className?: string;
  empty?: string;
};

/** Renders a stored ISO date (`YYYY-MM-DD` or ISO prefix) using Settings → date format */
export function DateDisplay({ iso, className, empty = "—" }: Props) {
  const { formatIso } = useDateFormatOptional();
  if (!iso || !iso.trim()) return <span className={className}>{empty}</span>;
  return <span className={className}>{formatIso(iso)}</span>;
}
