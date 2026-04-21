"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Package, Plus, RefreshCw, Table, Upload } from "lucide-react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { getAccessToken } from "@/lib/authClient";
import {
  createAuditSession,
  createService,
  createStockUnit,
  fetchItemTypes,
  fetchReportByCustodian,
  fetchReportByType,
  fetchReportSummary,
  fetchServices,
  createStockUnitsFromPurchaseLot,
  fetchStockUnits,
  importStockFromLocalCache,
  splitStockUnits,
  type InvItemTypeDto,
  type InvServiceDto,
  type InvStockUnitDto,
} from "@/lib/invApi";
import {
  getPurchaseLotByCode,
  listPurchaseLotSummaries,
  type PurchaseLotDetail,
  type PurchaseLotSummary,
} from "@/lib/purchaseLotsApi";

type Tab = "items" | "stock" | "reports" | "audit";

const VALID: Set<Tab> = new Set(["items", "stock", "reports", "audit"]);

function stockUnitSplitLabel(u: InvStockUnitDto): string {
  const code = u.public_code?.trim();
  const fromLot = u.purchase_lot_id ? " · linked to a purchase lot" : "";
  return `${u.display_name}${code ? ` (${code})` : ""}${fromLot} — ${u.primary_uom_qty} ${u.primary_uom_code}`;
}

