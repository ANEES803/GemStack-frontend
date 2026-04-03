"use client";

import { useEffect, useMemo, useState } from "react";

import { CreateModuleLink } from "@/components/ui/CreateModuleLink";
import { ListPageLayout } from "@/components/ui/ListPageLayout";
import {
  FilterCheckboxGrid,
  FilterCheckboxRow,
  FilterDateRangeRow,
  FilterSection,
  ListToolbarInteractive,
  type SortOption,
} from "@/components/ui/ListToolbarInteractive";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { loadAddedParcels, type DemoParcelRow } from "@/lib/demoParcels";

const SEED: DemoParcelRow[] = [
  { code: "P-228", lot: "LO-09", grade: "A", carats: 42.5, caratsDisplay: "42.5", fep: "A. Khan", status: "With FEP", dateIso: "2026-03-12" },
  { code: "P-227", lot: "LO-09", grade: "B", carats: 18, caratsDisplay: "18", fep: "M. Ali", status: "With FEP", dateIso: "2026-03-11" },
  { code: "P-226", lot: "LO-08", grade: "A", carats: 55.2, caratsDisplay: "55.2", fep: "—", status: "Warehouse", dateIso: "2026-02-28" },
  { code: "P-225", lot: "LO-08", grade: "C", carats: 12, caratsDisplay: "12", fep: "S. Noor", status: "In transit", dateIso: "2026-02-27" },
];

const SORT_OPTIONS: SortOption[] = [
  { id: "newest", label: "Newest parcel (default)" },
  { id: "oldest", label: "Oldest parcel first" },
  { id: "parcel_asc", label: "Parcel code (A → Z)" },
  { id: "parcel_desc", label: "Parcel code (Z → A)" },
  { id: "lot_asc", label: "Lot code (A → Z)" },
  { id: "carats_high", label: "Carats (high → low)" },
  { id: "carats_low", label: "Carats (low → high)" },
  { id: "fep_az", label: "FEP name (A → Z)" },
  { id: "status_az", label: "Status (A → Z)" },
];

const STATUSES = ["With FEP", "Warehouse", "In transit", "Reserved"] as const;
const GRADES = ["A", "B", "C"] as const;

function statusStyle(s: string) {
  if (s === "With FEP") return "bg-sky-50 text-sky-800 ring-sky-100";
  if (s === "Warehouse") return "bg-slate-100 text-slate-700 ring-slate-200";
  if (s === "In transit") return "bg-amber-50 text-amber-900 ring-amber-100";
  return "bg-violet-50 text-violet-800 ring-violet-100";
}

