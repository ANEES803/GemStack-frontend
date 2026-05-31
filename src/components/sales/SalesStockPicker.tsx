"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Package, Search } from "lucide-react";

import { AppDialog } from "@/components/ui/AppDialog";
import {
  fetchSellableByLot,
  fetchStockUnitLineage,
  type InvSellableLotGroupDto,
  type InvStockUnitDto,
} from "@/lib/invApi";
import { gradeFromAttributes, imageUrlFromAttributes } from "@/lib/salesStockUtils";

type Step = "lots" | "parcels";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (units: InvStockUnitDto[]) => void;
  excludeUnitIds?: string[];
  initialLotId?: string | null;
};

function ParcelThumb({ unit }: { unit: InvStockUnitDto }) {
  const img = imageUrlFromAttributes(unit.attributes_json);
  if (img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={img} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-[var(--gs-border)]" />
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--gs-hover)] ring-1 ring-[var(--gs-border)]">
      <Package className="h-6 w-6 text-[var(--gs-muted)]" aria-hidden />
    </div>
  );
}

export function SalesStockPicker({ open, onClose, onConfirm, excludeUnitIds = [], initialLotId }: Props) {
  const exclude = useMemo(() => new Set(excludeUnitIds), [excludeUnitIds]);
  const [step, setStep] = useState<Step>("lots");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotGroups, setLotGroups] = useState<InvSellableLotGroupDto[]>([]);
  const [activeLot, setActiveLot] = useState<InvSellableLotGroupDto | null>(null);
  const [parcelSearch, setParcelSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [lineageOpen, setLineageOpen] = useState(false);
  const [lineageUnit, setLineageUnit] = useState<InvStockUnitDto | null>(null);
  const [lineageText, setLineageText] = useState<string>("");

  const loadLots = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSellableByLot({ search: q.trim() || undefined, limit: 100 });
      setLotGroups(data.lots.filter((g) => g.sellable_unit_count > 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load stock");
      setLotGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("lots");
    setSearch("");
    setParcelSearch("");
    setPicked(new Set());
    setActiveLot(null);
    void loadLots("");
  }, [open, loadLots]);

  useEffect(() => {
    if (!open || !initialLotId || lotGroups.length === 0) return;
    const match = lotGroups.find((g) => g.purchase_lot_id === initialLotId);
    if (match) {
      setActiveLot(match);
      setStep("parcels");
    }
  }, [open, initialLotId, lotGroups]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (step === "lots") void loadLots(search);
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, step, search, loadLots]);

  const filteredParcels = useMemo(() => {
    if (!activeLot) return [];
    const q = parcelSearch.trim().toLowerCase();
    return activeLot.units.filter((u) => {
      if (exclude.has(u.id)) return false;
      if (!q) return true;
      const blob = `${u.public_code} ${u.display_name} ${u.notes}`.toLowerCase();
      return blob.includes(q);
    });
  }, [activeLot, parcelSearch, exclude]);

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openLot(group: InvSellableLotGroupDto) {
    setActiveLot(group);
    setParcelSearch("");
    setPicked(new Set());
    setStep("parcels");
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
    if (!activeLot) return;
    const units = activeLot.units.filter((u) => picked.has(u.id));
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
        title={step === "lots" ? "Select purchase lot / batch" : `Parcels — ${activeLot?.lot_code ?? ""}`}
        description={
          step === "lots"
            ? "Choose a lot, then pick sellable parcels to add to the invoice."
            : "Select one or more parcels, then add to invoice."
        }
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {step === "parcels" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("lots");
                    setActiveLot(null);
                    setPicked(new Set());
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--gs-border)] px-3 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to lots
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              {step === "parcels" ? (
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

        {step === "lots" ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gs-muted)]" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lot code, parcel code, or name…"
                className="gs-field pl-9"
              />
            </div>
            {loading ? <p className="text-sm text-[var(--gs-muted)]">Loading lots…</p> : null}
            {!loading && lotGroups.length === 0 ? (
              <p className="text-sm text-[var(--gs-muted)]">No sellable stock found. Receive or split inventory first.</p>
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2">
              {lotGroups.map((g) => (
                <li key={g.purchase_lot_id ?? g.lot_code}>
                  <button
                    type="button"
                    onClick={() => openLot(g)}
                    className="w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4 text-left transition hover:border-[var(--gs-accent)] hover:shadow-sm"
                  >
                    <p className="font-mono text-sm font-bold text-[var(--gs-text)]">{g.lot_code}</p>
                    {g.vendor_name ? <p className="mt-1 text-xs text-[var(--gs-muted)]">{g.vendor_name}</p> : null}
                    <p className="mt-2 text-sm text-[var(--gs-text)]">
                      {g.sellable_unit_count} parcel{g.sellable_unit_count === 1 ? "" : "s"} · {g.sellable_uom_total} ct · {g.sellable_pieces_total} pc
                    </p>
                    {g.receipt_date ? <p className="mt-1 text-xs text-[var(--gs-muted)]">Received {g.receipt_date}</p> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLot?.vendor_name ? (
              <p className="text-sm text-[var(--gs-muted)]">Vendor: {activeLot.vendor_name}</p>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gs-muted)]" aria-hidden />
              <input
                type="search"
                value={parcelSearch}
                onChange={(e) => setParcelSearch(e.target.value)}
                placeholder="Filter parcels by code or name…"
                className="gs-field pl-9"
              />
            </div>
            <ul className="max-h-[min(52vh,28rem)] space-y-2 overflow-y-auto pr-1">
              {filteredParcels.map((u) => {
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
                        <ParcelThumb unit={u} />
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
            {filteredParcels.length === 0 ? (
              <p className="text-sm text-[var(--gs-muted)]">No matching sellable parcels in this lot.</p>
            ) : null}
          </div>
        )}
      </AppDialog>

      <AppDialog
        open={lineageOpen}
        onClose={() => setLineageOpen(false)}
        titleId="lineage-preview"
        title={lineageUnit ? lineageUnit.public_code || "Lineage" : "Lineage"}
        size="sm"
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
