"use client";

import { useMemo, useState } from "react";

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

type LotRow = {
  code: string;
  supplier: string;
  carats: number;
  caratsDisplay: string;
  cost: number;
  costDisplay: string;
  dateIso: string;
  dateDisplay: string;
};

const SEED: LotRow[] = [
  {
    code: "LO-09",
    supplier: "Sapphire Co.",
    carats: 312,
    caratsDisplay: "312.0",
    cost: 48200,
    costDisplay: "$48,200",
    dateIso: "2026-03-12",
    dateDisplay: "Mar 12, 2026",
  },
  {
    code: "LO-08",
    supplier: "Global Gems Ltd",
    carats: 145.5,
    caratsDisplay: "145.5",
    cost: 22900,
    costDisplay: "$22,900",
    dateIso: "2026-02-28",
    dateDisplay: "Feb 28, 2026",
  },
  {
    code: "LO-07",
    supplier: "Sapphire Co.",
    carats: 228,
    caratsDisplay: "228.0",
    cost: 31400,
    costDisplay: "$31,400",
    dateIso: "2026-02-02",
    dateDisplay: "Feb 02, 2026",
  },
  {
    code: "LO-06",
    supplier: "Ceylon Traders",
    carats: 88,
    caratsDisplay: "88.0",
    cost: 14200,
    costDisplay: "$14,200",
    dateIso: "2026-01-18",
    dateDisplay: "Jan 18, 2026",
  },
];

const SORT_OPTIONS: SortOption[] = [
  { id: "recent", label: "Recent receipt (default)" },
  { id: "oldest", label: "Oldest receipt first" },
  { id: "lot_asc", label: "Lot code (A → Z)" },
  { id: "lot_desc", label: "Lot code (Z → A)" },
  { id: "carats_high", label: "Carats (high → low)" },
  { id: "carats_low", label: "Carats (low → high)" },
  { id: "cost_high", label: "Total cost (high → low)" },
  { id: "cost_low", label: "Total cost (low → high)" },
  { id: "supplier_az", label: "Supplier (A → Z)" },
];

function cmpCode(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function LotsPage() {
  const suppliers = useMemo(() => [...new Set(SEED.map((r) => r.supplier))].sort(), []);

  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("recent");
  const [supplierFilters, setSupplierFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(suppliers.map((s) => [s, false])),
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasActiveFilters = useMemo(() => {
    const anySupplier = suppliers.some((s) => supplierFilters[s]);
    return anySupplier || Boolean(dateFrom) || Boolean(dateTo);
  }, [suppliers, supplierFilters, dateFrom, dateTo]);

  function resetFilters() {
    setSupplierFilters(Object.fromEntries(suppliers.map((s) => [s, false])));
    setDateFrom("");
    setDateTo("");
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = SEED.filter((row) => {
      if (q) {
        const blob = `${row.code} ${row.supplier} ${row.dateDisplay} ${row.costDisplay}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      const anySupplier = suppliers.some((s) => supplierFilters[s]);
      if (anySupplier && !supplierFilters[row.supplier]) return false;
      if (dateFrom && row.dateIso < dateFrom) return false;
      if (dateTo && row.dateIso > dateTo) return false;
      return true;
    });

    const sorted = [...list];
    switch (sortId) {
      case "recent":
        sorted.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || cmpCode(b.code, a.code));
        break;
      case "oldest":
        sorted.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || cmpCode(a.code, b.code));
        break;
      case "lot_asc":
        sorted.sort((a, b) => cmpCode(a.code, b.code));
        break;
      case "lot_desc":
        sorted.sort((a, b) => cmpCode(b.code, a.code));
        break;
      case "carats_high":
        sorted.sort((a, b) => b.carats - a.carats || cmpCode(a.code, b.code));
        break;
      case "carats_low":
        sorted.sort((a, b) => a.carats - b.carats || cmpCode(a.code, b.code));
        break;
      case "cost_high":
        sorted.sort((a, b) => b.cost - a.cost || cmpCode(a.code, b.code));
        break;
      case "cost_low":
        sorted.sort((a, b) => a.cost - b.cost || cmpCode(a.code, b.code));
        break;
      case "supplier_az":
        sorted.sort((a, b) => a.supplier.localeCompare(b.supplier) || cmpCode(a.code, b.code));
        break;
      default:
        break;
    }
    return sorted;
  }, [search, sortId, supplierFilters, dateFrom, dateTo, suppliers]);

  return (
    <ListPageLayout
      title="Lots"
      subtitle="Bulk purchases — total weight and cost at lot level before parcels are split."
      actions={<CreateModuleLink href="/lots/new" variant="lots">New lot</CreateModuleLink>}
      toolbar={
        <ListToolbarInteractive
          placeholder="Search by lot code, supplier, or date…"
          search={search}
          onSearchChange={setSearch}
          sortOptions={SORT_OPTIONS}
          sortValue={sortId}
          onSortChange={setSortId}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={resetFilters}
          filterChildren={
            <>
              <FilterSection title="Supplier">
                <FilterCheckboxGrid>
                  {suppliers.map((s) => (
                    <FilterCheckboxRow
                      key={s}
                      label={s}
                      checked={supplierFilters[s] ?? false}
                      onChange={(checked) => setSupplierFilters((prev) => ({ ...prev, [s]: checked }))}
                    />
                  ))}
                </FilterCheckboxGrid>
              </FilterSection>
              <FilterSection title="Received date range">
                <FilterDateRangeRow from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} title="" />
              </FilterSection>
            </>
          }
        />
      }
    >
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Lot</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Supplier</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Carats</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Total cost</th>
              <th className="px-5 py-3.5 sm:px-6 sm:py-4">Received</th>
              <th className="px-5 py-3.5 text-right sm:px-6 sm:py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500 sm:px-6 sm:py-14">
                  No lots match your filters or search.
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => (
                <tr key={row.code} className="bg-white hover:bg-slate-50/80">
                  <td className="px-5 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold tabular-nums text-slate-600">
                        {row.code.slice(-2)}
                      </span>
                      <div className="flex min-w-0 items-center pt-0.5">
                        <p className="font-mono text-sm font-semibold text-slate-900">{row.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-800 sm:px-6 sm:py-5">{row.supplier}</td>
                  <td className="px-5 py-4 text-right font-medium text-slate-900 sm:px-6 sm:py-5">{row.caratsDisplay}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900 sm:px-6 sm:py-5">{row.costDisplay}</td>
                  <td className="px-5 py-4 text-slate-600 sm:px-6 sm:py-5">{row.dateDisplay}</td>
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
