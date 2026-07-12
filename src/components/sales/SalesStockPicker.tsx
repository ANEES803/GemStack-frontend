"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Package, Scissors, Search } from "lucide-react";

import { AppDialog } from "@/components/ui/AppDialog";
import {
  fetchSellableByStock,
  fetchStockUnitLineage,
  type InvSellableStockGroupDto,
  type InvStockUnitDto,
} from "@/lib/invApi";
import { gradeFromAttributes, imageUrlFromAttributes } from "@/lib/salesStockUtils";

type Step = "stocks" | "items";

// Match the app's toolbar search input (no `gs-field` margin-top) so the
// absolutely-centered search icon lines up with the input text.
const SEARCH_INPUT_CLASS =
  "w-full rounded-xl border border-[var(--gs-input-border)] bg-[var(--gs-input-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--gs-text)] outline-none transition placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/15";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (units: InvStockUnitDto[]) => void;
  excludeUnitIds?: string[];
  initialStockUnitId?: string | null;
};

function ParcelThumb({ src }: { src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-[var(--gs-border)]" />
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--gs-hover)] ring-1 ring-[var(--gs-border)]">
      <Package className="h-6 w-6 text-[var(--gs-muted)]" aria-hidden />
    </div>
  );
}

export function SalesStockPicker({ open, onClose, onConfirm, excludeUnitIds = [], initialStockUnitId }: Props) {
  const exclude = useMemo(() => new Set(excludeUnitIds), [excludeUnitIds]);
  const [step, setStep] = useState<Step>("stocks");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockGroups, setStockGroups] = useState<InvSellableStockGroupDto[]>([]);
  const [activeStock, setActiveStock] = useState<InvSellableStockGroupDto | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [lineageOpen, setLineageOpen] = useState(false);
  const [lineageUnit, setLineageUnit] = useState<InvStockUnitDto | null>(null);
  const [lineageText, setLineageText] = useState<string>("");

  const loadStocks = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSellableByStock({ search: q.trim() || undefined, limit: 100 });
      setStockGroups(data.stocks.filter((g) => g.sellable_unit_count > 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load stock");
      setStockGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("stocks");
    setSearch("");
    setItemSearch("");
    setPicked(new Set());
    setActiveStock(null);
    void loadStocks("");
  }, [open, loadStocks]);

  useEffect(() => {
    if (!open || !initialStockUnitId || stockGroups.length === 0) return;
    const match = stockGroups.find((g) => g.root_unit_id === initialStockUnitId);
    if (match && !match.requires_split) {
      setActiveStock(match);
      setStep("items");
    }
  }, [open, initialStockUnitId, stockGroups]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (step === "stocks") void loadStocks(search);
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, step, search, loadStocks]);

  const filteredItems = useMemo(() => {
    // requires_split stocks expose only the non-sellable root, so nothing is selectable.
    const sellableItems = !activeStock || activeStock.requires_split ? [] : activeStock.units;
    const q = itemSearch.trim().toLowerCase();
    return sellableItems.filter((u) => {
      if (exclude.has(u.id)) return false;
      if (!q) return true;
      const blob = `${u.public_code} ${u.display_name} ${u.notes}`.toLowerCase();
      return blob.includes(q);
    });
  }, [activeStock, itemSearch, exclude]);

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openStock(group: InvSellableStockGroupDto) {
    if (group.requires_split) return;
    setActiveStock(group);
    setItemSearch("");
    setPicked(new Set());
    setStep("items");
  }

  async function showLineage(unit: InvStockUnitDto) {
    setLineageUnit(unit);
    setLineageText("Loading…");
    setLineageOpen(true);
    try {
      const tree = await fetchStockUnitLineage(unit.id);
      const chain = [...tree.ancestors.map((a) => a.public_code || a.display_name), unit.public_code || unit.display_name];
      setLineageText(chain.length ? chain.join(" → ") : "No parent chain");
    } catch {
      setLineageText("Could not load lineage");
    }
  }

  function confirmSelection() {
    if (!activeStock) return;
    const units = activeStock.units.filter((u) => picked.has(u.id));
    if (!units.length) return;
    onConfirm(units);
    onClose();
  }

  return (
    <>
      <AppDialog
        open={open}
        onClose={onClose}
        titleId="sales-stock-picker-title"
        title={step === "stocks" ? "Select a stock" : `Items — ${activeStock?.root_display_name ?? ""}`}
        description={
          step === "stocks"
            ? "Search a stock, then pick the sellable items inside it to add to the invoice."
            : "Select one or more sellable items, then add to the invoice."
        }
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {step === "items" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("stocks");
                    setActiveStock(null);
                    setPicked(new Set());
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--gs-border)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to stocks
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              {step === "items" ? (
                <button
                  type="button"
                  disabled={picked.size === 0}
                  onClick={confirmSelection}
                  className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Add {picked.size || ""} to invoice
                </button>
              ) : null}
            </div>
          </div>
        }
      >
        {error ? <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}

        {step === "stocks" ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gs-muted)]" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock by name, code, or item inside it…"
                className={SEARCH_INPUT_CLASS}
              />
            </div>
            {loading ? <p className="text-sm text-[var(--gs-muted)]">Loading stock…</p> : null}
            {!loading && stockGroups.length === 0 ? (
              <p className="text-sm text-[var(--gs-muted)]">No sellable stock found. Add inventory and split it into sellable pieces first.</p>
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2">
              {stockGroups.map((g) => {
                const blocked = g.requires_split;
                return (
                  <li key={g.root_unit_id}>
                    <button
                      type="button"
                      onClick={() => openStock(g)}
                      disabled={blocked}
                      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                        blocked
                          ? "cursor-not-allowed border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)] opacity-80"
                          : "border-[var(--gs-border)] bg-[var(--gs-card)] hover:border-[var(--gs-accent)] hover:shadow-sm"
                      }`}
                    >
                      <ParcelThumb src={g.primary_image_url} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--gs-text)]">{g.root_display_name || g.root_public_code}</p>
                        {g.root_public_code ? <p className="font-mono text-xs text-[var(--gs-muted)]">{g.root_public_code}</p> : null}
                        <p className="mt-1 text-xs text-[var(--gs-muted)]">
                          {g.item_type_label}
                          {g.lot_code ? ` · Lot ${g.lot_code}` : ""}
                        </p>
                        {blocked ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                            <Scissors className="h-3.5 w-3.5" aria-hidden />
                            Split into pieces to sell
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-[var(--gs-text)]">
                            {g.sellable_unit_count} sellable item{g.sellable_unit_count === 1 ? "" : "s"} · {g.sellable_pieces_total} pc
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            {activeStock?.item_type_label || activeStock?.lot_code ? (
              <p className="text-sm text-[var(--gs-muted)]">
                {activeStock?.item_type_label}
                {activeStock?.lot_code ? ` · Lot ${activeStock.lot_code}` : ""}
              </p>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gs-muted)]" aria-hidden />
              <input
                type="search"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Filter items by code or name…"
                className={SEARCH_INPUT_CLASS}
              />
            </div>
            <ul className="max-h-[min(52vh,28rem)] space-y-2 overflow-y-auto pr-1">
              {filteredItems.map((u) => {
                const grade = gradeFromAttributes(u.attributes_json);
                const selected = picked.has(u.id);
                return (
                  <li key={u.id}>
                    <div
                      className={`flex gap-3 rounded-xl border p-3 transition ${
                        selected ? "border-[var(--gs-accent)] bg-[var(--gs-accent-soft)]" : "border-[var(--gs-border)] bg-[var(--gs-card)]"
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePick(u.id)}
                          className="mt-3 h-4 w-4 shrink-0"
                        />
                        <ParcelThumb src={imageUrlFromAttributes(u.attributes_json)} />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-bold text-[var(--gs-text)]">{u.public_code || u.display_name}</p>
                          <p className="truncate text-sm text-[var(--gs-muted)]">{u.display_name}</p>
                          <p className="mt-1 text-xs text-[var(--gs-text)]">
                            {u.primary_uom_qty} {u.primary_uom_code} · {u.pieces} pc
                            {grade ? ` · Grade ${grade}` : ""}
                          </p>
                          {u.list_price_per_uom ? (
                            <p className="text-xs text-[var(--gs-muted)]">List ${Number(u.list_price_per_uom).toFixed(2)}/uom</p>
                          ) : null}
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={() => void showLineage(u)}
                        className="shrink-0 self-start text-xs font-semibold text-[var(--gs-accent)] hover:underline"
                      >
                        Lineage
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {filteredItems.length === 0 ? (
              <p className="text-sm text-[var(--gs-muted)]">No matching sellable items in this stock.</p>
            ) : null}
          </div>
        )}
      </AppDialog>

      <AppDialog
        open={lineageOpen}
        onClose={() => setLineageOpen(false)}
        titleId="lineage-preview"
        title={lineageUnit ? lineageUnit.public_code || "Lineage" : "Lineage"}
        size="md"
        footer={
          <button type="button" onClick={() => setLineageOpen(false)} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
            Close
          </button>
        }
      >
        <p className="text-sm text-[var(--gs-text)]">{lineageText}</p>
      </AppDialog>
    </>
  );
}
