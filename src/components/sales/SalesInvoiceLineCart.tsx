"use client";

import { Package, Plus, Trash2 } from "lucide-react";

import { lineSaleTotal, type InvoiceCartLine } from "@/lib/salesStockUtils";

type Props = {
  lines: InvoiceCartLine[];
  onUpdateLine: (id: string, patch: Partial<Pick<InvoiceCartLine, "rate" | "description">>) => void;
  onRemoveLine: (id: string) => void;
  onAddFromInventory: () => void;
  customize: {
    labelItem: string;
    labelDescription: string;
    labelQty: string;
    labelRate: string;
    labelAmount: string;
    showDescription: boolean;
    showQty: boolean;
    showRate: boolean;
  };
  demoMode?: boolean;
  onDemoLineChange?: (id: string, key: "item" | "description" | "qty" | "rate", value: string) => void;
  onAddDemoRow?: () => void;
};

function num(v: string): number {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function money(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalesInvoiceLineCart({
  lines,
  onUpdateLine,
  onRemoveLine,
  onAddFromInventory,
  customize,
  demoMode,
  onDemoLineChange,
  onAddDemoRow,
}: Props) {
  return (
    <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--gs-muted)]">Invoice lines</h2>
          <p className="text-xs text-[var(--gs-muted)]">Each line is one inventory parcel (full unit sale).</p>
        </div>
        <button
          type="button"
          onClick={demoMode ? onAddDemoRow : onAddFromInventory}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {demoMode ? "Add row" : "Add from inventory"}
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--gs-border)] px-6 py-10 text-center">
          <Package className="mx-auto h-10 w-10 text-[var(--gs-muted)]" aria-hidden />
          <p className="mt-3 text-sm text-[var(--gs-muted)]">No lines yet. Add parcels from a purchase lot.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lines.map((l) => {
            const lineTotal = lineSaleTotal(l);
            const qtyNum = num(l.qty);
            const uom = l.unit?.primary_uom_code || "ct";
            const inventoryCost = l.unit ? num(String(l.unit.cost_basis_total)) : 0;
            const perUom = qtyNum > 0 ? lineTotal / qtyNum : 0;
            return (
              <li key={l.id} className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-[var(--gs-text)]">{l.item || "—"}</p>
                    {customize.showDescription ? (
                      demoMode ? (
                        <input
                          value={l.description}
                          onChange={(e) => onDemoLineChange?.(l.id, "description", e.target.value)}
                          className="gs-field !mt-2 text-sm"
                          placeholder={customize.labelDescription}
                        />
                      ) : (
                        <input
                          value={l.description}
                          onChange={(e) => onUpdateLine(l.id, { description: e.target.value })}
                          className="gs-field !mt-2 text-sm"
                          placeholder={customize.labelDescription}
                        />
                      )
                    ) : null}
                    {l.unit ? (
                      <p className="mt-1 text-xs text-[var(--gs-muted)]">
                        Lot-linked · {l.unit.primary_uom_qty} {uom} · {l.unit.pieces} pc
                        {inventoryCost > 0 ? (
                          <span className="ml-1">· Inventory cost {money(inventoryCost)}</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLine(l.id)}
                    className="rounded-lg p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-red-600"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {customize.showQty && demoMode ? (
                    <label className="block text-xs">
                      <span className="font-semibold uppercase text-[var(--gs-muted)]">{customize.labelQty}</span>
                      <input
                        value={l.qty}
                        onChange={(e) => onDemoLineChange?.(l.id, "qty", e.target.value)}
                        className="gs-field !mt-1 text-right"
                      />
                    </label>
                  ) : null}
                  {customize.showRate ? (
                    <label className="block text-xs sm:col-span-2">
                      <span className="font-semibold uppercase text-[var(--gs-muted)]">Sale total (this parcel)</span>
                      <input
                        value={lineTotal > 0 || l.rate !== "0" ? String(lineTotal) : ""}
                        placeholder="Enter sale price"
                        onChange={(e) => {
                          const nextTotal = num(e.target.value);
                          const q = num(l.qty);
                          const nextRate = q > 0 ? String(nextTotal / q) : String(nextTotal);
                          if (demoMode) {
                            onDemoLineChange?.(l.id, "rate", nextRate);
                            return;
                          }
                          onUpdateLine(l.id, { rate: nextRate });
                        }}
                        className="gs-field !mt-1 text-right text-base font-semibold"
                      />
                      {!demoMode && qtyNum > 0 ? (
                        <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                          {qtyNum.toLocaleString()} {uom} × {money(perUom)}/{uom} = {money(lineTotal)}
                        </p>
                      ) : null}
                    </label>
                  ) : null}
                </div>
                {demoMode ? (
                  <label className="mt-2 block text-xs">
                    <span className="font-semibold uppercase text-[var(--gs-muted)]">{customize.labelItem}</span>
                    <input
                      value={l.item}
                      onChange={(e) => onDemoLineChange?.(l.id, "item", e.target.value)}
                      className="gs-field !mt-1"
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