export function InventoryHubServer() {
  const { pushToast, prompt } = useAppNotifications();
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp.get("tab") as Tab | null;
  const tab: Tab = raw && VALID.has(raw) ? raw : "items";

  useEffect(() => {
    const t = sp.get("tab");
    if (!t || !VALID.has(t as Tab)) router.replace("/inventory?tab=items", { scroll: false });
  }, [router, sp]);

  const setTab = (t: Tab) => router.push(`/inventory?tab=${t}`, { scroll: false });

  const [clientReady, setClientReady] = useState(false);
  useEffect(() => {
    setClientReady(true);
  }, []);
  const authed = clientReady && Boolean(getAccessToken());
  const [scope, setScope] = useState<"stock" | "services">("stock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<InvItemTypeDto[]>([]);
  const [units, setUnits] = useState<InvStockUnitDto[]>([]);
  const [services, setServices] = useState<InvServiceDto[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchReportSummary>> | null>(null);
  const [byType, setByType] = useState<Awaited<ReturnType<typeof fetchReportByType>>>([]);
  const [byCust, setByCust] = useState<Awaited<ReturnType<typeof fetchReportByCustodian>>>([]);

  const loadAll = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    setError(null);
    try {
      const [t, u, s] = await Promise.all([
        fetchItemTypes(),
        fetchStockUnits({ status: "active", limit: 200 }),
        fetchServices(),
      ]);
      setTypes(t);
      setUnits(u);
      setServices(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadReports = useCallback(async () => {
    if (!authed) return;
    try {
      const [su, bt, bc] = await Promise.all([fetchReportSummary(), fetchReportByType(), fetchReportByCustodian()]);
      setSummary(su);
      setByType(bt);
      setByCust(bc);
    } catch {
      /* ignore */
    }
  }, [authed]);

  useEffect(() => {
    if (tab === "reports") void loadReports();
  }, [tab, loadReports]);

  const [newOpen, setNewOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState({
    item_type_id: "",
    display_name: "",
    public_code: "",
    primary_uom_qty: "",
    primary_uom_code: "ct",
    pieces: "0",
    cost_basis_total: "",
    list_price_per_uom: "",
    notes: "",
  });

  const [splitOpen, setSplitOpen] = useState(false);
  const [splitSourceId, setSplitSourceId] = useState("");
  const [splitChildren, setSplitChildren] = useState<{ display_name: string; primary_uom_qty: string; pieces: string }[]>([
    { display_name: "", primary_uom_qty: "", pieces: "0" },
  ]);

  type FromLotParcelDraft = {
    key: string;
    purchase_lot_line_id: string;
    display_name: string;
    primary_uom_qty: string;
    pieces: string;
    public_code: string;
  };
  const [fromLotOpen, setFromLotOpen] = useState(false);
  const [lotSummaries, setLotSummaries] = useState<PurchaseLotSummary[]>([]);
  const [lotSummariesError, setLotSummariesError] = useState<string | null>(null);
  const [selectedLotCode, setSelectedLotCode] = useState("");
  const [lotDetail, setLotDetail] = useState<PurchaseLotDetail | null>(null);
  const [lotDetailLoading, setLotDetailLoading] = useState(false);
  const [fromLotItemTypeId, setFromLotItemTypeId] = useState("");
  const [fromLotPrimaryUomCode, setFromLotPrimaryUomCode] = useState("ct");
  const [fromLotParcels, setFromLotParcels] = useState<FromLotParcelDraft[]>([]);

  const defaultTypeId = useMemo(() => types.find((x) => x.code === "rough")?.id ?? types[0]?.id ?? "", [types]);

  useEffect(() => {
    if (form.item_type_id === "" && defaultTypeId) setForm((f) => ({ ...f, item_type_id: defaultTypeId }));
  }, [defaultTypeId, form.item_type_id]);

  useEffect(() => {
    if (!fromLotOpen || !authed) return;
    setLotSummariesError(null);
    let cancelled = false;
    void listPurchaseLotSummaries()
      .then((rows) => {
        if (!cancelled) setLotSummaries(rows);
      })
      .catch((e) => {
        if (!cancelled) setLotSummariesError(e instanceof Error ? e.message : "Could not load lots.");
      });
    return () => {
      cancelled = true;
    };
  }, [fromLotOpen, authed]);

  useEffect(() => {
    if (!fromLotOpen || !selectedLotCode.trim()) {
      setLotDetail(null);
      return;
    }
    let cancelled = false;
    setLotDetailLoading(true);
    void getPurchaseLotByCode(selectedLotCode.trim())
      .then((d) => {
        if (!cancelled) setLotDetail(d);
      })
      .catch(() => {
        if (!cancelled) {
          setLotDetail(null);
          pushToast("Could not load that lot. Check the lot code or sign in again.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLotDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromLotOpen, selectedLotCode, pushToast]);

  useEffect(() => {
    if (!fromLotOpen) return;
    if (!fromLotItemTypeId && defaultTypeId) setFromLotItemTypeId(defaultTypeId);
  }, [fromLotOpen, fromLotItemTypeId, defaultTypeId]);

  function appendParcelFromLine(lineId: string, itemName: string, linePieces: number) {
    setFromLotParcels((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        purchase_lot_line_id: lineId,
        display_name: itemName,
        primary_uom_qty: "",
        pieces: String(linePieces ?? 0),
        public_code: "",
      },
    ]);
  }

  async function submitFromLot() {
    if (!lotDetail) {
      pushToast("Select a purchase lot and wait for it to load.", "error");
      return;
    }
    if (!fromLotItemTypeId) {
      pushToast("Pick an inventory item type (e.g. rough).", "error");
      return;
    }
    const parcels = fromLotParcels
      .map((p) => ({
        purchase_lot_line_id: p.purchase_lot_line_id,
        display_name: p.display_name.trim(),
        public_code: p.public_code.trim(),
        primary_uom_qty: p.primary_uom_qty.trim(),
        pieces: Number.parseInt(p.pieces, 10) || 0,
      }))
      .filter((p) => p.display_name && p.purchase_lot_line_id && Number(p.primary_uom_qty) > 0);
    if (!parcels.length) {
      pushToast("Add at least one parcel from a lot line (button on each line), then enter UOM quantity for each row.", "error");
      return;
    }
    setLoading(true);
    try {
      await createStockUnitsFromPurchaseLot({
        purchase_lot_id: lotDetail.id,
        item_type_id: fromLotItemTypeId,
        primary_uom_code: fromLotPrimaryUomCode.trim() || "ct",
        parcels: parcels.map((p) => ({
          purchase_lot_line_id: p.purchase_lot_line_id,
          display_name: p.display_name,
          primary_uom_qty: p.primary_uom_qty,
          pieces: p.pieces,
          ...(p.public_code ? { public_code: p.public_code } : {}),
        })),
        client_ref: `ui-from-lot-${Date.now()}`,
      });
      setFromLotOpen(false);
      setSelectedLotCode("");
      setLotDetail(null);
      setFromLotParcels([]);
      await loadAll();
      pushToast("Parcels were created from the lot and appear in your stock list.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Receive from lot failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function submitNew() {
    if (!form.display_name.trim() || !form.item_type_id) {
      pushToast("Name and item type are required.", "error");
      return;
    }
    setLoading(true);
    try {
      await createStockUnit({
        display_name: form.display_name.trim(),
        public_code: form.public_code.trim(),
        item_type_id: form.item_type_id,
        primary_uom_qty: form.primary_uom_qty.trim() || "0",
        primary_uom_code: form.primary_uom_code.trim() || "ct",
        pieces: Number.parseInt(form.pieces, 10) || 0,
        cost_basis_total: form.cost_basis_total.trim() || "0",
        list_price_per_uom: form.list_price_per_uom.trim() || null,
        notes: form.notes.trim(),
      });
      setNewOpen(false);
      setWizardStep(0);
      setForm({
        item_type_id: defaultTypeId,
        display_name: "",
        public_code: "",
        primary_uom_qty: "",
        primary_uom_code: "ct",
        pieces: "0",
        cost_basis_total: "",
        list_price_per_uom: "",
        notes: "",
      });
      await loadAll();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function submitSplit() {
    if (!splitSourceId) {
      pushToast("Select a source stock line.", "error");
      return;
    }
    const children = splitChildren
      .map((c) => ({
        display_name: c.display_name.trim(),
        primary_uom_qty: c.primary_uom_qty.trim(),
        pieces: Number.parseInt(c.pieces, 10) || 0,
      }))
      .filter((c) => c.display_name && c.primary_uom_qty && Number(c.primary_uom_qty) > 0);
    if (!children.length) {
      pushToast("Add at least one child with name and UOM qty.", "error");
      return;
    }
    setLoading(true);
    try {
      await splitStockUnits({
        source_unit_id: splitSourceId,
        children: children.map((c) => ({
          display_name: c.display_name,
          primary_uom_qty: c.primary_uom_qty,
          pieces: c.pieces,
        })),
      });
      setSplitOpen(false);
      setSplitSourceId("");
      setSplitChildren([{ display_name: "", primary_uom_qty: "", pieces: "0" }]);
      await loadAll();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Split failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function onImportLocal() {
    setLoading(true);
    try {
      await importStockFromLocalCache();
      await loadAll();
      pushToast("Imported stock rows from browser cache into the server.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Import failed", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!clientReady) {
    return (
      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-8 text-center text-sm text-[var(--gs-muted)]">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-8 text-center text-sm text-[var(--gs-muted)]">
        Sign in to load inventory from the server.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {tab === "items" ? (
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["stock", "Stock transactions"],
              ["reports", "Inventory reports"],
              ["audit", "Audit / Stock count"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {tab !== "items" ? (
        <div className="flex flex-wrap gap-1 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-2 shadow-sm sm:p-3">
          {(
            [
              ["items", "Items"],
              ["stock", "Stock transactions"],
              ["reports", "Inventory reports"],
              ["audit", "Audit / Stock count"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                tab === id ? "bg-[var(--gs-accent)] text-white" : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {tab === "items" && (
        <section className="w-full rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
          <div className="border-b border-[var(--gs-border)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--gs-text)]">Items (server)</h2>
                <p className="mt-1 text-xs text-[var(--gs-muted)]">
                  Stock and services live on the server. <span className="font-medium text-[var(--gs-text)]">Receive from lot</span> turns purchase lot lines into
                  parcels; <span className="font-medium text-[var(--gs-text)]">Split parcel</span> breaks one existing stock line into children.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-1">
                  <button
                    type="button"
                    onClick={() => setScope("stock")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "stock" ? "bg-[var(--gs-accent)] text-white" : ""}`}
                  >
                    Stock items
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("services")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${scope === "services" ? "bg-[var(--gs-accent)] text-white" : ""}`}
                  >
                    Service catalog
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAll()}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
                {scope === "stock" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onImportLocal()}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Import from browser cache
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFromLotOpen(true);
                        setSelectedLotCode("");
                        setLotDetail(null);
                        setFromLotParcels([]);
                        setLotSummariesError(null);
                        setFromLotItemTypeId(defaultTypeId);
                        setFromLotPrimaryUomCode("ct");
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold"
                    >
                      <Package className="h-3.5 w-3.5" />
                      Receive from lot
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSplitOpen(true);
                        setSplitSourceId("");
                        setSplitChildren([{ display_name: "", primary_uom_qty: "", pieces: "0" }]);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold"
                    >
                      <Table className="h-3.5 w-3.5" />
                      Split parcel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewOpen(true);
                        setWizardStep(0);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--gs-accent)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New item
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void (async () => {
                        const name = await prompt({
                          title: "New service",
                          message: "Enter a name for the service.",
                          label: "Service name",
                          submitLabel: "Create",
                        });
                        if (!name?.trim()) return;
                        try {
                          await createService({
                            name: name.trim(),
                            billing_unit_label: "Each",
                            default_rate: "0",
                          });
                          await loadAll();
                        } catch (e) {
                          pushToast(e instanceof Error ? e.message : "Failed", "error");
                        }
                      })()
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--gs-accent)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New service
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto px-3 pb-5 sm:px-5">
            {loading && !units.length && !services.length ? (
              <p className="py-8 text-center text-sm text-[var(--gs-muted)]">Loading…</p>
            ) : scope === "services" ? (
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">
                  <tr>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Unit</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gs-border)]">
                  {services.map((s) => (
                    <tr key={s.id}>
                      <td className="px-2 py-2 font-medium">{s.name}</td>
                      <td className="px-2 py-2 text-[var(--gs-muted)]">{s.billing_unit_label || "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{s.default_rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">
                  <tr>
                    <th className="px-2 py-2">Code</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2 text-right">UOM</th>
                    <th className="px-2 py-2 text-right">Pieces</th>
                    <th className="px-2 py-2 text-right">Cost basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gs-border)]">
                  {units.map((u) => (
                    <tr key={u.id}>
                      <td className="px-2 py-2 font-mono text-xs">{u.public_code || "—"}</td>
                      <td className="px-2 py-2">{u.display_name}</td>
                      <td className="px-2 py-2 text-[var(--gs-muted)]">{u.item_type_label}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {u.primary_uom_qty} {u.primary_uom_code}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{u.pieces}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{u.cost_basis_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {tab === "stock" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/lots"
            className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm hover:border-[var(--gs-accent)]"
          >
            <p className="font-bold">Purchase lots</p>
            <p className="mt-2 text-sm text-[var(--gs-muted)]">Receive rough against vendor lots, then create stock from a lot via API.</p>
          </Link>
          <div className="rounded-2xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-5 text-sm text-[var(--gs-muted)]">
            Transfer and adjustment dialogs can call <code className="text-xs">POST /inv/stock-units/transfer</code> and{" "}
            <code className="text-xs">POST /inv/stock-units/{"{id}"}/movements</code>.
          </div>
        </section>
      )}

      {tab === "reports" && !summary ? (
        <p className="py-8 text-center text-sm text-[var(--gs-muted)]">Loading reports…</p>
      ) : null}
      {tab === "reports" && summary ? (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm">
          <h2 className="text-lg font-bold">Summary (server)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--gs-border)] p-4">
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Lines</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{summary.stock_line_count}</p>
            </div>
            <div className="rounded-xl border border-[var(--gs-border)] p-4">
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Total UOM</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{summary.total_primary_uom_qty}</p>
            </div>
            <div className="rounded-xl border border-[var(--gs-border)] p-4">
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Pieces</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{summary.total_pieces}</p>
            </div>
            <div className="rounded-xl border border-[var(--gs-border)] p-4">
              <p className="text-[10px] font-bold uppercase text-[var(--gs-muted)]">Cost basis</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {summary.total_cost_basis} {summary.functional_currency}
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold">By type</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {byType.map((r) => (
                  <li key={r.item_type_id} className="flex justify-between">
                    <span>{r.item_type_label}</span>
                    <span className="tabular-nums text-[var(--gs-muted)]">{r.line_count} · {r.total_cost_basis}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold">By custodian</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {byCust.map((r, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{r.custodian_user_id ?? "Unassigned"}</span>
                    <span className="tabular-nums text-[var(--gs-muted)]">{r.line_count} · {r.total_cost_basis}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "audit" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[var(--gs-muted)]">
              <ClipboardCheck className="h-5 w-5 shrink-0" />
              <span>Snapshot current stock lines into an audit session (counts only).</span>
            </div>
            <button
              type="button"
              onClick={() =>
                void (async () => {
                  try {
                    await createAuditSession({
                      note: "Quick snapshot",
                      lines: units.map((u) => ({
                        stock_unit_id: u.id,
                        physical_qty: u.primary_uom_qty,
                        verified: false,
                      })),
                    });
                    pushToast("Audit session created.", "success");
                  } catch (e) {
                    pushToast(e instanceof Error ? e.message : "Failed", "error");
                  }
                })()
              }
              className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white"
            >
              Start audit from current stock
            </button>
          </div>
        </section>
      )}

      {newOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-xl">
            <h3 className="text-lg font-bold">New stock item</h3>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">Step {wizardStep + 1} of 3</p>
            {wizardStep === 0 ? (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Item type</label>
                <select
                  value={form.item_type_id}
                  onChange={(e) => setForm((f) => ({ ...f, item_type_id: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Display name</label>
                <input
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Public code (optional)</label>
                <input
                  value={form.public_code}
                  onChange={(e) => setForm((f) => ({ ...f, public_code: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
              </div>
            ) : null}
            {wizardStep === 1 ? (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">UOM quantity</label>
                <input
                  value={form.primary_uom_qty}
                  onChange={(e) => setForm((f) => ({ ...f, primary_uom_qty: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">UOM code</label>
                <input
                  value={form.primary_uom_code}
                  onChange={(e) => setForm((f) => ({ ...f, primary_uom_code: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Pieces</label>
                <input
                  value={form.pieces}
                  onChange={(e) => setForm((f) => ({ ...f, pieces: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Cost basis total</label>
                <input
                  value={form.cost_basis_total}
                  onChange={(e) => setForm((f) => ({ ...f, cost_basis_total: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">List price / UOM (optional)</label>
                <input
                  value={form.list_price_per_uom}
                  onChange={(e) => setForm((f) => ({ ...f, list_price_per_uom: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
              </div>
            ) : null}
            {wizardStep === 2 ? (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
              </div>
            ) : null}
            <div className="mt-6 flex justify-between gap-2">
              <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => setNewOpen(false)}>
                Cancel
              </button>
              <div className="flex gap-2">
                {wizardStep > 0 ? (
                  <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => setWizardStep((s) => s - 1)}>
                    Back
                  </button>
                ) : null}
                {wizardStep < 2 ? (
                  <button
                    type="button"
                    className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => setWizardStep((s) => s + 1)}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => void submitNew()}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {splitOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-xl">
            <h3 className="text-lg font-bold">Split existing stock line</h3>
            <p className="mt-2 text-sm text-[var(--gs-muted)]">
              Use this when a <span className="font-medium text-[var(--gs-text)]">parcel is already in inventory</span> and you want to break it into smaller stock
              lines. To create parcels <span className="font-medium text-[var(--gs-text)]">from a vendor lot</span>, use{" "}
              <span className="font-medium text-[var(--gs-text)]">Receive from lot</span> on the main screen. Purchase lots are under{" "}
              <Link href="/lots" className="font-semibold text-[var(--gs-accent)] hover:underline">
                Lots
              </Link>
              .
            </p>
            <label className="mt-4 block text-xs font-bold uppercase text-[var(--gs-muted)]">Stock line to split</label>
            <select
              value={splitSourceId}
              onChange={(e) => setSplitSourceId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
            >
              <option value="">{units.length ? "Select a line…" : "No stock lines loaded"}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {stockUnitSplitLabel(u)}
                </option>
              ))}
            </select>
            {!units.length ? (
              <p className="mt-2 text-xs text-[var(--gs-muted)]">
                No stock lines yet — use <span className="font-medium text-[var(--gs-text)]">Receive from lot</span>, <span className="font-medium text-[var(--gs-text)]">New item</span>, or import.
              </p>
            ) : null}
            {splitChildren.map((c, idx) => (
              <div key={idx} className="mt-4 grid gap-2 border-t border-[var(--gs-border)] pt-4 sm:grid-cols-3">
                <input
                  placeholder="Child name"
                  value={c.display_name}
                  onChange={(e) => {
                    const next = [...splitChildren];
                    next[idx] = { ...next[idx], display_name: e.target.value };
                    setSplitChildren(next);
                  }}
                  className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
                <input
                  placeholder="UOM qty"
                  value={c.primary_uom_qty}
                  onChange={(e) => {
                    const next = [...splitChildren];
                    next[idx] = { ...next[idx], primary_uom_qty: e.target.value };
                    setSplitChildren(next);
                  }}
                  className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
                <input
                  placeholder="Pieces"
                  value={c.pieces}
                  onChange={(e) => {
                    const next = [...splitChildren];
                    next[idx] = { ...next[idx], pieces: e.target.value };
                    setSplitChildren(next);
                  }}
                  className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--gs-accent)]"
              onClick={() => setSplitChildren((s) => [...s, { display_name: "", primary_uom_qty: "", pieces: "0" }])}
            >
              + Add child row
            </button>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={() => setSplitOpen(false)}>
                Cancel
              </button>
              <button type="button" className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white" onClick={() => void submitSplit()}>
                Split
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {fromLotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-xl">
            <h3 className="text-lg font-bold">Receive parcels from purchase lot</h3>
            <p className="mt-2 text-sm text-[var(--gs-muted)]">
              Choose a lot you already recorded under{" "}
              <Link href="/lots" className="font-semibold text-[var(--gs-accent)] hover:underline">
                Lots
              </Link>
              . Each parcel row is one inventory stock line tied to a lot line. Quantities cannot exceed what is still available on that line (the server checks
              this).
            </p>

            <label className="mt-4 block text-xs font-bold uppercase text-[var(--gs-muted)]">Purchase lot</label>
            <select
              value={selectedLotCode}
              onChange={(e) => {
                setSelectedLotCode(e.target.value);
                setFromLotParcels([]);
              }}
              className="mt-1 w-full max-w-xl rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
            >
              <option value="">{lotSummaries.length ? "Select a lot…" : "No lots returned from server"}</option>
              {lotSummaries.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.code} · {s.supplier} · {s.date_iso}
                </option>
              ))}
            </select>
            {lotSummariesError ? <p className="mt-2 text-xs text-red-600">{lotSummariesError}</p> : null}
            {!lotSummariesError && fromLotOpen && !lotSummaries.length ? (
              <p className="mt-2 text-xs text-[var(--gs-muted)]">
                No purchase lots found.{" "}
                <Link href="/lots/new" className="font-semibold text-[var(--gs-accent)] hover:underline">
                  Create a lot
                </Link>{" "}
                first, then return here.
              </p>
            ) : null}

            {selectedLotCode ? (
              <div className="mt-4">
                {lotDetailLoading ? (
                  <p className="text-sm text-[var(--gs-muted)]">Loading lot lines…</p>
                ) : lotDetail ? (
                  <>
                    <p className="text-sm font-medium text-[var(--gs-text)]">
                      Lot {lotDetail.lot_code} · {lotDetail.vendor_name}
                    </p>
                    <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--gs-border)]">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="border-b border-[var(--gs-border)] text-[10px] font-bold uppercase text-[var(--gs-muted)]">
                          <tr>
                            <th className="px-3 py-2">Line item</th>
                            <th className="px-3 py-2 text-right">Qty on lot</th>
                            <th className="px-3 py-2">UOM</th>
                            <th className="px-3 py-2 text-right">Pieces</th>
                            <th className="px-3 py-2 text-right"> </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--gs-border)]">
                          {lotDetail.lines.map((ln) => (
                            <tr key={ln.id}>
                              <td className="px-3 py-2">{ln.item_name}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{ln.quantity}</td>
                              <td className="px-3 py-2 text-[var(--gs-muted)]">{ln.uom}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{ln.pieces}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-[var(--gs-accent)] hover:underline"
                                  onClick={() => appendParcelFromLine(ln.id, ln.item_name, ln.pieces)}
                                >
                                  Add parcel
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--gs-muted)]">Could not show lines for this lot.</p>
                )}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Inventory item type</label>
                <select
                  value={fromLotItemTypeId}
                  onChange={(e) => setFromLotItemTypeId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                >
                  <option value="">{types.length ? "Select…" : "Loading types…"}</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Primary UOM code (parcels)</label>
                <input
                  value={fromLotPrimaryUomCode}
                  onChange={(e) => setFromLotPrimaryUomCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  placeholder="ct"
                />
              </div>
            </div>

            <h4 className="mt-6 text-xs font-bold uppercase text-[var(--gs-muted)]">Parcel rows (sent to server)</h4>
            {fromLotParcels.length === 0 ? (
              <p className="mt-1 text-sm text-[var(--gs-muted)]">Click “Add parcel” on a line above, then enter how much UOM you are receiving on each row.</p>
            ) : (
              <div className="mt-2 space-y-3">
                {fromLotParcels.map((p) => {
                  const lotLine = lotDetail?.lines.find((l) => l.id === p.purchase_lot_line_id);
                  return (
                    <div key={p.key} className="space-y-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-[var(--gs-muted)]">
                          Lot line: <span className="font-medium text-[var(--gs-text)]">{lotLine?.item_name ?? "—"}</span>
                        </p>
                        <button
                          type="button"
                          className="rounded-full border border-[var(--gs-border)] px-3 py-1 text-xs font-semibold"
                          onClick={() => setFromLotParcels((rows) => rows.filter((r) => r.key !== p.key))}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          placeholder="Parcel display name"
                          value={p.display_name}
                          onChange={(e) =>
                            setFromLotParcels((rows) =>
                              rows.map((r) => (r.key === p.key ? { ...r, display_name: e.target.value } : r)),
                            )
                          }
                          className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm sm:col-span-2"
                        />
                        <input
                          placeholder="UOM qty to receive"
                          value={p.primary_uom_qty}
                          onChange={(e) =>
                            setFromLotParcels((rows) =>
                              rows.map((r) => (r.key === p.key ? { ...r, primary_uom_qty: e.target.value } : r)),
                            )
                          }
                          className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="Pieces"
                          value={p.pieces}
                          onChange={(e) =>
                            setFromLotParcels((rows) => rows.map((r) => (r.key === p.key ? { ...r, pieces: e.target.value } : r)))
                          }
                          className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="Public code (optional)"
                          value={p.public_code}
                          onChange={(e) =>
                            setFromLotParcels((rows) =>
                              rows.map((r) => (r.key === p.key ? { ...r, public_code: e.target.value } : r)),
                            )
                          }
                          className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm sm:col-span-2"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border px-4 py-2 text-sm"
                onClick={() => {
                  setFromLotOpen(false);
                  setSelectedLotCode("");
                  setLotDetail(null);
                  setFromLotParcels([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void submitFromLot()}
              >
                Create parcels on server
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
