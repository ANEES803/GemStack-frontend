"use client";

import { useRouter } from "next/navigation";
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
import { DEFAULT_LOTS_SEED, loadLots, saveLots, type LotListRow } from "@/lib/lotsListStorage";

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

const thBase =
  "px-3 py-3 text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)] sm:px-4 sm:py-3.5";
const tdBase = "px-3 py-3.5 align-middle text-sm sm:px-4 sm:py-4";

export default function LotsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LotListRow[]>(DEFAULT_LOTS_SEED);

  useEffect(() => {
    setRows(loadLots());
  }, []);

  const suppliers = useMemo(() => [...new Set(rows.map((r) => r.supplier))].sort(), [rows]);

  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("recent");
  const [supplierFilters, setSupplierFilters] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([...new Set(DEFAULT_LOTS_SEED.map((r) => r.supplier))].sort().map((s) => [s, false])),
  );

  useEffect(() => {
    setSupplierFilters((prev) => {
      const next = { ...prev };
      for (const s of suppliers) {
        if (!(s in next)) next[s] = false;
      }
      return next;
    });
  }, [suppliers]);

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
    let list = rows.filter((row) => {
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
  }, [search, sortId, supplierFilters, dateFrom, dateTo, suppliers, rows]);

  function handleDelete(row: LotListRow) {
    if (!window.confirm("Are you sure you want to delete this lot?")) return;
    const next = rows.filter((r) => r.code !== row.code);
    saveLots(next);
    setRows(next);
    window.alert("Lot deleted successfully.");
  }

  function handleEdit(row: LotListRow) {
    router.push(`/lots/edit/${encodeURIComponent(row.code)}`);
  }

  return (
    <ListPageLayout
      title="Lots"
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
        <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--gs-border)]/80 bg-[var(--gs-table-head)]">
              <th className={`${thBase} text-center`}>Lot</th>
              <th className={`${thBase} text-center`}>Receive date</th>
              <th className={`${thBase} text-center`}>Supplier</th>
              <th className={`${thBase} text-center tabular-nums`}>UOM</th>
              <th className={`${thBase} text-center tabular-nums`}>Cts in hand</th>
              <th className={`${thBase} text-center tabular-nums`}>Total cost</th>
              <th className={`${thBase} text-center`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gs-border)]">
            {filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-[var(--gs-muted)] sm:py-14">
                  No lots match your filters or search.
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => (
                <tr
                  key={row.code}
                  className="bg-[var(--gs-card)] transition-colors duration-150 hover:bg-[var(--gs-hover)]/90"
                >
                  <td className={`${tdBase} text-center`}>
                    <p className="font-mono text-sm font-semibold text-[var(--gs-text)]">{row.code}</p>
                  </td>
                  <td className={`${tdBase} text-center text-[var(--gs-muted)]`}>{row.dateDisplay}</td>
                  <td className={`${tdBase} text-center text-[var(--gs-text)]`}>{row.supplier}</td>
                  <td className={`${tdBase} text-center font-medium tabular-nums text-[var(--gs-text)]`}>{row.caratsDisplay}</td>
                  <td className={`${tdBase} text-center font-medium tabular-nums text-[var(--gs-text)]`}>{row.caratsDisplay}</td>
                  <td className={`${tdBase} text-center font-semibold tabular-nums text-[var(--gs-text)]`}>{row.costDisplay}</td>
                  <td className={`${tdBase} text-center`}>
                    <div className="flex justify-center">
                      <RowActionsMenu
                        align="right"
                        actions={[
                          { label: "Edit", tone: "accent", onSelect: () => handleEdit(row) },
                          { label: "Delete", tone: "danger", onSelect: () => handleDelete(row) },
                        ]}
                      />
                    </div>
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
