"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppDialog } from "@/components/ui/AppDialog";
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
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { ToastStack, type ToastItem } from "@/components/ui/ToastStack";
import { getAccessToken } from "@/lib/authClient";
import { deletePurchaseLot, listPurchaseLotSummaries, type PurchaseLotSummary } from "@/lib/purchaseLotsApi";
import { formatLotDisplays, loadLots, saveLots, type LotListRow } from "@/lib/lotsListStorage";

function paymentStatusLabel(raw: string): string {
  const x = raw.toLowerCase();
  if (x === "unpaid") return "Unpaid";
  if (x === "partially_paid") return "Partial";
  if (x === "paid") return "Paid";
  return raw;
}

function summaryToLotRow(s: PurchaseLotSummary): LotListRow {
  const carats = Number(s.total_carats);
  const cost = Number(s.cost);
  const disp = formatLotDisplays(carats, cost, s.date_iso);
  const terms = (s.payment_terms || "").trim() || "—";
  const payStatus = (s.payment_status || s.status || "").trim();
  return {
    id: s.id,
    code: s.code,
    supplier: s.supplier,
    carats,
    cost,
    dateIso: s.date_iso,
    ...disp,
    paymentSummary: `${paymentStatusLabel(payStatus)} · ${terms}`,
  };
}

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
  const [rows, setRows] = useState<LotListRow[]>([]);
  const [listSource, setListSource] = useState<"api" | "local">("local");
  /** False until the first load attempt for the current auth mode finishes (avoids showing wrong data). */
  const [listReady, setListReady] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LotListRow | null>(null);
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const removeToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);
  const pushToast = useCallback(
    (message: string, variant: "success" | "error") => {
      const id = ++toastIdRef.current;
      setToasts((t) => [...t.slice(-4), { id, message, variant }]);
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast],
  );

  useEffect(() => {
    let cancelled = false;
    setListReady(false);
    setListError(null);

    const token = getAccessToken();
    if (!token) {
      setRows(loadLots());
      setListSource("local");
      setListError(null);
      setListReady(true);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const list = await listPurchaseLotSummaries();
        if (cancelled) return;
        setRows(list.map(summaryToLotRow));
        setListSource("api");
        setListError(null);
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setListSource("api");
        setListError(e instanceof Error ? e.message : "Could not load lots from the server.");
      } finally {
        if (!cancelled) setListReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const suppliers = useMemo(() => [...new Set(rows.map((r) => r.supplier))].sort(), [rows]);

  const [search, setSearch] = useState("");
  const [sortId, setSortId] = useState("recent");
  const [supplierFilters, setSupplierFilters] = useState<Record<string, boolean>>({});

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
        const blob = `${row.code} ${row.supplier} ${row.dateDisplay} ${row.costDisplay} ${row.paymentSummary ?? ""}`.toLowerCase();
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

  async function performDelete(row: LotListRow) {
    setDeleteTarget(null);
    if (listSource === "api" && row.id) {
      try {
        await deletePurchaseLot(row.id);
        const list = await listPurchaseLotSummaries();
        setRows(list.map(summaryToLotRow));
        pushToast("Lot deleted.", "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Delete failed.", "error");
      }
      return;
    }
    const next = rows.filter((r) => r.code !== row.code);
    saveLots(next);
    setRows(next);
    pushToast("Lot deleted.", "success");
  }

  function handleEdit(row: LotListRow) {
    router.push(`/lots/edit/${encodeURIComponent(row.code)}`);
  }

  const emptyMessage = useMemo(() => {
    if (!listReady) return "";
    if (listError) return "";
    const q = search.trim();
    if (rows.length === 0 && !q && !hasActiveFilters) {
      return listSource === "api"
        ? "No purchase lots yet. Use New lot to record a purchase."
        : "No lots in local storage. Sign in to load from the server, or add a lot while offline.";
    }
    if (filteredSorted.length === 0) {
      return "No lots match your filters or search.";
    }
    return "";
  }, [listReady, listError, rows.length, search, hasActiveFilters, filteredSorted.length, listSource]);

  async function retryLoad() {
    if (!getAccessToken()) return;
    setListReady(false);
    setListError(null);
    try {
      const list = await listPurchaseLotSummaries();
      setRows(list.map(summaryToLotRow));
      setListSource("api");
    } catch (e) {
      setRows([]);
      setListError(e instanceof Error ? e.message : "Could not load lots from the server.");
    } finally {
      setListReady(true);
    }
  }

  return (
    <>
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
          disabled={!listReady}
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
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--gs-border)]/80 bg-[var(--gs-table-head)]">
              <th className={`${thBase} text-center`}>Lot</th>
              <th className={`${thBase} text-center`}>Receive date</th>
              <th className={`${thBase} text-center`}>Supplier</th>
              <th className={`${thBase} text-center`}>Payment</th>
              <th className={`${thBase} text-center tabular-nums`}>Cts in hand</th>
              <th className={`${thBase} text-center tabular-nums`}>Total cost</th>
              <th className={`${thBase} text-center`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gs-border)]">
            {!listReady ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <LoadingBlock label="Loading lots…" />
                </td>
              </tr>
            ) : listError ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center sm:py-12">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{listError}</p>
                  <button
                    type="button"
                    onClick={() => void retryLoad()}
                    className="mt-4 rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : emptyMessage ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-[var(--gs-muted)] sm:py-14">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => (
                <tr
                  key={row.id ?? row.code}
                  className="bg-[var(--gs-card)] transition-colors duration-150 hover:bg-[var(--gs-hover)]/90"
                >
                  <td className={`${tdBase} text-center`}>
                    <p className="font-mono text-sm font-semibold text-[var(--gs-text)]">{row.code}</p>
                  </td>
                  <td className={`${tdBase} text-center text-[var(--gs-muted)]`}>{row.dateDisplay}</td>
                  <td className={`${tdBase} text-center text-[var(--gs-text)]`}>{row.supplier}</td>
                  <td className={`${tdBase} max-w-[10rem] text-center text-xs leading-snug text-[var(--gs-text)] sm:max-w-[14rem]`}>
                    {row.paymentSummary ?? "—"}
                  </td>
                  <td className={`${tdBase} text-center font-medium tabular-nums text-[var(--gs-text)]`}>{row.caratsDisplay}</td>
                  <td className={`${tdBase} text-center font-semibold tabular-nums text-[var(--gs-text)]`}>{row.costDisplay}</td>
                  <td className={`${tdBase} text-center`}>
                    <div className="flex justify-center">
                      <RowActionsMenu
                        align="right"
                        actions={[
                          { label: "Edit", tone: "accent", onSelect: () => handleEdit(row) },
                          { label: "Delete", tone: "danger", onSelect: () => setDeleteTarget(row) },
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

    <AppDialog
      open={deleteTarget !== null}
      onClose={() => setDeleteTarget(null)}
      titleId="delete-lot-title"
      title="Delete this lot?"
      description={deleteTarget ? `This will remove lot ${deleteTarget.code} and cannot be undone.` : undefined}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (deleteTarget) void performDelete(deleteTarget);
            }}
            className="rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete lot
          </button>
        </div>
      }
    >
      {null}
    </AppDialog>

    <ToastStack toasts={toasts} onRemove={removeToast} />
    </>
  );
}