function cmpCode(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function ParcelsPage() {
  const [extra, setExtra] = useState<DemoParcelRow[]>([]);
  useEffect(() => {
    setExtra(loadAddedParcels());
  }, []);

  const allRows = useMemo(() => [...extra, ...SEED], [extra]);

  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("newest");
  const [statusFilters, setStatusFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(STATUSES.map((s) => [s, false])),
  );
  const [gradeFilters, setGradeFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GRADES.map((g) => [g, false])),
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasActiveFilters = useMemo(() => {
    const anyStatus = STATUSES.some((s) => statusFilters[s]);
    const anyGrade = GRADES.some((g) => gradeFilters[g]);
    return anyStatus || anyGrade || Boolean(dateFrom) || Boolean(dateTo);
  }, [statusFilters, gradeFilters, dateFrom, dateTo]);

  function resetFilters() {
    setStatusFilters(Object.fromEntries(STATUSES.map((s) => [s, false])));
    setGradeFilters(Object.fromEntries(GRADES.map((g) => [g, false])));
    setDateFrom("");
    setDateTo("");
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allRows.filter((row) => {
      if (q) {
        const blob = `${row.code} ${row.lot} ${row.grade} ${row.fep} ${row.status}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      const anyStatus = STATUSES.some((s) => statusFilters[s]);
      if (anyStatus && !statusFilters[row.status]) return false;
      const anyGrade = GRADES.some((g) => gradeFilters[g]);
      if (anyGrade && !gradeFilters[row.grade]) return false;
      if (dateFrom && row.dateIso < dateFrom) return false;
      if (dateTo && row.dateIso > dateTo) return false;
      return true;
    });

    const sorted = [...list];
    switch (sortId) {
      case "oldest":
        sorted.sort((a, b) => cmpCode(a.code, b.code));
        break;
      case "newest":
        sorted.sort((a, b) => cmpCode(b.code, a.code));
        break;
      case "parcel_asc":
        sorted.sort((a, b) => cmpCode(a.code, b.code));
        break;
      case "parcel_desc":
        sorted.sort((a, b) => cmpCode(b.code, a.code));
        break;
      case "lot_asc":
        sorted.sort((a, b) => cmpCode(a.lot, b.lot) || cmpCode(a.code, b.code));
        break;
      case "carats_high":
        sorted.sort((a, b) => b.carats - a.carats || cmpCode(a.code, b.code));
        break;
      case "carats_low":
        sorted.sort((a, b) => a.carats - b.carats || cmpCode(a.code, b.code));
        break;
      case "fep_az":
        sorted.sort((a, b) => a.fep.localeCompare(b.fep) || cmpCode(a.code, b.code));
        break;
      case "status_az":
        sorted.sort((a, b) => a.status.localeCompare(b.status) || cmpCode(a.code, b.code));
        break;
      default:
        break;
    }
    return sorted;
  }, [allRows, search, sortId, statusFilters, gradeFilters, dateFrom, dateTo]);

  return (
    <ListPageLayout
      title="Parcels"
      subtitle="Track weight, grade, and which FEP holds each parcel."
      decorativeEnd={
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 shadow-sm ring-1 ring-violet-200/70">
          <svg className="h-7 w-7 text-violet-900" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 7.5V18a1.5 1.5 0 01-1.5 1.5H4.5A1.5 1.5 0 013 18V7.5M3 7.5l7.47-3.735a1.5 1.5 0 011.06 0L21 7.5M3 7.5h18M9 12h6"
            />
          </svg>
        </div>
      }
      actions={<CreateModuleLink href="/parcels/new" variant="parcels">New parcel</CreateModuleLink>}
      toolbar={
        <ListToolbarInteractive
          placeholder="Search parcel, lot, grade, FEP…"
          search={search}
          onSearchChange={setSearch}
          sortOptions={SORT_OPTIONS}
          sortValue={sortId}
          onSortChange={setSortId}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          filterChildren={
            <>
              <FilterSection title="Status">
                <FilterCheckboxGrid>
                  {STATUSES.map((s) => (
                    <FilterCheckboxRow
                      key={s}
                      label={s}
                      checked={statusFilters[s] ?? false}
                      onChange={(checked) => setStatusFilters((prev) => ({ ...prev, [s]: checked }))}
                    />
                  ))}
                </FilterCheckboxGrid>
              </FilterSection>
              <FilterSection title="Grade">
                <FilterCheckboxGrid>
                  {GRADES.map((g) => (
                    <FilterCheckboxRow
                      key={g}
                      label={`Grade ${g}`}
                      checked={gradeFilters[g] ?? false}
                      onChange={(checked) => setGradeFilters((prev) => ({ ...prev, [g]: checked }))}
                    />
                  ))}
                </FilterCheckboxGrid>
              </FilterSection>
              <FilterSection title="Assignment date range">
                <FilterDateRangeRow from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} title="" />
              </FilterSection>
            </>
          }
        />
      }
    >
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Parcel</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Lot</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Grade</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Carats</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">FEP</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Status</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500 sm:px-6 sm:py-14">
                  No parcels match your filters or search. Try resetting filters or clearing the search box.
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => (
                <tr key={row.code} className="bg-white hover:bg-slate-50/80">
                  <td className="px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold tabular-nums text-slate-600">
                        {row.code.slice(-2)}
                      </span>
                      <p className="font-mono text-sm font-semibold text-slate-900">{row.code}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-700 sm:px-6 sm:py-5">{row.lot}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">
                    <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-100">
                      {row.grade}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-slate-900 sm:px-6 sm:py-5">{row.caratsDisplay}</td>
                  <td className="px-5 py-4 text-slate-600 sm:px-6 sm:py-5">{row.fep}</td>
                  <td className="px-5 py-4 sm:px-6 sm:py-5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right sm:px-6 sm:py-5">
                    <RowActionsMenu />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ListPageLayout>
  );
}
