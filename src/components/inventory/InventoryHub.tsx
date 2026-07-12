"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Import,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  SquareSplitHorizontal,
  Trash2,
  X,
  Sheet,
  Table,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { DEMO_REVENUE_ACCOUNTS, revenueAccountLabel } from "@/lib/demoRevenueAccounts";
import { loadItemCatalog, saveItemCatalog, type StoredItemRow } from "@/lib/itemCatalogStorage";
import { clearInventoryLocalStorageKeys, isInventoryGuestMode } from "@/lib/inventoryLocalPersistence";
import { getAccessToken } from "@/lib/authClient";
import {
  fetchRoughLotPickerOptions,
  getPurchaseLotByCode,
  listPurchaseLotSummaries,
  type PurchaseLotDetail,
  type PurchaseLotSummary,
} from "@/lib/purchaseLotsApi";
import { ROUGH_LOTS_SEED } from "@/lib/roughLotsSeed";

import {
  defaultStandardFieldRules,
  INVENTORY_STANDARD_FIELD_CATALOG,
  mergeStandardFields,
  resolveStandardFieldRule,
  type BuiltinStandardFieldId,
  type StandardFieldRule,
} from "@/components/inventory/inventoryFormFieldCatalog";
import {
  fieldPresetForKind,
  getInventoryTypeUiMode,
  isBuiltinKind,
  KIND_CUT,
  KIND_ROUGH,
  kindLabel,
  newFieldId,
  type CustomFieldDef,
  type CustomInventoryType,
  type ItemKindKey,
  uomHintForKind,
  type UomTab,
} from "@/components/inventory/inventoryItemTypes";
import type { ItemLineEntryType, ItemRow } from "@/components/inventory/inventoryHubTypes";
import { loadInventoryHubServerSnapshot } from "@/lib/inventoryHubDataBridge";
import {
  buildBreakIntoPiecesSplitChildren,
  createStockWithOptionalSellablePieces,
  isRootStockCatalogRow,
  sellableChildrenForParent,
} from "@/lib/inventoryHubSellable";
import {
  catalogShouldLoadFromServer,
  inventorySplitAllowed,
  inventoryWritesAllowed,
  isServerUuid,
  patchStockFromItemForm,
  persistCustomInventoryType,
  resolveLocationAndCustodian,
} from "@/lib/inventoryHubInventoryApi";
import type {
  InvAuditSessionDto,
  InvCustodianDto,
  InvInventoryFeatureFlags,
  InvItemTypeDto,
  InvLineageDto,
  InvLocationDto,
  InvLotBalanceDto,
  InvLotVarianceReason,
  InvStockMovementDto,
  InvStockUnitDto,
} from "@/lib/invApi";
import {
  adjustStockUnitWeight,
  autoSplitLotLine,
  closeAuditSession,
  createAuditSession,
  createCustodian,
  createLocation,
  createService,
  createStockUnitsFromPurchaseLot,
  cutStockUnit,
  customSplitLotLine,
  fetchAuditSessions,
  fetchCustodians,
  fetchLocations,
  fetchInventoryFeatureFlags,
  updateCustodian,
  updateLocation,
  fetchItemTypes,
  fetchLotBalance,
  fetchReportByCustodian,
  fetchReportByType,
  fetchReportSummary,
  fetchStockUnitLineage,
  fetchStockUnitMovements,
  fetchStockUnitQrPng,
  fetchStockUnitLabelPdf,
  fetchStockUnitLabelsBatchPdf,
  freezeStockUnit,
  patchStockUnit,
  rebalanceStockUnits,
  recordStockLoss,
  splitStockUnits,
  transferStockUnits,
  unfreezeStockUnit,
  updateItemType,
  updateService,
  voidStockUnit,
} from "@/lib/invApi";

type Tab = "items" | "stock" | "reports" | "audit";

const VALID_INVENTORY_TABS = new Set<Tab>(["items", "stock", "reports", "audit"]);

type ReportSubTab = "overview" | "analysis" | "custodian" | "typewise" | "itemname";

type AuditLineSnap = {
  itemId: string;
  itemNo: string;
  itemName: string;
  itemKind: string;
  location: string;
  custodian: string;
  systemUom: number;
  systemPieces: number;
  physicalUom: number | null;
  verified: boolean;
  variance: number | null;
};

type AuditRecord = {
  id: string;
  createdAt: string;
  note: string;
  lines: AuditLineSnap[];
};

// Inventory is backend-only; guest/localStorage mode is permanently off (see
// inventoryLocalPersistence.ts). These remain as no-op stubs so legacy call sites
// keep working without ever touching localStorage.
function loadAuditRecords(): AuditRecord[] {
  return [];
}

function persistAuditRecords(_records: AuditRecord[]) {}

function loadAuditClosedIds(): Set<string> {
  return new Set();
}

function persistAuditClosedIds(_ids: Set<string>) {}

const ADD_NEW_TYPE_VALUE = "__add_new_type__";

function loadCustomLocations(): string[] {
  return [];
}

function persistCustomLocations(_locations: string[]) {}

function loadCustomCustodians(): string[] {
  return [];
}

function persistCustomCustodians(_names: string[]) {}

function loadHiddenLocationPresets(): string[] {
  return [];
}

function persistHiddenLocationPresets(_names: string[]) {}

function loadHiddenCustodianPresets(): string[] {
  return [];
}

function persistHiddenCustodianPresets(_names: string[]) {}

const LINEAGE_TREE_STEP_PX = 14;

function lineageIdMap(data: InvLineageDto): Map<string, InvStockUnitDto> {
  const m = new Map<string, InvStockUnitDto>();
  m.set(data.unit.id, data.unit);
  for (const u of data.ancestors) m.set(u.id, u);
  for (const u of data.children) m.set(u.id, u);
  for (const u of data.descendants) m.set(u.id, u);
  return m;
}

/** Number of parent hops from ``unitId`` down until the focal unit is reached. */
function stepsDownToFocal(unitId: string, focalId: string, byId: Map<string, InvStockUnitDto>): number {
  let steps = 0;
  let cur = byId.get(unitId);
  while (cur && cur.id !== focalId) {
    if (!cur.parent_unit_id) return steps;
    const p = byId.get(cur.parent_unit_id);
    if (!p) return steps;
    cur = p;
    steps += 1;
  }
  return steps;
}

const GRADE_OPTIONS = ["AAA", "AA", "A", "B", "C", "Commercial", ""] as const;

type AddTypeSpecMode = "rough" | "cut" | "builder";

/** Default grade options pre-filled when a custom type starts from the Rough template. */
const ROUGH_TEMPLATE_GRADES = ["AAA", "AA", "A", "B", "C", "Commercial"];

/**
 * Starting attribute fields for a chosen style. Every custom type is field-driven:
 * Rough seeds a Grade dropdown, Cut seeds Length/Width/Height, Custom starts blank.
 * The user can freely edit, add, or remove any field afterwards.
 */
function builderTemplateForStyle(style: AddTypeSpecMode): CustomFieldDef[] {
  if (style === "rough") {
    return [
      { id: newFieldId(), label: "Grade", kind: "dropdown", options: [...ROUGH_TEMPLATE_GRADES], required: true, visible: true },
    ];
  }
  if (style === "cut") {
    return [
      { id: newFieldId(), label: "Length", kind: "number", required: true, visible: true },
      { id: newFieldId(), label: "Width", kind: "number", required: true, visible: true },
      { id: newFieldId(), label: "Height", kind: "number", required: true, visible: true },
    ];
  }
  return [{ id: newFieldId(), label: "Field 1", kind: "text", required: true, visible: true }];
}

/** Turn a human label into a stable, readable attribute key (e.g. "Carat Weight" -> "carat_weight"). */
function slugifyFieldKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return base || "field";
}

/** Assign readable, unique slug ids to builder fields so persisted keys match the JSON schema. */
function assignBuilderFieldSlugs(fields: CustomFieldDef[]): CustomFieldDef[] {
  const used = new Set<string>();
  return fields.map((f) => {
    const root = slugifyFieldKey(f.label);
    let key = root;
    let n = 2;
    while (used.has(key)) {
      key = `${root}_${n}`;
      n += 1;
    }
    used.add(key);
    return { ...f, id: key };
  });
}

/** Best-effort detection of which style a saved custom type started from (for re-highlighting on edit). */
function detectSpecStyleFromFields(fields: CustomFieldDef[] | undefined): AddTypeSpecMode {
  if (!fields || fields.length === 0) return "builder";
  if (fields.length === 1 && fields[0].kind === "dropdown" && slugifyFieldKey(fields[0].label) === "grade") {
    return "rough";
  }
  const keys = fields.map((f) => slugifyFieldKey(f.label));
  const isCut =
    fields.length === 3 &&
    fields.every((f) => f.kind === "number") &&
    ["length", "width", "height"].every((k) => keys.includes(k));
  if (isCut) return "cut";
  return "builder";
}

type SplitDraftRow = {
  id: string;
  itemName: string;
  uom: string;
  pieces: string;
  rate: string;
};

const INITIAL_ITEMS: ItemRow[] = [
  {
    id: "i1",
    entryType: "inventory",
    imageDataUrl: null,
    itemNo: "S-EM",
    date: "2025-11-01",
    itemName: "Emerald parcel",
    itemKind: KIND_ROUGH,
    type: "Product",
    grade: "AA",
    dimLength: "",
    dimWidth: "",
    dimHeight: "",
    uom: 18.2,
    pieces: 42,
    rate: 1250,
    location: "Vault A",
    custodian: "J. Smith",
    details: "Mixed sizes; stored in sealed bag.",
    customFieldValuesJson: "{}",
    serviceUnit: "",
    revenueAccountId: "",
    linkedRoughLotCode: "",
  },
  {
    id: "i2",
    entryType: "service",
    imageDataUrl: null,
    itemNo: "",
    date: "2025-10-15",
    itemName: "Appraisal service",
    itemKind: KIND_ROUGH,
    type: "Service",
    grade: "",
    dimLength: "",
    dimWidth: "",
    dimHeight: "",
    uom: 1,
    pieces: 1,
    rate: 150,
    location: "",
    custodian: "",
    details: "Per-stone appraisal retainer.",
    customFieldValuesJson: "{}",
    serviceUnit: "Hours",
    revenueAccountId: "8",
    linkedRoughLotCode: "",
  },
  {
    id: "i3",
    entryType: "inventory",
    imageDataUrl: null,
    itemNo: "R-RO",
    date: "2025-12-02",
    itemName: "Rough sapphire lot",
    itemKind: KIND_ROUGH,
    type: "Raw",
    grade: "B",
    dimLength: "",
    dimWidth: "",
    dimHeight: "",
    uom: 240,
    pieces: 120,
    rate: 45,
    location: "Rough room",
    custodian: "M. Lee",
    details: "Bulk rough; sort before cutting.",
    customFieldValuesJson: "{}",
    serviceUnit: "",
    revenueAccountId: "",
    linkedRoughLotCode: "LO-09",
  },
  {
    id: "i4",
    entryType: "inventory",
    imageDataUrl: null,
    itemNo: "C-X1",
    date: "2026-01-10",
    itemName: "Cut stone parcel",
    itemKind: KIND_CUT,
    type: "Product",
    grade: "",
    dimLength: "4.2",
    dimWidth: "3.1",
    dimHeight: "2.0",
    uom: 5,
    pieces: 10,
    rate: 200,
    location: "Vault B",
    custodian: "J. Smith",
    details: "Cut; dimensions in mm.",
    customFieldValuesJson: "{}",
    serviceUnit: "",
    revenueAccountId: "",
    linkedRoughLotCode: "",
  },
];

/** Preset storage locations; merged with any locations found on items */
const ALL_LOCATIONS = [
  "Vault A",
  "Vault B",
  "Vault C",
  "Office",
  "Rough room",
  "Cutting lab",
  "Showcase",
  "Safe",
  "Workshop",
  "Sorting table",
] as const;

/** Preset custodians; merged with names found on items */
const ALL_CUSTODIANS = [
  "J. Smith",
  "M. Lee",
  "Front desk",
  "Vault team",
  "Receiving",
  "Sales floor",
] as const;

const IMPORT_ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDims(r: ItemRow): string {
  if (r.dimLength === "" && r.dimWidth === "" && r.dimHeight === "") return "";
  return [r.dimLength, r.dimWidth, r.dimHeight].filter((x) => x && x !== "").join(" × ") || "";
}

function parseCustomFieldValues(json: string): Record<string, string> {
  try {
    const o = JSON.parse(json || "{}") as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, string>;
  } catch {
    /* ignore */
  }
  return {};
}

function formatSpecCell(r: ItemRow, customTypes: readonly CustomInventoryType[]): string {
  if (r.entryType === "service") return "";
  const mode = getInventoryTypeUiMode(r.itemKind, customTypes);
  if (mode === "rough") return r.grade;
  if (mode === "cut") return formatDims(r);
  const t = customTypes.find((x) => x.id === r.itemKind);
  const vals = parseCustomFieldValues(r.customFieldValuesJson);
  if (t?.builderFields?.length) {
    const visible = t.builderFields.filter((f) => f.visible !== false);
    const parts = visible.map((f) => `${f.label}: ${vals[f.id]?.trim() || ""}`);
    return parts.join(" · ") || "";
  }
  return fieldPresetForKind(r.itemKind, customTypes) === KIND_ROUGH ? r.grade : formatDims(r);
}

function inventoryStockAmount(
  itemKind: ItemKindKey,
  uom: number,
  pieces: number,
  rate: number,
  customTypes: readonly CustomInventoryType[],
): number {
  if (!Number.isFinite(rate) || rate < 0) return 0;
  if (isBuiltinKind(itemKind)) {
    const u = Number.isFinite(uom) && uom >= 0 ? uom : 0;
    return u * rate;
  }
  const customStd = customTypes.find((t) => t.id === itemKind)?.standardFields;
  const rUom = resolveStandardFieldRule("uomQty", customStd);
  const rPieces = resolveStandardFieldRule("pieces", customStd);
  if (!rUom.enabled) {
    const p = Number.isFinite(pieces) && pieces >= 0 ? Math.floor(pieces) : 0;
    return rPieces.enabled ? p * rate : rate;
  }
  const u = Number.isFinite(uom) && uom >= 0 ? uom : 0;
  return u * rate;
}

function lineAmount(r: ItemRow, customTypes: readonly CustomInventoryType[]): number {
  if (r.entryType === "service") return r.rate;
  return inventoryStockAmount(r.itemKind, r.uom, r.pieces, r.rate, customTypes);
}

/** Quantity used in reports when UOM is off (pieces) vs on (UOM). */
function inventoryPrimaryQty(r: ItemRow, customTypes: readonly CustomInventoryType[]): number {
  if (r.entryType === "service") return 0;
  if (isBuiltinKind(r.itemKind)) return r.uom;
  const customStd = customTypes.find((t) => t.id === r.itemKind)?.standardFields;
  const rUom = resolveStandardFieldRule("uomQty", customStd);
  if (!rUom.enabled) return r.pieces;
  return r.uom;
}

function rowsToCsv(data: ItemRow[], customTypes: readonly CustomInventoryType[]): string {
  const headers = [
    "Line type",
    "Item #",
    "Date",
    "Item Name",
    "Item kind",
    "Type",
    "Grade",
    "Dimensions (L×W×H)",
    "UOM qty",
    "Pieces",
    "Rate",
    "Amount",
    "Location",
    "Custodian",
    "Details",
    "Type attributes (JSON)",
    "Service unit",
    "Revenue account",
    "Has image",
    "Linked rough lot",
  ];
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...data.map((r) => {
      const amt = lineAmount(r, customTypes);
      return [
        r.entryType,
        esc(r.itemNo),
        esc(r.date),
        esc(r.itemName),
        esc(r.itemKind),
        r.type,
        esc(r.grade),
        esc(formatDims(r)),
        String(r.uom),
        String(r.pieces),
        String(r.rate),
        String(amt),
        esc(r.location),
        esc(r.custodian),
        esc(r.details),
        esc(r.customFieldValuesJson || "{}"),
        esc(r.serviceUnit),
        esc(revenueAccountLabel(r.revenueAccountId)),
        r.imageDataUrl ? "yes" : "no",
        esc(r.linkedRoughLotCode ?? ""),
      ].join(",");
    }),
  ];
  return lines.join("\n");
}

function ItemsImportExportMenu({
  rows,
  customTypes,
  onImportFiles,
}: {
  rows: ItemRow[];
  customTypes: readonly CustomInventoryType[];
  onImportFiles: (files: FileList | null) => void;
}) {
  const { pushToast } = useAppNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const runExport = useCallback(() => {
    pushToast(`Demo: export ${rows.length} item(s)  connect API for full export.`, "info");
  }, [rows.length, pushToast]);

  const runPdf = useCallback(() => {
    pushToast("Demo: Download to PDF  connect report service or window.print() from a preview.", "info");
  }, [pushToast]);

  const runCsv = useCallback(() => {
    downloadTextFile(`items-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(rows, customTypes), "text/csv;charset=utf-8;");
    close();
  }, [rows, customTypes, close]);

  const runExcel = useCallback(() => {
    pushToast("Demo: Download to Excel (.xlsx) — connect API or add a sheet library; CSV download is available now.", "info");
    close();
  }, [close, pushToast]);

  const triggerImport = useCallback(() => {
    fileRef.current?.click();
    close();
  }, [close]);

  return (
    <div className="relative" ref={ref}>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={IMPORT_ACCEPT}
        multiple
        onChange={(e) => {
          onImportFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Import className="h-3.5 w-3.5 shrink-0 text-[var(--gs-muted)]" strokeWidth={2} aria-hidden />
        Import / Export
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-[var(--gs-muted)] transition", open && "rotate-180")} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 min-w-[15rem] rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-xl ring-1 ring-[var(--gs-border)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={triggerImport}
          >
            <Import className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Import...
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={() => {
              runExport();
              close();
            }}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Export
          </button>
          <div className="my-1 border-t border-[var(--gs-border)]" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={() => {
              runPdf();
              close();
            }}
          >
            <FileText className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Download to PDF
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={runCsv}
          >
            <Table className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Download to CSV
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={runExcel}
          >
            <Sheet className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Download to Excel
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AuditSaveDropdown({
  onSaveNow,
  onSaveAndClose,
  disabled,
}: {
  onSaveNow: () => void | Promise<void>;
  onSaveAndClose: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] disabled:pointer-events-none disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ClipboardCheck className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        Save audit
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition", open && "rotate-180")}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 min-w-[13rem] rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-xl ring-1 ring-[var(--gs-border)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={() => {
              onSaveNow();
              setOpen(false);
            }}
          >
            Save Now
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={() => {
              onSaveAndClose();
              setOpen(false);
            }}
          >
            Save and Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function custodianServerReportLabel(id: string | null | undefined): string {
  if (id == null || id === "") return "Unassigned";
  return `User ${id.slice(0, 8)}…`;
}

const FIELD_LABEL = "block text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]";
const FIELD_INPUT =
  "mt-1.5 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm text-[var(--gs-text)] outline-none transition placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/15";

function FormSection({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--gs-border)] bg-gradient-to-b from-[var(--gs-card)] to-[var(--gs-card)] p-4 shadow-sm",
        className,
      )}
    >
      <div className="border-b border-[var(--gs-border)] pb-2">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gs-muted)]">{title}</h4>
        {subtitle ? <p className="mt-1 text-[11px] leading-snug text-[var(--gs-muted)]">{subtitle}</p> : null}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function LineTypeToggle({
  value,
  onChange,
  hint,
}: {
  value: ItemLineEntryType;
  onChange: (next: ItemLineEntryType) => void;
  hint?: string;
}) {
  return (
    <div>
      <p className={FIELD_LABEL}>Item line type</p>
      <div className="mt-2 inline-flex rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-1">
        <button
          type="button"
          onClick={() => onChange("inventory")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition",
            value === "inventory" ? "bg-[var(--gs-accent)] text-white shadow-sm" : "text-[var(--gs-muted)] hover:bg-[var(--gs-card)]",
          )}
        >
          Inventory
        </button>
        <button
          type="button"
          onClick={() => onChange("service")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition",
            value === "service" ? "bg-[var(--gs-accent)] text-white shadow-sm" : "text-[var(--gs-muted)] hover:bg-[var(--gs-card)]",
          )}
        >
          Service
        </button>
      </div>
      {hint ? <p className="mt-1 text-[11px] text-[var(--gs-muted)]">{hint}</p> : null}
    </div>
  );
}

const MAX_ITEM_IMAGE_BYTES = 2_500_000;

function ItemImageDropzone({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { pushToast } = useAppNotifications();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function readFile(file: File) {
    if (!file.type.startsWith("image/")) {
      pushToast("Please choose an image file (PNG, JPG, WebP, etc.).", "error");
      return;
    }
    if (file.size > MAX_ITEM_IMAGE_BYTES) {
      pushToast(`Image must be under ${Math.round(MAX_ITEM_IMAGE_BYTES / 1e6)} MB.`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Image (optional)</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) readFile(f);
        }}
        className={cn(
          "mt-2 flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 transition",
          dragOver ? "border-[var(--gs-accent)] bg-[var(--gs-accent-soft)]/60" : "border-[var(--gs-border)] bg-[var(--gs-hover)]/70 hover:border-[var(--gs-border-strong)]",
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload or drop image"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
        {value ? (
          <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- preview of user-selected file */}
            <img src={value} alt="" className="mx-auto max-h-44 w-auto rounded-lg object-contain shadow-sm" />
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] p-1.5 text-[var(--gs-muted)] shadow-sm hover:bg-red-50 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              aria-label="Remove image"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--gs-text)]">Drop an image here or click to upload</p>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">PNG, JPG, WebP  max {Math.round(MAX_ITEM_IMAGE_BYTES / 1e6)} MB</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Multi-select inventory type filter: empty set = show all kinds. */
function ItemKindMultiSelect({
  id,
  label,
  options,
  selectedKeys,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly { key: string; label: string }[];
  selectedKeys: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const summary = useMemo(() => {
    if (selectedKeys.size === 0) return "All types";
    const labels = [...selectedKeys]
      .map((k) => options.find((o) => o.key === k)?.label ?? k)
      .filter(Boolean);
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  }, [selectedKeys, options]);

  function toggle(key: string) {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  return (
    <div className="relative min-w-0 w-[50%] max-w-[20rem]" ref={rootRef}>
      <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">{label}</span>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${summary}`}
        onClick={() => setOpen((o) => !o)}
        className="mt-2 flex w-full min-w-[6rem] items-center justify-between gap-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-left text-sm outline-none transition hover:border-[var(--gs-border-strong)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]"
      >
        <span className="min-w-0 flex-1 truncate text-[var(--gs-text)]">{summary}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--gs-muted)] transition", open && "rotate-180")} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 z-[120] mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-2 shadow-xl ring-1 ring-[var(--gs-border)]"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-[var(--gs-border)] pb-2">
            <button
              type="button"
              className="text-xs font-semibold text-[var(--gs-accent)] hover:underline"
              onClick={() => onChange(new Set())}
            >
              Clear filter (all types)
            </button>
          </div>
          <ul className="space-y-0.5">
            {options.map((o) => (
              <li key={o.key}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--gs-hover)]">
                  <input
                    type="checkbox"
                    className="rounded border-[var(--gs-border)]"
                    checked={selectedKeys.has(o.key)}
                    onChange={() => toggle(o.key)}
                  />
                  <span className="text-sm text-[var(--gs-text)]">{o.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Searchable popover picker  same UI for location & custodian; no browser "last used" autocomplete */
function SearchableFieldPicker({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
  leadingOption,
  canManageOption,
  onRenameOption,
  onDeleteOption,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  emptyLabel?: string;
  /** e.g. "All locations"  always shown at top, not mixed with search history */
  leadingOption?: { value: string; label: string };
  canManageOption?: (opt: string) => boolean;
  onRenameOption?: (from: string, to: string) => void;
  onDeleteOption?: (opt: string) => void;
}) {
  const { prompt, confirm } = useAppNotifications();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const sortedUnique = useMemo(() => Array.from(new Set(options.filter(Boolean))).sort((a, b) => a.localeCompare(b)), [options]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return sortedUnique;
    return sortedUnique.filter((o) => o.toLowerCase().includes(qq));
  }, [sortedUnique, q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const display =
    leadingOption && value === leadingOption.value
      ? leadingOption.label
      : value.trim() || emptyLabel || placeholder || "Select...";
  const hasExact = q.trim() && sortedUnique.some((o) => o.toLowerCase() === q.trim().toLowerCase());
  const canUseCustom = q.trim() && !hasExact;
  const showLeading =
    leadingOption &&
    (!q.trim() || leadingOption.label.toLowerCase().includes(q.trim().toLowerCase()) || leadingOption.value.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="relative" ref={rootRef}>
      <label htmlFor={`${id}-trigger`} className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
        {label}
      </label>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-left text-sm outline-none transition hover:border-[var(--gs-border-strong)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]"
      >
        <span className={value.trim() ? "truncate text-[var(--gs-text)]" : "truncate text-[var(--gs-muted)]"}>{display}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--gs-muted)] transition", open && "rotate-180")} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-[120] mt-1 overflow-hidden rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-2 shadow-xl ring-1 ring-[var(--gs-border)]"
        >
          <div className="border-b border-[var(--gs-border)] px-2 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--gs-muted)]" strokeWidth={2} aria-hidden />
              <input
                id={id}
                type="search"
                name={`${id}-search`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canUseCustom) {
                    e.preventDefault();
                    onChange(q.trim());
                    setOpen(false);
                  }
                }}
                placeholder={placeholder ?? "Search..."}
                className="w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto px-1">
            {showLeading && leadingOption ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === leadingOption.value}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
                  onClick={() => {
                    onChange(leadingOption.value);
                    setOpen(false);
                  }}
                >
                  {leadingOption.label}
                </button>
              </li>
            ) : null}
            {filtered.length === 0 && !canUseCustom && !showLeading ? (
              <li className="px-3 py-2 text-xs text-[var(--gs-muted)]">No matches</li>
            ) : null}
            {filtered.map((opt) => (
              <li key={opt} className="flex items-stretch gap-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt}
                  className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </button>
                {canManageOption?.(opt) && onRenameOption && onDeleteOption ? (
                  <div className="flex shrink-0 items-center gap-0.5 pr-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                      aria-label={`Rename ${opt}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void (async () => {
                          const n = await prompt({
                            title: "Rename option",
                            message: `Rename "${opt}" to a new label.`,
                            label: "New name",
                            defaultValue: opt,
                            submitLabel: "Rename",
                          });
                          if (n == null) return;
                          const t = n.trim();
                          if (!t || t === opt) return;
                          onRenameOption(opt, t);
                          if (value === opt) onChange(t);
                          setOpen(false);
                        })();
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-[var(--gs-muted)] hover:bg-red-50 hover:text-red-700"
                      aria-label={`Delete ${opt}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void (async () => {
                          const ok = await confirm({
                            title: "Remove option?",
                            message: `Remove "${opt}" from the list? Items using it will be cleared.`,
                            confirmLabel: "Remove",
                            variant: "danger",
                          });
                          if (!ok) return;
                          onDeleteOption(opt);
                          if (value === opt) onChange("");
                          setOpen(false);
                        })();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
            {canUseCustom ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === q.trim()}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--gs-accent)] hover:bg-[var(--gs-accent-soft)]"
                  onClick={() => {
                    onChange(q.trim());
                    setOpen(false);
                  }}
                >
                  Use &ldquo;{q.trim()}&rdquo;
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Search + select for entity id + label (e.g. split parcel source). */
function SearchableSplitSourcePicker({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq));
  }, [options, q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label || emptyLabel || placeholder || "Select...";

  return (
    <div className="relative" ref={rootRef}>
      <label htmlFor={`${id}-trigger`} className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
        {label}
      </label>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-left text-sm outline-none transition hover:border-[var(--gs-border-strong)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]"
      >
        <span className={value.trim() ? "truncate text-[var(--gs-text)]" : "truncate text-[var(--gs-muted)]"}>{display}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--gs-muted)] transition", open && "rotate-180")} strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-[120] mt-1 overflow-hidden rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-2 shadow-xl ring-1 ring-[var(--gs-border)]"
        >
          <div className="border-b border-[var(--gs-border)] px-2 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--gs-muted)]" strokeWidth={2} aria-hidden />
              <input
                id={id}
                type="search"
                name={`${id}-search`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder ?? "Search..."}
                className="w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto px-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[var(--gs-muted)]">No matches</li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === opt.value}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function customInventoryTypeToAddDraft(t: CustomInventoryType): {
  label: string;
  uomTab: UomTab;
  customUom: string;
  specMode: AddTypeSpecMode;
  standardFields: Record<BuiltinStandardFieldId, StandardFieldRule>;
  builderFields: CustomFieldDef[];
} {
  const hasBuilder = Boolean(t.builderFields && t.builderFields.length > 0);
  const builderFields = hasBuilder
    ? t.builderFields!.map((f) => ({
        ...f,
        visible: f.visible !== false,
        required: f.required !== false,
      }))
    : builderTemplateForStyle(t.fieldPreset === KIND_CUT ? "cut" : "rough");
  return {
    label: t.label,
    uomTab: t.uomTab,
    customUom: t.customUomLabel ?? "",
    specMode: detectSpecStyleFromFields(builderFields),
    standardFields: mergeStandardFields(t.standardFields),
    builderFields,
  };
}

function ItemRowActionMenu({
  onEdit,
  onDelete,
  extraItems,
}: {
  onEdit: () => void;
  onDelete: () => void;
  /** Optional extra entries (e.g. Split) shown below Edit */
  extraItems?: { label: string; onSelect: () => void; danger?: boolean; icon?: "split" }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative z-30 flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Row actions"
        title="Actions"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[200] mt-1 min-w-[10.5rem] rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-lg ring-1 ring-black/5"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            <Pencil className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            Edit
          </button>
          {extraItems?.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              className={
                it.danger
                  ? "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                  : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
              }
              onClick={() => {
                it.onSelect();
                setOpen(false);
              }}
            >
              {it.icon === "split" ? (
                <SquareSplitHorizontal className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              ) : null}
              {it.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

const emptyItemForm = () => ({
  entryType: "inventory" as ItemLineEntryType,
  imageDataUrl: null as string | null,
  itemTypeKey: KIND_ROUGH as ItemKindKey,
  itemNo: "",
  itemName: "",
  type: "Product" as ItemRow["type"],
  grade: "AA" as string,
  dimLength: "",
  dimWidth: "",
  dimHeight: "",
  customFields: {} as Record<string, string>,
  pieces: "",
  rate: "",
  location: "",
  custodian: "",
  uom: "",
  date: new Date().toISOString().slice(0, 10),
  details: "",
  serviceUnit: "",
  revenueAccountId: "8",
  linkedRoughLotCode: "",
});

type ItemFormState = ReturnType<typeof emptyItemForm>;

function normalizeItemForm(f: ItemFormState) {
  const ck = Object.keys(f.customFields).sort();
  const customSorted: Record<string, string> = {};
  for (const k of ck) customSorted[k] = (f.customFields[k] ?? "").trim();
  const img = f.imageDataUrl;
  const imageKey = img ? `${img.length}:${img.slice(0, 64)}` : "";
  return {
    entryType: f.entryType,
    imageKey,
    itemTypeKey: f.itemTypeKey,
    itemNo: f.itemNo.trim(),
    itemName: f.itemName.trim(),
    type: f.type,
    grade: f.grade.trim(),
    dimLength: f.dimLength.trim(),
    dimWidth: f.dimWidth.trim(),
    dimHeight: f.dimHeight.trim(),
    customFields: customSorted,
    pieces: f.pieces.trim(),
    rate: f.rate.trim(),
    location: f.location.trim(),
    custodian: f.custodian.trim(),
    uom: f.uom.trim(),
    date: f.date.trim(),
    details: f.details.trim(),
    serviceUnit: f.serviceUnit.trim(),
    revenueAccountId: f.revenueAccountId.trim(),
    linkedRoughLotCode: f.linkedRoughLotCode.trim(),
  };
}

function itemFormSnapshot(f: ItemFormState) {
  return JSON.stringify(normalizeItemForm(f));
}

export function InventoryHub() {
  const { pushToast, confirm, prompt } = useAppNotifications();
  const router = useRouter();
  const sp = useSearchParams();
  const rawTab = sp.get("tab");
  const tab: Tab =
    rawTab && VALID_INVENTORY_TABS.has(rawTab as Tab) ? (rawTab as Tab) : "items";

  useEffect(() => {
    const t = sp.get("tab");
    if (!t) router.replace("/inventory?tab=items", { scroll: false });
    else if (!VALID_INVENTORY_TABS.has(t as Tab)) router.replace("/inventory?tab=items", { scroll: false });
  }, [router, sp]);

  const setTab = (t: Tab) => router.push(`/inventory?tab=${t}`, { scroll: false });

  const [rows, setRows] = useState<ItemRow[]>([]);
  /** `loading` until first catalog bootstrap finishes (avoids flashing demo rows before server data). */
  const [catalogBootstrap, setCatalogBootstrap] = useState<"loading" | "ready">("loading");
  /**
   * `local` = guest-only demo catalog (no auth token); signed-in users use `server` only.
   * `server` = catalog hydrated from `/inv/*` (signed-in default).
   */
  const [inventoryCatalogSource, setInventoryCatalogSource] = useState<"local" | "server">("local");
  const [invFlags, setInvFlags] = useState<InvInventoryFeatureFlags | null>(null);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [splitBusy, setSplitBusy] = useState(false);
  /** Stock = physical inventory only; Services = billable services (not stock-tracked). */
  const [itemCatalogScope, setItemCatalogScope] = useState<"stock" | "services">("stock");
  const [itemSearch, setItemSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("All");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  /** Table order by row date: oldest first vs newest first */
  const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  /** When set on a new item, create one sellable child unit (unique #/QR) per piece. */
  const [trackEachPieceSeparately, setTrackEachPieceSeparately] = useState(false);
  /** Serialized `normalizeItemForm` when the modal opened  for dirty detection */
  const [itemFormBaselineKey, setItemFormBaselineKey] = useState<string | null>(null);
  /** Shown after a new inventory item is saved (not edit or service). */
  const [newItemQrUnitId, setNewItemQrUnitId] = useState<string | null>(null);
  const [newItemQrBlobUrl, setNewItemQrBlobUrl] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [customInventoryTypes, setCustomInventoryTypes] = useState<CustomInventoryType[]>([]);
  const [addTypeModalOpen, setAddTypeModalOpen] = useState(false);
  const [viewAllTypesOpen, setViewAllTypesOpen] = useState(false);
  const [splitParcelOpen, setSplitParcelOpen] = useState(false);
  /** Toolbar: single entry point for creating stock (plan Part 1). */
  const [addStockMenuOpen, setAddStockMenuOpen] = useState(false);
  /** Split modal: smaller parcels vs one row per physical piece (plan Part 2). */
  const [splitMode, setSplitMode] = useState<"parcels" | "pieces">("parcels");
  const [splitPiecesCount, setSplitPiecesCount] = useState("");
  const [splitPerPieceUom, setSplitPerPieceUom] = useState("");
  const [splitPerPieceRate, setSplitPerPieceRate] = useState("");
  const [splitSourceId, setSplitSourceId] = useState("");
  const [splitRows, setSplitRows] = useState<SplitDraftRow[]>([]);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [editingInventoryTypeId, setEditingInventoryTypeId] = useState<string | null>(null);
  /** Empty set = no filter (all inventory kinds). Non-empty = item must match one of the keys. */
  const [itemKindFilterKeys, setItemKindFilterKeys] = useState<Set<string>>(() => new Set());
  const [reportSubTab, setReportSubTab] = useState<ReportSubTab>("overview");
  const [auditDraft, setAuditDraft] = useState<Record<string, { physical: string; verified: boolean }>>({});
  /** Filter audit table by item #, name, or UOM */
  const [auditSearch, setAuditSearch] = useState("");
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  /** Stock lines marked completed for this audit (hidden from the count table until reset in a future build). */
  const [auditClosedItemIds, setAuditClosedItemIds] = useState<Set<string>>(() => new Set());
  /** Empty set = all inventory types; non-empty = filter item name-wise report by these kinds */
  const [reportItemNameKinds, setReportItemNameKinds] = useState<Set<string>>(() => new Set());
  const [roughLotOptions, setRoughLotOptions] = useState<{ code: string; supplier: string }[]>(() => [...ROUGH_LOTS_SEED]);
  const [custodianReportExpanded, setCustodianReportExpanded] = useState<string | null>(null);
  /** Custodian-wise server report drill-down key = `custodian_user_id` or `""` for unassigned. */
  const [serverCustodianReportExpanded, setServerCustodianReportExpanded] = useState<string | null>(null);
  /** Server `/inv/reports/*` (when signed in). */
  const [serverReportSummary, setServerReportSummary] = useState<Awaited<ReturnType<typeof fetchReportSummary>> | null>(null);
  const [serverReportByType, setServerReportByType] = useState<Awaited<ReturnType<typeof fetchReportByType>>>([]);
  const [serverReportByCustodian, setServerReportByCustodian] = useState<Awaited<ReturnType<typeof fetchReportByCustodian>>>([]);
  const [reportsApiLoading, setReportsApiLoading] = useState(false);
  const [reportsApiError, setReportsApiError] = useState<string | null>(null);
  const [auditSaving, setAuditSaving] = useState(false);
  const [auditHistoryLoading, setAuditHistoryLoading] = useState(false);
  const [stockTransferOpen, setStockTransferOpen] = useState(false);
  const [stockTransferMode, setStockTransferMode] = useState<"location" | "qty">("location");
  const [transferUnitId, setTransferUnitId] = useState("");
  const [transferToLocation, setTransferToLocation] = useState("");
  const [transferFromUnitId, setTransferFromUnitId] = useState("");
  const [transferToUnitId, setTransferToUnitId] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferPieces, setTransferPieces] = useState("");
  const [transferMemo, setTransferMemo] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  /** Stock line selected to inspect split children (parcels / child units). */
  const [parcelLinesParent, setParcelLinesParent] = useState<ItemRow | null>(null);
  const [fromLotOpen, setFromLotOpen] = useState(false);
  const [fromLotTypes, setFromLotTypes] = useState<InvItemTypeDto[]>([]);
  const [lotSummariesHub, setLotSummariesHub] = useState<PurchaseLotSummary[]>([]);
  const [lotSummariesErrorHub, setLotSummariesErrorHub] = useState<string | null>(null);
  const [selectedLotCodeHub, setSelectedLotCodeHub] = useState("");
  const [lotDetailHub, setLotDetailHub] = useState<PurchaseLotDetail | null>(null);
  const [lotDetailLoadingHub, setLotDetailLoadingHub] = useState(false);
  const [fromLotItemTypeIdHub, setFromLotItemTypeIdHub] = useState("");
  const [fromLotPrimaryUomCodeHub, setFromLotPrimaryUomCodeHub] = useState("ct");
  const [fromLotParcelsHub, setFromLotParcelsHub] = useState<
    { key: string; purchase_lot_line_id: string; display_name: string; primary_uom_qty: string; pieces: string; public_code: string }[]
  >([]);
  const [fromLotSavingHub, setFromLotSavingHub] = useState(false);
  /** Phase 1: Receive-from-lot mode toggle (auto = Mode A, custom = Mode B). */
  const [fromLotMode, setFromLotMode] = useState<"auto" | "custom">("auto");
  /** Mode A: per-line auto-split inputs keyed by purchase_lot_line_id. */
  const [autoSplitDraft, setAutoSplitDraft] = useState<
    Record<string, { n: string; basis: "equal_weight" | "equal_pieces" }>
  >({});
  /** Mode B: variance reason + memo when custom-split sums do not equal the lot line. */
  const [customSplitVarianceReason, setCustomSplitVarianceReason] = useState<InvLotVarianceReason | "">("");
  const [customSplitVarianceMemo, setCustomSplitVarianceMemo] = useState("");
  /** Phase 1: row-level action modals. */
  const [adjustWeightTarget, setAdjustWeightTarget] = useState<ItemRow | null>(null);
  const [adjustWeightDraft, setAdjustWeightDraft] = useState<{
    qty: string;
    pieces: string;
    reason: InvLotVarianceReason;
    memo: string;
  }>({ qty: "", pieces: "", reason: "re_measure", memo: "" });
  const [adjustWeightSaving, setAdjustWeightSaving] = useState(false);
  const [rebalanceTarget, setRebalanceTarget] = useState<ItemRow | null>(null);
  const [rebalanceDraft, setRebalanceDraft] = useState<{
    toUnitId: string;
    qty: string;
    pieces: string;
    reason: InvLotVarianceReason;
    memo: string;
  }>({ toUnitId: "", qty: "", pieces: "", reason: "re_measure", memo: "" });
  const [rebalanceSaving, setRebalanceSaving] = useState(false);
  const [lossTarget, setLossTarget] = useState<ItemRow | null>(null);
  const [lossDraft, setLossDraft] = useState<{
    qty: string;
    pieces: string;
    reason: InvLotVarianceReason;
    memo: string;
  }>({ qty: "", pieces: "0", reason: "dust", memo: "" });
  const [lossSaving, setLossSaving] = useState(false);
  /** Cache of latest lot balances keyed by purchase_lot_id (for the inline strip). */
  const [lotBalances, setLotBalances] = useState<Record<string, InvLotBalanceDto>>({});
  /** History tab inside the child-parcels drawer. */
  const [parcelDrawerTab, setParcelDrawerTab] = useState<"children" | "history" | "lineage">("children");
  const [drawerHistoryRows, setDrawerHistoryRows] = useState<InvStockMovementDto[]>([]);
  const [drawerHistoryLoading, setDrawerHistoryLoading] = useState(false);
  const [drawerHistoryError, setDrawerHistoryError] = useState<string | null>(null);
  const [lineageData, setLineageData] = useState<InvLineageDto | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageError, setLineageError] = useState<string | null>(null);
  /** Phase 3: group catalog table rows under purchase lot headers. */
  const [groupCatalogByLot, setGroupCatalogByLot] = useState(false);
  /** Lot keys (UUID or `__none__`) whose section is collapsed when grouping is on. */
  const [collapsedLotIds, setCollapsedLotIds] = useState<Set<string>>(() => new Set());
  /** Phase 2: cut wizard */
  const [cutWizardSource, setCutWizardSource] = useState<ItemRow | null>(null);
  const [cutWizardTypes, setCutWizardTypes] = useState<InvItemTypeDto[]>([]);
  const [cutCutTypeIdHub, setCutCutTypeIdHub] = useState("");
  const [cutOutputRows, setCutOutputRows] = useState<
    { id: string; display_name: string; primary_uom_qty: string; pieces: string; public_code: string }[]
  >(() => [{ id: crypto.randomUUID(), display_name: "", primary_uom_qty: "", pieces: "1", public_code: "" }]);
  const [cutLossReason, setCutLossReason] = useState<InvLotVarianceReason | "">("");
  const [cutMemo, setCutMemo] = useState("");
  const [cutSaving, setCutSaving] = useState(false);
  const [addTypeDraft, setAddTypeDraft] = useState<{
    label: string;
    uomTab: UomTab;
    customUom: string;
    specMode: AddTypeSpecMode;
    standardFields: Record<BuiltinStandardFieldId, StandardFieldRule>;
    builderFields: CustomFieldDef[];
  }>({
    label: "",
    uomTab: "kg",
    customUom: "",
    specMode: "builder",
    standardFields: defaultStandardFieldRules(),
    builderFields: [{ id: newFieldId(), label: "Field 1", kind: "text", required: true }],
  });

  useEffect(() => {
    if (isInventoryGuestMode()) {
      setAuditClosedItemIds(loadAuditClosedIds());
    } else {
      setAuditClosedItemIds(new Set());
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    fetchRoughLotPickerOptions()
      .then((opts) => {
        if (!cancelled && opts.length > 0) setRoughLotOptions(opts);
      })
      .catch(() => {
        /* keep seed */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (itemCatalogScope === "services") setItemKindFilterKeys(new Set());
  }, [itemCatalogScope]);

  useEffect(() => {
    if (tab !== "reports" || !getAccessToken()) return;
    let cancelled = false;
    setReportsApiLoading(true);
    setReportsApiError(null);
    void Promise.all([fetchReportSummary(), fetchReportByType(), fetchReportByCustodian()])
      .then(([su, bt, bc]) => {
        if (cancelled) return;
        setServerReportSummary(su);
        setServerReportByType(bt);
        setServerReportByCustodian(bc);
      })
      .catch((e) => {
        if (!cancelled) setReportsApiError(e instanceof Error ? e.message : "Could not load server reports.");
      })
      .finally(() => {
        if (!cancelled) setReportsApiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (!fromLotOpen || !getAccessToken()) return;
    setLotSummariesErrorHub(null);
    let cancelled = false;
    void Promise.all([fetchItemTypes(), listPurchaseLotSummaries()])
      .then(([types, sums]) => {
        if (cancelled) return;
        setFromLotTypes(types);
        setLotSummariesHub(sums);
      })
      .catch((e) => {
        if (!cancelled) setLotSummariesErrorHub(e instanceof Error ? e.message : "Could not load purchase lots.");
      });
    return () => {
      cancelled = true;
    };
  }, [fromLotOpen]);

  useEffect(() => {
    if (!fromLotOpen || !selectedLotCodeHub.trim()) {
      setLotDetailHub(null);
      return;
    }
    let cancelled = false;
    setLotDetailLoadingHub(true);
    void getPurchaseLotByCode(selectedLotCodeHub.trim())
      .then((d) => {
        if (!cancelled) setLotDetailHub(d);
      })
      .catch(() => {
        if (!cancelled) {
          setLotDetailHub(null);
          pushToast("Could not load that lot. Check the lot code or sign in again.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setLotDetailLoadingHub(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromLotOpen, selectedLotCodeHub, pushToast]);

  const refetchInventoryCatalog = useCallback(async () => {
    const snap = await loadInventoryHubServerSnapshot();
    setRows(snap.rows);
    setCustomInventoryTypes(snap.customInventoryTypes);
    setInventoryCatalogSource("server");
  }, []);

  const mapServerAuditSessions = useCallback(
    (sessions: InvAuditSessionDto[]): AuditRecord[] =>
      sessions.map((sess) => ({
        id: sess.id,
        createdAt: sess.started_at,
        note: sess.note?.trim()
          ? sess.note
          : sess.status === "closed"
            ? "Closed on server"
            : sess.status || "",
        lines: sess.lines.map((ln) => {
          const unitId = ln.stock_unit_id;
          const row = rows.find((r) => r.id === unitId || r.serverUnitId === unitId);
          const systemUom = Number(ln.system_qty);
          const physicalUom = ln.physical_qty != null && ln.physical_qty !== "" ? Number(ln.physical_qty) : null;
          const variance =
            physicalUom !== null && Number.isFinite(physicalUom) && Number.isFinite(systemUom)
              ? physicalUom - systemUom
              : null;
          return {
            itemId: unitId,
            itemNo: row?.itemNo ?? unitId.slice(0, 8),
            itemName: row?.itemName ?? "Stock line",
            itemKind: row?.itemKind ?? "",
            location: row?.location ?? "",
            custodian: row?.custodian ?? "",
            systemUom: Number.isFinite(systemUom) ? systemUom : 0,
            systemPieces: row?.pieces ?? 0,
            physicalUom,
            verified: ln.verified,
            variance,
          };
        }),
      })),
    [rows],
  );

  const reloadAuditSessions = useCallback(async () => {
    if (!getAccessToken()) {
      setAuditRecords(loadAuditRecords());
      return;
    }
    setAuditHistoryLoading(true);
    try {
      const sessions = await fetchAuditSessions(50);
      setAuditRecords(mapServerAuditSessions(sessions));
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not load audit history.", "error");
      setAuditRecords([]);
    } finally {
      setAuditHistoryLoading(false);
    }
  }, [mapServerAuditSessions, pushToast]);

  useEffect(() => {
    if (catalogBootstrap !== "ready") return;
    void reloadAuditSessions();
  }, [catalogBootstrap, reloadAuditSessions]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (typeof window === "undefined") return;
      setCatalogBootstrap("loading");

      const hydrateLocalCatalog = () => {
        const loaded = loadItemCatalog();
        if (loaded?.length) {
          setRows(
            loaded.map((r) => ({
              ...r,
              revenueAccountId: r.revenueAccountId ?? (r.entryType === "service" ? "8" : ""),
              linkedRoughLotCode: r.linkedRoughLotCode ?? "",
            })) as ItemRow[],
          );
        } else {
          setRows(INITIAL_ITEMS);
        }
        setInventoryCatalogSource("local");
      };

      if (getAccessToken()) {
        clearInventoryLocalStorageKeys();
        try {
          const flags = await fetchInventoryFeatureFlags();
          if (cancelled) return;
          setInvFlags(flags);
          const readsBlocked = flags.hub_backend_reads === false;
          if (!readsBlocked) {
            const snap = await loadInventoryHubServerSnapshot();
            if (!cancelled) {
              setRows(snap.rows);
              setCustomInventoryTypes(snap.customInventoryTypes);
              setInventoryCatalogSource("server");
              setCatalogBootstrap("ready");
              return;
            }
          } else {
            pushToast("Server inventory reads are off for this business. Using local catalog.", "info");
          }
        } catch (e) {
          if (!cancelled) {
            pushToast(e instanceof Error ? e.message : "Could not load inventory from server.", "error");
          }
        }
      }

      if (cancelled) return;
      hydrateLocalCatalog();
      setCatalogBootstrap("ready");
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount: avoid re-fetching catalog when toast helper identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inventoryCatalogSource === "server" || !isInventoryGuestMode()) return;
    saveItemCatalog(rows as StoredItemRow[]);
  }, [rows, inventoryCatalogSource]);

  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [customCustodians, setCustomCustodians] = useState<string[]>([]);
  const [hiddenLocationPresets, setHiddenLocationPresets] = useState<string[]>([]);
  const [hiddenCustodianPresets, setHiddenCustodianPresets] = useState<string[]>([]);
  /** Server-backed location/custodian records (with ids) for create/rename/deactivate. */
  const [serverLocations, setServerLocations] = useState<InvLocationDto[]>([]);
  const [serverCustodians, setServerCustodians] = useState<InvCustodianDto[]>([]);
  /** Inventory is sign-in only; default true to avoid a flash for authenticated users. */
  const [hasAuthToken, setHasAuthToken] = useState(true);

  useEffect(() => {
    setHasAuthToken(Boolean(getAccessToken()));
  }, []);

  const inventoryApiWrite = useCallback(
    () => Boolean(getAccessToken() && invFlags && inventoryWritesAllowed(invFlags)),
    [invFlags],
  );

  const refreshServerLocations = useCallback(async () => {
    const locs = await fetchLocations();
    setServerLocations(locs);
    const names = locs.filter((l) => l.is_active).map((l) => l.name.trim()).filter(Boolean);
    setCustomLocations(() => Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
  }, []);

  const refreshServerCustodians = useCallback(async () => {
    const cs = await fetchCustodians();
    setServerCustodians(cs);
    const names = cs.filter((c) => c.is_active).map((c) => c.display_name.trim()).filter(Boolean);
    setCustomCustodians(() => Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
  }, []);

  useEffect(() => {
    if (!isInventoryGuestMode()) return;
    setCustomLocations(loadCustomLocations());
    setCustomCustodians(loadCustomCustodians());
    setHiddenLocationPresets(loadHiddenLocationPresets());
    setHiddenCustodianPresets(loadHiddenCustodianPresets());
  }, []);

  useEffect(() => {
    if (!getAccessToken() || catalogBootstrap !== "ready") return;
    let cancelled = false;
    void (async () => {
      try {
        const [locs, custodians] = await Promise.all([fetchLocations(), fetchCustodians()]);
        if (cancelled) return;
        setServerLocations(locs);
        setServerCustodians(custodians);
        const locNames = locs.filter((l) => l.is_active).map((l) => l.name.trim()).filter(Boolean);
        const custNames = custodians.filter((c) => c.is_active).map((c) => c.display_name.trim()).filter(Boolean);
        if (locNames.length) {
          setCustomLocations((prev) =>
            Array.from(new Set([...prev, ...locNames])).sort((a, b) => a.localeCompare(b)),
          );
        }
        if (custNames.length) {
          setCustomCustodians((prev) =>
            Array.from(new Set([...prev, ...custNames])).sort((a, b) => a.localeCompare(b)),
          );
        }
      } catch {
        /* picker still uses row values + presets */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogBootstrap]);

  const locationPickerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const loc of ALL_LOCATIONS) {
      if (!hiddenLocationPresets.includes(loc)) set.add(loc);
    }
    rows.forEach((r) => {
      if (r.entryType !== "inventory") return;
      if (r.location && r.location !== "") set.add(r.location);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, hiddenLocationPresets]);

  const custodianPickerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of ALL_CUSTODIANS) {
      if (!hiddenCustodianPresets.includes(c)) set.add(c);
    }
    rows.forEach((r) => {
      if (r.entryType !== "inventory") return;
      if (r.custodian && r.custodian !== "") set.add(r.custodian);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, hiddenCustodianPresets]);

  useEffect(() => {
    persistCustomLocations(customLocations);
  }, [customLocations]);

  useEffect(() => {
    persistCustomCustodians(customCustodians);
  }, [customCustodians]);

  useEffect(() => {
    persistHiddenLocationPresets(hiddenLocationPresets);
  }, [hiddenLocationPresets]);

  useEffect(() => {
    persistHiddenCustodianPresets(hiddenCustodianPresets);
  }, [hiddenCustodianPresets]);

  const locationOptionsMerged = useMemo(() => {
    const set = new Set<string>(locationPickerOptions);
    customLocations.forEach((loc) => {
      const t = loc.trim();
      if (t) set.add(t);
    });
    const cur = itemForm.location.trim();
    if (cur) set.add(cur);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [locationPickerOptions, customLocations, itemForm.location]);

  const custodianOptionsMerged = useMemo(() => {
    const set = new Set<string>(custodianPickerOptions);
    customCustodians.forEach((name) => {
      const t = name.trim();
      if (t) set.add(t);
    });
    const cur = itemForm.custodian.trim();
    if (cur) set.add(cur);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [custodianPickerOptions, customCustodians, itemForm.custodian]);

  const addCustomLocation = useCallback(async () => {
    const name = await prompt({
      title: "New location",
      message: "Enter a name for the new location.",
      label: "Location name",
      submitLabel: "Add",
    });
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (inventoryApiWrite()) {
      try {
        await createLocation({ name: trimmed });
        await refreshServerLocations();
        setItemForm((s) => ({ ...s, location: trimmed }));
        pushToast("Location added.", "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Could not add location.", "error");
      }
      return;
    }
    setCustomLocations((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setItemForm((s) => ({ ...s, location: trimmed }));
  }, [prompt, inventoryApiWrite, refreshServerLocations, pushToast]);

  const addCustomCustodian = useCallback(async () => {
    const name = await prompt({
      title: "New custodian",
      message: "Enter a name for the new custodian.",
      label: "Custodian name",
      submitLabel: "Add",
    });
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (inventoryApiWrite()) {
      try {
        await createCustodian({ display_name: trimmed });
        await refreshServerCustodians();
        setItemForm((s) => ({ ...s, custodian: trimmed }));
        pushToast("Custodian added.", "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Could not add custodian.", "error");
      }
      return;
    }
    setCustomCustodians((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setItemForm((s) => ({ ...s, custodian: trimmed }));
  }, [prompt, inventoryApiWrite, refreshServerCustodians, pushToast]);

  const renameLocationOption = useCallback(
    async (from: string, to: string) => {
      if (inventoryApiWrite()) {
        const loc = serverLocations.find((l) => l.name === from && l.is_active);
        if (loc) {
          try {
            await updateLocation(loc.id, { name: to });
            await refreshServerLocations();
            setRows((prev) =>
              prev.map((r) => (r.entryType === "inventory" && r.location === from ? { ...r, location: to } : r)),
            );
            setItemForm((s) => (s.location === from ? { ...s, location: to } : s));
            setLocationFilter((f) => (f === from ? to : f));
            pushToast("Location renamed.", "success");
          } catch (e) {
            pushToast(e instanceof Error ? e.message : "Could not rename location.", "error");
          }
          return;
        }
      }
      setRows((prev) =>
        prev.map((r) => (r.entryType === "inventory" && r.location === from ? { ...r, location: to } : r)),
      );
      setCustomLocations((prev) => {
        const i = prev.indexOf(from);
        if (i >= 0) {
          const next = [...prev];
          next[i] = to;
          return [...new Set(next.filter(Boolean))];
        }
        if ((ALL_LOCATIONS as readonly string[]).includes(from)) {
          return prev.includes(to) ? prev : [...prev, to];
        }
        return prev;
      });
      setHiddenLocationPresets((prev) => (from && (ALL_LOCATIONS as readonly string[]).includes(from) && !prev.includes(from) ? [...prev, from] : prev));
      setItemForm((s) => (s.location === from ? { ...s, location: to } : s));
      setLocationFilter((f) => (f === from ? to : f));
    },
    [inventoryApiWrite, serverLocations, refreshServerLocations, pushToast],
  );

  const deleteLocationOption = useCallback(
    async (name: string) => {
      if (inventoryApiWrite()) {
        const loc = serverLocations.find((l) => l.name === name && l.is_active);
        if (loc) {
          try {
            await updateLocation(loc.id, { is_active: false });
            await refreshServerLocations();
            setRows((prev) =>
              prev.map((r) => (r.entryType === "inventory" && r.location === name ? { ...r, location: "" } : r)),
            );
            setItemForm((s) => (s.location === name ? { ...s, location: "" } : s));
            setLocationFilter((f) => (f === name ? "All" : f));
            pushToast("Location removed.", "success");
          } catch (e) {
            pushToast(e instanceof Error ? e.message : "Could not remove location.", "error");
          }
          return;
        }
      }
      setRows((prev) =>
        prev.map((r) => (r.entryType === "inventory" && r.location === name ? { ...r, location: "" } : r)),
      );
      setCustomLocations((prev) => prev.filter((x) => x !== name));
      if ((ALL_LOCATIONS as readonly string[]).includes(name)) {
        setHiddenLocationPresets((prev) => (prev.includes(name) ? prev : [...prev, name]));
      }
      setItemForm((s) => (s.location === name ? { ...s, location: "" } : s));
      setLocationFilter((f) => (f === name ? "All" : f));
    },
    [inventoryApiWrite, serverLocations, refreshServerLocations, pushToast],
  );

  const renameCustodianOption = useCallback(
    async (from: string, to: string) => {
      if (inventoryApiWrite()) {
        const cust = serverCustodians.find((c) => c.display_name === from && c.is_active);
        if (cust) {
          try {
            await updateCustodian(cust.id, { display_name: to });
            await refreshServerCustodians();
            setRows((prev) =>
              prev.map((r) => (r.entryType === "inventory" && r.custodian === from ? { ...r, custodian: to } : r)),
            );
            setItemForm((s) => (s.custodian === from ? { ...s, custodian: to } : s));
            pushToast("Custodian renamed.", "success");
          } catch (e) {
            pushToast(e instanceof Error ? e.message : "Could not rename custodian.", "error");
          }
          return;
        }
      }
      setRows((prev) =>
        prev.map((r) => (r.entryType === "inventory" && r.custodian === from ? { ...r, custodian: to } : r)),
      );
      setCustomCustodians((prev) => {
        const i = prev.indexOf(from);
        if (i >= 0) {
          const next = [...prev];
          next[i] = to;
          return [...new Set(next.filter(Boolean))];
        }
        if ((ALL_CUSTODIANS as readonly string[]).includes(from)) {
          return prev.includes(to) ? prev : [...prev, to];
        }
        return prev;
      });
      setHiddenCustodianPresets((prev) =>
        from && (ALL_CUSTODIANS as readonly string[]).includes(from) && !prev.includes(from) ? [...prev, from] : prev,
      );
      setItemForm((s) => (s.custodian === from ? { ...s, custodian: to } : s));
    },
    [inventoryApiWrite, serverCustodians, refreshServerCustodians, pushToast],
  );

  const deleteCustodianOption = useCallback(
    async (name: string) => {
      if (inventoryApiWrite()) {
        const cust = serverCustodians.find((c) => c.display_name === name && c.is_active);
        if (cust) {
          try {
            await updateCustodian(cust.id, { is_active: false });
            await refreshServerCustodians();
            setRows((prev) =>
              prev.map((r) => (r.entryType === "inventory" && r.custodian === name ? { ...r, custodian: "" } : r)),
            );
            setItemForm((s) => (s.custodian === name ? { ...s, custodian: "" } : s));
            pushToast("Custodian removed.", "success");
          } catch (e) {
            pushToast(e instanceof Error ? e.message : "Could not remove custodian.", "error");
          }
          return;
        }
      }
      setRows((prev) =>
        prev.map((r) => (r.entryType === "inventory" && r.custodian === name ? { ...r, custodian: "" } : r)),
      );
      setCustomCustodians((prev) => prev.filter((x) => x !== name));
      if ((ALL_CUSTODIANS as readonly string[]).includes(name)) {
        setHiddenCustodianPresets((prev) => (prev.includes(name) ? prev : [...prev, name]));
      }
      setItemForm((s) => (s.custodian === name ? { ...s, custodian: "" } : s));
    },
    [inventoryApiWrite, serverCustodians, refreshServerCustodians, pushToast],
  );

  const canManageLocationOption = useCallback((opt: string) => Boolean(opt.trim()), []);
  const canManageCustodianOption = useCallback((opt: string) => Boolean(opt.trim()), []);

  const typeFilterTabs = useMemo(
    () => [
      { key: "all" as const, label: "All" },
      { key: KIND_ROUGH, label: "Rough" },
      { key: KIND_CUT, label: "Cut" },
      ...customInventoryTypes.map((t) => ({ key: t.id, label: t.label })),
    ],
    [customInventoryTypes],
  );

  const inventoryStockRows = useMemo(
    () => rows.filter((r) => r.entryType === "inventory"),
    [rows],
  );

  const parcelChildRows = useMemo(() => {
    if (!parcelLinesParent) return [];
    return sellableChildrenForParent(parcelLinesParent, inventoryStockRows);
  }, [parcelLinesParent, inventoryStockRows]);

  /** Count of sellable child units per root stock unit id (for the catalog summary badge). */
  const sellableCountByParent = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of inventoryStockRows) {
      const pid = r.serverParentUnitId ?? null;
      if (pid) m.set(pid, (m.get(pid) ?? 0) + 1);
    }
    return m;
  }, [inventoryStockRows]);

  const splitParcelPickerOptions = useMemo(
    () =>
      inventoryStockRows.map((row) => ({
        value: row.id,
        label: `${row.itemName} | Lot: ${row.itemNo || "-"} | UOM: ${row.uom} | Pieces: ${row.pieces}`,
      })),
    [inventoryStockRows],
  );

  const splitSourceRow = useMemo(
    () => inventoryStockRows.find((r) => r.id === splitSourceId) ?? null,
    [inventoryStockRows, splitSourceId],
  );

  const splitTotals = useMemo(() => {
    const toNum = (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    const uom = splitRows.reduce((sum, row) => sum + toNum(row.uom), 0);
    const pieces = splitRows.reduce((sum, row) => sum + toNum(row.pieces), 0);
    return { uom, pieces };
  }, [splitRows]);

  const splitLiveError = useMemo(() => {
    if (!splitSourceRow || splitMode === "pieces") return null;
    if (splitTotals.uom > splitSourceRow.uom) return "Split UOM exceeds available source UOM.";
    if (splitTotals.pieces > splitSourceRow.pieces) return "Split pieces exceed available source pieces.";
    return null;
  }, [splitSourceRow, splitTotals, splitMode]);

  const splitPiecesPreview = useMemo(() => {
    if (!splitSourceRow || splitMode !== "pieces") return null;
    const n = Number.parseInt(splitPiecesCount.trim(), 10);
    const perU = Number(splitPerPieceUom);
    if (!Number.isFinite(n) || n < 1 || !Number.isFinite(perU) || perU <= 0) return null;
    return {
      n,
      remainingUom: Math.max(0, splitSourceRow.uom - n * perU),
      remainingPieces: Math.max(0, splitSourceRow.pieces - n),
    };
  }, [splitSourceRow, splitMode, splitPiecesCount, splitPerPieceUom]);

  const auditVisibleStockRows = useMemo(
    () => inventoryStockRows.filter((r) => !auditClosedItemIds.has(r.id)),
    [inventoryStockRows, auditClosedItemIds],
  );

  const auditFilteredStockRows = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditVisibleStockRows;
    return auditVisibleStockRows.filter((r) => {
      const hay = [r.itemNo, r.itemName, String(r.uom), String(r.pieces)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [auditVisibleStockRows, auditSearch]);

  const reportInventoryRows = inventoryStockRows;

  const reportOverview = useMemo(() => {
    let totalValue = 0;
    let totalUom = 0;
    let totalPieces = 0;
    let lineCount = 0;
    for (const r of reportInventoryRows) {
      lineCount += 1;
      totalUom += inventoryPrimaryQty(r, customInventoryTypes);
      totalPieces += r.pieces;
      totalValue += lineAmount(r, customInventoryTypes);
    }
    return { totalValue, totalUom, totalPieces, lineCount };
  }, [reportInventoryRows, customInventoryTypes]);

  const reportQtyByMonth = useMemo(() => {
    const m = new Map<string, { uom: number; value: number }>();
    for (const r of reportInventoryRows) {
      const month = r.date.length >= 7 ? r.date.slice(0, 7) : r.date;
      const cur = m.get(month) ?? { uom: 0, value: 0 };
      cur.uom += inventoryPrimaryQty(r, customInventoryTypes);
      cur.value += lineAmount(r, customInventoryTypes);
      m.set(month, cur);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [reportInventoryRows, customInventoryTypes]);

  const reportByCustodian = useMemo(() => {
    const m = new Map<string, { qty: number; value: number; lines: number }>();
    for (const r of reportInventoryRows) {
      const key = r.custodian && r.custodian !== "" ? r.custodian : "";
      const cur = m.get(key) ?? { qty: 0, value: 0, lines: 0 };
      cur.qty += inventoryPrimaryQty(r, customInventoryTypes);
      cur.value += lineAmount(r, customInventoryTypes);
      cur.lines += 1;
      m.set(key, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [reportInventoryRows, customInventoryTypes]);

  const reportByType = useMemo(() => {
    const m = new Map<string, { qty: number; value: number; lines: number }>();
    for (const r of reportInventoryRows) {
      const label = kindLabel(r.itemKind, customInventoryTypes);
      const cur = m.get(label) ?? { qty: 0, value: 0, lines: 0 };
      cur.qty += inventoryPrimaryQty(r, customInventoryTypes);
      cur.value += lineAmount(r, customInventoryTypes);
      cur.lines += 1;
      m.set(label, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [reportInventoryRows, customInventoryTypes]);

  const reportInventoryRowsForItemName = useMemo(() => {
    if (reportItemNameKinds.size === 0) return reportInventoryRows;
    return reportInventoryRows.filter((r) => reportItemNameKinds.has(r.itemKind));
  }, [reportInventoryRows, reportItemNameKinds]);

  /** Aggregated by display name (multiple SKUs with the same name roll up together). */
  const reportByItemName = useMemo(() => {
    const m = new Map<string, { qty: number; value: number; lines: number; pieces: number }>();
    for (const r of reportInventoryRowsForItemName) {
      const key = r.itemName.trim() || "";
      const cur = m.get(key) ?? { qty: 0, value: 0, lines: 0, pieces: 0 };
      cur.qty += inventoryPrimaryQty(r, customInventoryTypes);
      cur.value += lineAmount(r, customInventoryTypes);
      cur.lines += 1;
      cur.pieces += r.pieces;
      m.set(key, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].value - a[1].value);
  }, [reportInventoryRowsForItemName, customInventoryTypes]);

  const reportLinesByCustodian = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const r of reportInventoryRows) {
      const key = r.custodian && r.custodian !== "" ? r.custodian : "";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.itemNo.localeCompare(b.itemNo));
    }
    return m;
  }, [reportInventoryRows]);

  const reportLinesByServerCustodian = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const r of reportInventoryRows) {
      const key = r.serverCustodianUserId ?? "";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.itemNo.localeCompare(b.itemNo));
    }
    return m;
  }, [reportInventoryRows]);

  const defaultFromLotTypeIdHub = useMemo(
    () => fromLotTypes.find((x) => (x.code || "").toLowerCase() === "rough")?.id ?? fromLotTypes[0]?.id ?? "",
    [fromLotTypes],
  );

  useEffect(() => {
    if (!fromLotOpen) return;
    if (!fromLotItemTypeIdHub && defaultFromLotTypeIdHub) setFromLotItemTypeIdHub(defaultFromLotTypeIdHub);
  }, [fromLotOpen, fromLotItemTypeIdHub, defaultFromLotTypeIdHub]);

  const toggleReportItemNameKind = useCallback((key: string) => {
    setReportItemNameKinds((prev) => {
      if (prev.size === 0) return new Set([key]);
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next.size ? next : new Set();
      }
      next.add(key);
      return next;
    });
  }, []);

  const items = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    // Ids of stock units currently active in the catalog. A sellable child is hidden from the
    // main table only when its parent is still an active stock unit (so it nests under it).
    // If the parent was consumed/sold (no longer active), the child is promoted to top-level so
    // it is never lost from view.
    const activeStockUnitIds = new Set(
      rows
        .filter((r) => r.entryType === "inventory")
        .map((r) => r.serverUnitId ?? r.id),
    );
    const filtered = rows.filter((r) => {
      if (itemCatalogScope === "stock" && r.entryType !== "inventory") return false;
      if (itemCatalogScope === "services" && r.entryType !== "service") return false;
      // Only stock units in the main table; sellable children nest under an active parent.
      // When searching, allow children through so users can still find a specific sellable code.
      if (itemCatalogScope === "stock" && !q && !isRootStockCatalogRow(r)) {
        const parentId = r.serverParentUnitId ?? null;
        if (parentId && activeStockUnitIds.has(parentId)) return false;
      }
      if (itemCatalogScope === "stock" && itemKindFilterKeys.size > 0 && !itemKindFilterKeys.has(r.itemKind)) return false;
      if (itemCatalogScope === "stock" && locationFilter !== "All" && r.location !== locationFilter) return false;
      if (periodFrom && r.date < periodFrom) return false;
      if (periodTo && r.date > periodTo) return false;
      if (!q) return true;
      const hay = [
        r.itemNo,
        r.itemName,
        kindLabel(r.itemKind, customInventoryTypes),
        r.grade,
        r.dimLength,
        r.dimWidth,
        r.dimHeight,
        formatSpecCell(r, customInventoryTypes),
        r.location,
        r.custodian,
        String(r.uom),
        r.date,
        r.details,
        r.entryType,
        r.serviceUnit,
        revenueAccountLabel(r.revenueAccountId),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    const next = [...filtered];
    next.sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      return dateSort === "asc" ? c : -c;
    });
    return next;
  }, [
    rows,
    itemSearch,
    locationFilter,
    periodFrom,
    periodTo,
    dateSort,
    customInventoryTypes,
    itemCatalogScope,
    itemKindFilterKeys,
  ]);

  /** Flattened rows + optional lot group headers for the stock catalog table (Phase 3). */
  const catalogTableEntries = useMemo(() => {
    type Entry = { kind: "row"; r: ItemRow } | { kind: "lot_header"; lotKey: string; title: string; rowCount: number };
    if (!groupCatalogByLot) {
      return items.map((r) => ({ kind: "row" as const, r }));
    }
    const by = new Map<string, ItemRow[]>();
    for (const r of items) {
      const k = r.serverPurchaseLotId ?? "__none__";
      const arr = by.get(k) ?? [];
      arr.push(r);
      by.set(k, arr);
    }
    const keys = Array.from(by.keys()).sort((a, b) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      const ta = lotBalances[a]?.lot_code ?? a;
      const tb = lotBalances[b]?.lot_code ?? b;
      return ta.localeCompare(tb);
    });
    const out: Entry[] = [];
    for (const k of keys) {
      const groupRows = by.get(k) ?? [];
      const title =
        k === "__none__"
          ? `No purchase lot (${groupRows.length})`
          : `${lotBalances[k]?.lot_code ?? `Lot ${k.slice(0, 8)}…`} (${groupRows.length})`;
      out.push({ kind: "lot_header", lotKey: k, title, rowCount: groupRows.length });
      if (!collapsedLotIds.has(k)) {
        for (const r of groupRows) out.push({ kind: "row", r });
      }
    }
    return out;
  }, [items, groupCatalogByLot, collapsedLotIds, lotBalances]);

  const formAmountPreview = useMemo(() => {
    if (itemForm.entryType === "service") {
      const rate = Number(itemForm.rate);
      if (!Number.isFinite(rate) || rate < 0) return null;
      return rate;
    }
    const u = Number(itemForm.uom);
    const p = Number(itemForm.pieces);
    const rate = Number(itemForm.rate);
    if (!Number.isFinite(rate) || rate < 0) return null;
    const amt = inventoryStockAmount(
      itemForm.itemTypeKey,
      Number.isFinite(u) ? u : 0,
      Number.isFinite(p) ? p : 0,
      rate,
      customInventoryTypes,
    );
    return amt;
  }, [itemForm.entryType, itemForm.uom, itemForm.pieces, itemForm.rate, itemForm.itemTypeKey, customInventoryTypes]);

  const activeUiMode = useMemo(
    () => getInventoryTypeUiMode(itemForm.itemTypeKey, customInventoryTypes),
    [itemForm.itemTypeKey, customInventoryTypes],
  );

  const activeCustomTypeDef = useMemo(
    () => customInventoryTypes.find((t) => t.id === itemForm.itemTypeKey),
    [customInventoryTypes, itemForm.itemTypeKey],
  );

  const uomFieldHint = useMemo(
    () => uomHintForKind(itemForm.itemTypeKey, customInventoryTypes),
    [itemForm.itemTypeKey, customInventoryTypes],
  );

  const stdRule = useCallback(
    (id: BuiltinStandardFieldId) =>
      resolveStandardFieldRule(
        id,
        itemForm.entryType === "inventory" && !isBuiltinKind(itemForm.itemTypeKey)
          ? activeCustomTypeDef?.standardFields
          : undefined,
      ),
    [itemForm.entryType, itemForm.itemTypeKey, activeCustomTypeDef],
  );

  const forceCloseItemModal = useCallback(() => {
    setDiscardConfirmOpen(false);
    setAddTypeModalOpen(false);
    setEditingInventoryTypeId(null);
    setItemModalOpen(false);
    setEditingItemId(null);
    setItemForm(emptyItemForm());
    setTrackEachPieceSeparately(false);
    setItemFormBaselineKey(null);
    setNewItemQrBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setNewItemQrUnitId(null);
  }, []);

  const requestCloseItemModal = useCallback(() => {
    if (itemFormBaselineKey === null || itemFormSnapshot(itemForm) === itemFormBaselineKey) {
      forceCloseItemModal();
      return;
    }
    setDiscardConfirmOpen(true);
  }, [itemForm, itemFormBaselineKey, forceCloseItemModal]);

  function openNewItemModal() {
    const initial = emptyItemForm();
    if (itemCatalogScope === "services") {
      initial.entryType = "service";
    }
    setEditingItemId(null);
    setDiscardConfirmOpen(false);
    setAddTypeModalOpen(false);
    setNewItemQrBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setNewItemQrUnitId(null);
    setTrackEachPieceSeparately(false);
    setItemForm(initial);
    setItemFormBaselineKey(itemFormSnapshot(initial));
    setItemModalOpen(true);
  }

  function openEditInventoryType(t: CustomInventoryType) {
    setAddTypeDraft(customInventoryTypeToAddDraft(t));
    setEditingInventoryTypeId(t.id);
    setAddTypeModalOpen(true);
    setViewAllTypesOpen(false);
  }

  async function deleteInventoryType(typeId: string) {
    const ok = await confirm({
      title: "Delete inventory type?",
      message: isServerUuid(typeId) && invFlags && inventoryWritesAllowed(invFlags)
        ? "Deactivate this type on the server? Existing stock lines keep their type; new lines should use another type."
        : "Delete this inventory type? Items using it will switch to Rough.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    if (getAccessToken() && invFlags && inventoryWritesAllowed(invFlags) && isServerUuid(typeId)) {
      try {
        await updateItemType(typeId, { is_active: false });
        await refetchInventoryCatalog();
        setItemForm((s) => (s.itemTypeKey === typeId ? { ...s, itemTypeKey: KIND_ROUGH, customFields: {} } : s));
        pushToast("Inventory type deactivated on the server.", "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Could not deactivate type", "error");
      }
      return;
    }
    setCustomInventoryTypes((prev) => prev.filter((x) => x.id !== typeId));
    setRows((prev) =>
      prev.map((r) => (r.itemKind === typeId ? { ...r, itemKind: KIND_ROUGH, customFieldValuesJson: "{}" } : r)),
    );
    setItemForm((s) => (s.itemTypeKey === typeId ? { ...s, itemTypeKey: KIND_ROUGH, customFields: {} } : s));
  }

  function openSplitParcel() {
    setSplitMode("parcels");
    setSplitPiecesCount("");
    setSplitPerPieceUom("");
    setSplitPerPieceRate("");
    setSplitSourceId("");
    setSplitRows([
      {
        id: crypto.randomUUID(),
        itemName: "",
        uom: "",
        pieces: "",
        rate: "",
      },
    ]);
    setSplitError(null);
    setSplitParcelOpen(true);
  }

  function openSplitParcelFromRow(r: ItemRow) {
    if (r.entryType !== "inventory") return;
    setSplitSourceId(r.id);
    setSplitError(null);
    setSplitRows([
      {
        id: crypto.randomUUID(),
        itemName: "",
        uom: "",
        pieces: "",
        rate: "",
      },
    ]);
    // When the stock unit has more than one piece, default to the common case:
    // break it into that many individual sellable pieces (one click, prefilled count).
    if (r.pieces > 1) {
      const perPiece = r.pieces > 0 ? r.uom / r.pieces : r.uom;
      setSplitMode("pieces");
      setSplitPiecesCount(String(r.pieces));
      setSplitPerPieceUom(String(perPiece));
      setSplitPerPieceRate(String(r.rate));
    } else {
      setSplitMode("parcels");
      setSplitPiecesCount("");
      setSplitPerPieceUom("");
      setSplitPerPieceRate("");
    }
    setSplitParcelOpen(true);
  }

  function openParcelLinesDrawer(r: ItemRow) {
    if (r.entryType !== "inventory") return;
    setParcelDrawerTab("children");
    setDrawerHistoryRows([]);
    setDrawerHistoryError(null);
    setLineageData(null);
    setLineageError(null);
    setParcelLinesParent(r);
  }

  function navigateLineageToStockUnit(unit: InvStockUnitDto) {
    const row = inventoryStockRows.find((x) => (x.serverUnitId ?? x.id) === unit.id);
    if (!row) {
      pushToast("This stock line isn't in the table yet — check your filters or refresh.", "info");
      return;
    }
    setDrawerHistoryRows([]);
    setDrawerHistoryError(null);
    setLineageData(null);
    setLineageError(null);
    setParcelDrawerTab("lineage");
    setParcelLinesParent(row);
  }

  function appendParcelFromLineHub(lineId: string, itemName: string, linePieces: number) {
    setFromLotParcelsHub((prev) => [
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

  async function submitFromLotHub() {
    if (!lotDetailHub) {
      pushToast("Select a purchase lot and wait for it to load.", "error");
      return;
    }
    if (!fromLotItemTypeIdHub) {
      pushToast("Pick an inventory item type.", "error");
      return;
    }
    const parcels = fromLotParcelsHub
      .map((p) => ({
        purchase_lot_line_id: p.purchase_lot_line_id,
        display_name: p.display_name.trim(),
        public_code: p.public_code.trim(),
        primary_uom_qty: p.primary_uom_qty.trim(),
        pieces: Number.parseInt(p.pieces, 10) || 0,
      }))
      .filter((p) => p.display_name && p.purchase_lot_line_id && Number(p.primary_uom_qty) > 0);
    if (!parcels.length) {
      pushToast("Add at least one parcel from a lot line and enter UOM quantity for each.", "error");
      return;
    }
    setFromLotSavingHub(true);
    try {
      await createStockUnitsFromPurchaseLot({
        purchase_lot_id: lotDetailHub.id,
        item_type_id: fromLotItemTypeIdHub,
        primary_uom_code: fromLotPrimaryUomCodeHub.trim() || "ct",
        parcels: parcels.map((p) => ({
          purchase_lot_line_id: p.purchase_lot_line_id,
          display_name: p.display_name,
          primary_uom_qty: p.primary_uom_qty,
          pieces: p.pieces,
          ...(p.public_code ? { public_code: p.public_code } : {}),
        })),
        client_ref: `hub-from-lot-${Date.now()}`,
      });
      setFromLotOpen(false);
      setSelectedLotCodeHub("");
      setLotDetailHub(null);
      setFromLotParcelsHub([]);
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
      pushToast("Stock lines were created from the purchase lot.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Receive from lot failed", "error");
    } finally {
      setFromLotSavingHub(false);
    }
  }

  // -------- Phase 1: lot mass-balance + receive modes ------------------

  const refreshLotBalance = useCallback(
    async (lotId: string | undefined | null) => {
      if (!lotId || !getAccessToken()) return;
      try {
        const bal = await fetchLotBalance(lotId);
        setLotBalances((prev) => ({ ...prev, [lotId]: bal }));
      } catch {
        // Non-fatal: balance strip just disappears for that lot.
      }
    },
    [],
  );

  /** Mode A: split this lot line into N equal parcels. */
  async function submitAutoSplitLine(lineId: string) {
    if (!lotDetailHub) return;
    if (!fromLotItemTypeIdHub) {
      pushToast("Pick an inventory item type first.", "error");
      return;
    }
    const draft = autoSplitDraft[lineId] ?? { n: "", basis: "equal_weight" };
    const n = Number.parseInt(draft.n, 10);
    if (!Number.isFinite(n) || n < 1) {
      pushToast("Enter how many parcels to create (1 or more).", "error");
      return;
    }
    setFromLotSavingHub(true);
    try {
      const created = await autoSplitLotLine(lotDetailHub.id, lineId, {
        item_type_id: fromLotItemTypeIdHub,
        n_parcels: n,
        basis: draft.basis,
        primary_uom_code: fromLotPrimaryUomCodeHub.trim() || "ct",
        client_ref: `hub-auto-split-${lineId}-${Date.now()}`,
      });
      pushToast(`Auto-split created ${created.length} parcel(s).`, "success");
      setAutoSplitDraft((prev) => ({ ...prev, [lineId]: { n: "", basis: draft.basis } }));
      await refreshLotBalance(lotDetailHub.id);
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Auto-split failed", "error");
    } finally {
      setFromLotSavingHub(false);
    }
  }

  /** Mode B: persist user-typed parcels for the FIRST lot line referenced (mass-balance enforced). */
  async function submitCustomSplitFromHub() {
    if (!lotDetailHub) {
      pushToast("Select a purchase lot and wait for it to load.", "error");
      return;
    }
    if (!fromLotItemTypeIdHub) {
      pushToast("Pick an inventory item type first.", "error");
      return;
    }
    if (!fromLotParcelsHub.length) {
      pushToast("Add at least one parcel row from a lot line.", "error");
      return;
    }
    // Group parcels by purchase_lot_line_id, then submit one custom-split per line.
    const byLine = new Map<string, typeof fromLotParcelsHub>();
    for (const p of fromLotParcelsHub) {
      const key = p.purchase_lot_line_id;
      if (!key) continue;
      const arr = byLine.get(key) ?? [];
      arr.push(p);
      byLine.set(key, arr);
    }
    if (!byLine.size) {
      pushToast("Each parcel must be linked to a lot line.", "error");
      return;
    }
    setFromLotSavingHub(true);
    try {
      let totalCreated = 0;
      for (const [lineId, parcels] of byLine.entries()) {
        const cleanParcels = parcels
          .map((p) => ({
            display_name: p.display_name.trim(),
            public_code: p.public_code.trim(),
            primary_uom_qty: p.primary_uom_qty.trim() || "0",
            pieces: Number.parseInt(p.pieces, 10) || 0,
          }))
          .filter((p) => p.display_name);
        if (!cleanParcels.length) continue;
        const created = await customSplitLotLine(lotDetailHub.id, lineId, {
          item_type_id: fromLotItemTypeIdHub,
          parcels: cleanParcels,
          primary_uom_code: fromLotPrimaryUomCodeHub.trim() || "ct",
          variance_reason: customSplitVarianceReason || null,
          variance_memo: customSplitVarianceMemo,
          client_ref: `hub-custom-split-${lineId}-${Date.now()}`,
        });
        totalCreated += created.length;
      }
      pushToast(`Custom split created ${totalCreated} parcel(s).`, "success");
      setFromLotOpen(false);
      setSelectedLotCodeHub("");
      setLotDetailHub(null);
      setFromLotParcelsHub([]);
      setCustomSplitVarianceReason("");
      setCustomSplitVarianceMemo("");
      await refreshLotBalance(lotDetailHub.id);
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Custom split failed";
      // 422 with code lot_split_variance_unexplained means user must pick a reason.
      if (msg.toLowerCase().includes("variance")) {
        pushToast("Sums do not equal the lot. Pick a variance reason and retry.", "error");
      } else {
        pushToast(msg, "error");
      }
    } finally {
      setFromLotSavingHub(false);
    }
  }

  /** Live mass-balance preview across all parcels currently typed in Mode B. */
  const customSplitTotals = useMemo(() => {
    let qtySum = 0;
    let pcSum = 0;
    for (const p of fromLotParcelsHub) {
      const qty = Number(p.primary_uom_qty);
      if (Number.isFinite(qty) && qty > 0) qtySum += qty;
      const pc = Number.parseInt(p.pieces, 10);
      if (Number.isFinite(pc) && pc > 0) pcSum += pc;
    }
    let lotQty = 0;
    let lotPc = 0;
    if (lotDetailHub) {
      // Sum only the lot lines that have at least one typed parcel referencing them.
      const referenced = new Set(fromLotParcelsHub.map((p) => p.purchase_lot_line_id).filter(Boolean));
      for (const ln of lotDetailHub.lines) {
        if (!referenced.has(ln.id)) continue;
        lotQty += Number(ln.quantity) || 0;
        lotPc += Number(ln.pieces) || 0;
      }
    }
    const varianceQty = Math.round((lotQty - qtySum) * 10000) / 10000;
    const variancePc = lotPc - pcSum;
    return { qtySum, pcSum, lotQty, lotPc, varianceQty, variancePc };
  }, [fromLotParcelsHub, lotDetailHub]);

  // -------- Phase 1: row-level actions (adjust / rebalance / loss) -----

  function openAdjustWeight(r: ItemRow) {
    if (r.entryType !== "inventory") return;
    if (r.isLocked) {
      pushToast("This parcel is locked (sold/frozen) and cannot be adjusted.", "error");
      return;
    }
    setAdjustWeightTarget(r);
    setAdjustWeightDraft({
      qty: String(r.uom),
      pieces: String(r.pieces),
      reason: "re_measure",
      memo: "",
    });
  }

  async function submitAdjustWeight() {
    if (!adjustWeightTarget) return;
    const unitId = adjustWeightTarget.serverUnitId ?? adjustWeightTarget.id;
    if (!isServerUuid(unitId)) {
      pushToast("Local-only row. Save to server first.", "error");
      return;
    }
    const qty = Number(adjustWeightDraft.qty);
    const pieces = Number.parseInt(adjustWeightDraft.pieces, 10);
    if (!Number.isFinite(qty) || qty < 0) {
      pushToast("Enter a valid weight.", "error");
      return;
    }
    if (!Number.isFinite(pieces) || pieces < 0) {
      pushToast("Enter a valid piece count.", "error");
      return;
    }
    setAdjustWeightSaving(true);
    try {
      await adjustStockUnitWeight(unitId, {
        primary_uom_qty: String(qty),
        pieces,
        reason: adjustWeightDraft.reason,
        memo: adjustWeightDraft.memo,
        expected_row_version: adjustWeightTarget.rowVersion ?? null,
        client_ref: `hub-adjust-${unitId}-${Date.now()}`,
      });
      pushToast("Weight adjusted; reason logged.", "success");
      setAdjustWeightTarget(null);
      await refreshLotBalance(adjustWeightTarget.serverPurchaseLotId);
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Adjust weight failed", "error");
    } finally {
      setAdjustWeightSaving(false);
    }
  }

  function openRebalance(r: ItemRow) {
    if (r.entryType !== "inventory") return;
    if (r.isLocked) {
      pushToast("This parcel is locked (sold/frozen) and cannot be adjusted.", "error");
      return;
    }
    setRebalanceTarget(r);
    setRebalanceDraft({ toUnitId: "", qty: "", pieces: "0", reason: "re_measure", memo: "" });
  }

  /** Sibling parcels (same lot) the user can rebalance INTO. */
  const rebalanceSiblingOptions = useMemo(() => {
    if (!rebalanceTarget) return [] as { id: string; label: string }[];
    const lotId = rebalanceTarget.serverPurchaseLotId;
    if (!lotId) return [];
    return rows
      .filter(
        (r) =>
          r.entryType === "inventory" &&
          r.serverPurchaseLotId === lotId &&
          (r.serverUnitId ?? r.id) !== (rebalanceTarget.serverUnitId ?? rebalanceTarget.id) &&
          isServerUuid(r.serverUnitId ?? r.id) &&
          !r.isLocked,
      )
      .map((r) => ({ id: r.serverUnitId ?? r.id, label: `${r.itemName} (${r.uom} ${rebalanceTarget?.itemNo ? "" : ""}${r.itemNo ? `, ${r.itemNo}` : ""})` }));
  }, [rebalanceTarget, rows]);

  async function submitRebalance() {
    if (!rebalanceTarget) return;
    const fromUnitId = rebalanceTarget.serverUnitId ?? rebalanceTarget.id;
    if (!isServerUuid(fromUnitId)) {
      pushToast("Local-only row. Save to server first.", "error");
      return;
    }
    if (!rebalanceDraft.toUnitId) {
      pushToast("Pick a sibling parcel to receive the moved weight.", "error");
      return;
    }
    const qty = Number(rebalanceDraft.qty);
    const pieces = Number.parseInt(rebalanceDraft.pieces, 10) || 0;
    if ((!Number.isFinite(qty) || qty <= 0) && pieces <= 0) {
      pushToast("Enter qty and/or pieces to move (must be > 0).", "error");
      return;
    }
    setRebalanceSaving(true);
    try {
      await rebalanceStockUnits({
        from_unit_id: fromUnitId,
        to_unit_id: rebalanceDraft.toUnitId,
        qty_delta: String(Math.max(0, qty || 0)),
        pieces_delta: pieces,
        reason: rebalanceDraft.reason,
        memo: rebalanceDraft.memo,
        client_ref: `hub-rebal-${fromUnitId}-${Date.now()}`,
      });
      pushToast("Weight moved between parcels; lot still balances.", "success");
      setRebalanceTarget(null);
      await refreshLotBalance(rebalanceTarget.serverPurchaseLotId);
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Rebalance failed", "error");
    } finally {
      setRebalanceSaving(false);
    }
  }

  function openRecordLoss(r: ItemRow) {
    if (r.entryType !== "inventory") return;
    if (r.isLocked) {
      pushToast("This parcel is locked (sold/frozen) and cannot be adjusted.", "error");
      return;
    }
    setLossTarget(r);
    setLossDraft({ qty: "", pieces: "0", reason: "dust", memo: "" });
  }

  async function submitRecordLoss() {
    if (!lossTarget) return;
    const unitId = lossTarget.serverUnitId ?? lossTarget.id;
    if (!isServerUuid(unitId)) {
      pushToast("Local-only row. Save to server first.", "error");
      return;
    }
    const qty = Number(lossDraft.qty);
    const pieces = Number.parseInt(lossDraft.pieces, 10) || 0;
    if ((!Number.isFinite(qty) || qty <= 0) && pieces <= 0) {
      pushToast("Enter qty and/or pieces lost (must be > 0).", "error");
      return;
    }
    setLossSaving(true);
    try {
      await recordStockLoss(unitId, {
        qty: String(Math.max(0, qty || 0)),
        pieces,
        reason: lossDraft.reason,
        memo: lossDraft.memo,
        expected_row_version: lossTarget.rowVersion ?? null,
        client_ref: `hub-loss-${unitId}-${Date.now()}`,
      });
      pushToast("Loss recorded; lot mass-balance updated.", "success");
      setLossTarget(null);
      await refreshLotBalance(lossTarget.serverPurchaseLotId);
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Record loss failed", "error");
    } finally {
      setLossSaving(false);
    }
  }

  async function toggleStockLock(r: ItemRow) {
    const unitId = r.serverUnitId ?? r.id;
    if (!isServerUuid(unitId)) {
      pushToast("Local-only row. Save to server first.", "error");
      return;
    }
    try {
      if (r.isLocked) {
        await unfreezeStockUnit(unitId);
        pushToast("Stock unit unlocked.", "success");
      } else {
        await freezeStockUnit(unitId, { lock_reason: "Manually locked from inventory hub" });
        pushToast("Stock unit locked. Adjustments are now refused.", "success");
      }
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Lock toggle failed", "error");
    }
  }

  async function openRowStockLabelPdf(r: ItemRow) {
    const uid = r.serverUnitId ?? r.id;
    if (!isServerUuid(uid)) {
      pushToast("Labels / QR are only available for lines saved on the server.", "info");
      return;
    }
    try {
      const blob = await fetchStockUnitLabelPdf(uid, "single");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not open the label PDF.", "error");
    }
  }

  async function openCutWizard(r: ItemRow) {
    if (r.entryType !== "inventory") return;
    if (!getAccessToken()) {
      pushToast("Sign in to cut on the server.", "error");
      return;
    }
    if (!isServerUuid(r.serverUnitId ?? r.id)) {
      pushToast("Local-only row. Save to the server first.", "error");
      return;
    }
    if (r.isLocked) {
      pushToast("This parcel is locked and cannot be cut.", "error");
      return;
    }
    if (getInventoryTypeUiMode(r.itemKind, customInventoryTypes) !== "rough") {
      pushToast("Only rough-style items can be sent to cutting.", "error");
      return;
    }
    if (!(r.uom > 0)) {
      pushToast("Nothing left to cut on this line (weight is zero).", "error");
      return;
    }
    let types = cutWizardTypes;
    if (!types.length) {
      try {
        types = await fetchItemTypes();
        setCutWizardTypes(types);
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Could not load item types", "error");
        return;
      }
    }
    const cutId = types.find((t) => (t.code || "").toLowerCase() === "cut")?.id ?? "";
    setCutCutTypeIdHub(cutId);
    setCutWizardSource(r);
    setCutOutputRows([
      {
        id: crypto.randomUUID(),
        display_name: `${r.itemName || "Rough"} — Cut 1`.slice(0, 512),
        primary_uom_qty: "",
        pieces: "1",
        public_code: "",
      },
    ]);
    setCutLossReason("");
    setCutMemo("");
  }

  async function submitCutWizard() {
    if (!cutWizardSource) return;
    const unitId = cutWizardSource.serverUnitId ?? cutWizardSource.id;
    if (!cutCutTypeIdHub) {
      pushToast("Pick the Cut inventory type.", "error");
      return;
    }
    const outs = cutOutputRows
      .map((row) => ({
        display_name: row.display_name.trim(),
        public_code: row.public_code.trim(),
        primary_uom_qty: row.primary_uom_qty.trim(),
        pieces: Number.parseInt(row.pieces, 10) || 0,
      }))
      .filter((o) => o.display_name && Number(o.primary_uom_qty) > 0);
    if (!outs.length) {
      pushToast("Add at least one cut line with a name and positive weight.", "error");
      return;
    }
    const sumQty = outs.reduce((a, o) => a + Number(o.primary_uom_qty), 0);
    const sumPc = outs.reduce((a, o) => a + o.pieces, 0);
    const lossQty = cutWizardSource.uom - sumQty;
    const lossPc = cutWizardSource.pieces - sumPc;
    const needsReason = lossQty > 0.0001 || lossPc > 0;
    if (needsReason && !cutLossReason) {
      pushToast("Pick a loss reason — cutting removed weight or pieces vs the rough parcel.", "error");
      return;
    }
    const lotIdForRefresh = cutWizardSource.serverPurchaseLotId ?? null;
    setCutSaving(true);
    try {
      await cutStockUnit(unitId, {
        cut_item_type_id: cutCutTypeIdHub,
        outputs: outs.map((o) => ({
          display_name: o.display_name,
          primary_uom_qty: String(o.primary_uom_qty),
          pieces: o.pieces,
          ...(o.public_code ? { public_code: o.public_code } : {}),
        })),
        loss_reason: cutLossReason || null,
        memo: cutMemo,
        expected_source_row_version: cutWizardSource.rowVersion ?? null,
        client_ref: `hub-cut-${unitId}-${Date.now()}`,
      });
      pushToast("Cut completed. Rough line is consumed; new cut lines were created.", "success");
      setCutWizardSource(null);
      if (lotIdForRefresh) void refreshLotBalance(lotIdForRefresh);
      if (inventoryCatalogSource === "server" || (invFlags && catalogShouldLoadFromServer(invFlags))) {
        await refetchInventoryCatalog();
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Cut failed", "error");
    } finally {
      setCutSaving(false);
    }
  }

  // Refresh lot balance whenever a relevant lot is referenced in the catalog.
  useEffect(() => {
    if (!getAccessToken()) return;
    const lotIds = new Set<string>();
    for (const r of rows) {
      if (r.serverPurchaseLotId) lotIds.add(r.serverPurchaseLotId);
    }
    for (const lotId of lotIds) {
      if (!lotBalances[lotId]) void refreshLotBalance(lotId);
    }
    // Intentional: only re-run when the rows array identity changes; balances cache is updated in-place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // History tab inside the parcel-lines drawer: lazy-load on tab switch.
  useEffect(() => {
    if (!parcelLinesParent || parcelDrawerTab !== "history") return;
    const unitId = parcelLinesParent.serverUnitId ?? parcelLinesParent.id;
    if (!isServerUuid(unitId)) {
      setDrawerHistoryRows([]);
      setDrawerHistoryError("Local-only row. Save to server to see history.");
      return;
    }
    setDrawerHistoryLoading(true);
    setDrawerHistoryError(null);
    fetchStockUnitMovements(unitId, 100)
      .then((mvs) => setDrawerHistoryRows(mvs))
      .catch((err) => setDrawerHistoryError(err instanceof Error ? err.message : "Could not load history"))
      .finally(() => setDrawerHistoryLoading(false));
  }, [parcelLinesParent, parcelDrawerTab]);

  // Lineage tab (Phase 3): lazy-load family tree.
  useEffect(() => {
    if (!parcelLinesParent || parcelDrawerTab !== "lineage") return;
    const unitId = parcelLinesParent.serverUnitId ?? parcelLinesParent.id;
    if (!isServerUuid(unitId)) {
      setLineageData(null);
      setLineageError("Local-only row. Save to server to see lineage.");
      return;
    }
    setLineageLoading(true);
    setLineageError(null);
    setLineageData(null);
    fetchStockUnitLineage(unitId)
      .then((d) => setLineageData(d))
      .catch((err) => setLineageError(err instanceof Error ? err.message : "Could not load lineage"))
      .finally(() => setLineageLoading(false));
  }, [parcelLinesParent, parcelDrawerTab]);

  useEffect(() => {
    if (!newItemQrUnitId || !getAccessToken()) {
      setNewItemQrBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    void fetchStockUnitQrPng(newItemQrUnitId, 256)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setNewItemQrBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(() => {
        if (!cancelled) pushToast("Could not load the QR image from the server.", "error");
      });
    return () => {
      cancelled = true;
    };
  }, [newItemQrUnitId, pushToast]);

  // Reset lazy drawer payloads when the parent row changes (tab is set by open handlers).
  useEffect(() => {
    if (parcelLinesParent) {
      setDrawerHistoryRows([]);
      setDrawerHistoryError(null);
      setLineageData(null);
      setLineageError(null);
    }
  }, [parcelLinesParent]);

  function addSplitRow() {
    setSplitError(null);
    setSplitRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemName: "",
        uom: "",
        pieces: "",
        rate: "",
      },
    ]);
  }

  function removeSplitRow(id: string) {
    setSplitError(null);
    setSplitRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.id !== id)));
  }

  function updateSplitRow(id: string, key: keyof Omit<SplitDraftRow, "id">, value: string) {
    setSplitError(null);
    setSplitRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function splitValidationMessage(): string | null {
    if (!splitSourceRow) return "Select a parcel / lot to split.";

    if (splitMode === "pieces") {
      const n = Number.parseInt(splitPiecesCount.trim(), 10);
      if (!Number.isFinite(n) || n < 1) return "Enter how many pieces to break out (whole number, at least 1).";
      if (n > splitSourceRow.pieces) return `You can break out at most ${splitSourceRow.pieces} piece(s) on this line.`;
      const perU = Number(splitPerPieceUom);
      if (!Number.isFinite(perU) || perU <= 0) return "Enter a positive weight (UOM) for each new piece row.";
      const totalOut = n * perU;
      if (totalOut - splitSourceRow.uom > 1e-6) return "Pieces × per-piece weight cannot exceed parent UOM.";
      if (splitPerPieceRate.trim() !== "") {
        const rate = Number(splitPerPieceRate);
        if (!Number.isFinite(rate) || rate < 0) return "Invalid per-piece rate.";
      }
      return null;
    }

    if (!splitRows.length) return "Add at least one split row.";

    let hasSplitValue = false;
    for (const [index, row] of splitRows.entries()) {
      const uom = Number(row.uom);
      const pieces = Number(row.pieces);
      const hasUom = Number.isFinite(uom) && uom > 0;
      const hasPieces = Number.isFinite(pieces) && pieces > 0;
      if (hasUom || hasPieces) hasSplitValue = true;
      if (row.itemName.trim() === "") return `Enter new item name in row ${index + 1}.`;
      if (row.uom.trim() !== "" && (!Number.isFinite(uom) || uom < 0)) return `Invalid UOM in row ${index + 1}.`;
      if (row.pieces.trim() !== "" && (!Number.isFinite(pieces) || pieces < 0)) return `Invalid pieces in row ${index + 1}.`;
      if (row.rate.trim() !== "") {
        const rate = Number(row.rate);
        if (!Number.isFinite(rate) || rate < 0) return `Invalid rate in row ${index + 1}.`;
      }
    }

    if (!hasSplitValue) return "Enter UOM or pieces in at least one split row.";
    if (splitTotals.uom > splitSourceRow.uom) return "Split UOM exceeds available source UOM.";
    if (splitTotals.pieces > splitSourceRow.pieces) return "Split pieces exceed available source pieces.";
    return null;
  }

  async function submitSplitParcel() {
    const validation = splitValidationMessage();
    if (validation) {
      setSplitError(validation);
      return;
    }
    if (!splitSourceRow) return;

    if (
      getAccessToken() &&
      invFlags &&
      inventoryWritesAllowed(invFlags) &&
      isServerUuid(splitSourceRow.id) &&
      !inventorySplitAllowed(invFlags)
    ) {
      pushToast("Splits are disabled for this business (disable_client_split).", "error");
      return;
    }

    const apiWrite = Boolean(getAccessToken() && invFlags && inventoryWritesAllowed(invFlags));
    const apiSplit = apiWrite && inventorySplitAllowed(invFlags) && isServerUuid(splitSourceRow.id);

    if (splitMode === "pieces" && apiSplit) {
      setSplitBusy(true);
      setSplitError(null);
      try {
        const n = Number.parseInt(splitPiecesCount.trim(), 10);
        const perU = Number(splitPerPieceUom);
        const rateRaw = splitPerPieceRate.trim() === "" ? splitSourceRow.rate : Number(splitPerPieceRate);
        const parsedRate = Number.isFinite(rateRaw) && rateRaw >= 0 ? rateRaw : splitSourceRow.rate;
        const parent = splitSourceRow;
        const children = buildBreakIntoPiecesSplitChildren(
          parent.itemName,
          parent.itemNo || parent.itemName,
          n,
          perU,
          parsedRate,
        );
        const created = await splitStockUnits({
          source_unit_id: parent.id,
          children,
          client_ref: `hub-split-pieces-${Date.now()}`,
          expected_source_row_version: parent.rowVersion ?? 1,
        });
        await refetchInventoryCatalog();
        setSplitParcelOpen(false);
        setSplitError(null);
        pushToast(`Pieces split saved (${created.length} new line(s)). Opening label sheet…`, "success");
        try {
          const blob = await fetchStockUnitLabelsBatchPdf({
            stock_unit_ids: created.map((c) => c.id),
            layout: "3x6",
          });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank", "noopener,noreferrer");
          window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
        } catch {
          pushToast("Could not open the label PDF — the split was still saved.", "info");
        }
      } catch (err) {
        setSplitError(err instanceof Error ? err.message : "Split failed");
        pushToast(err instanceof Error ? err.message : "Split failed", "error");
      } finally {
        setSplitBusy(false);
      }
      return;
    }

    if (splitMode === "parcels" && apiSplit) {
      setSplitBusy(true);
      setSplitError(null);
      try {
        const children = splitRows
          .map((row) => {
            const uom = Number(row.uom);
            const pieces = Number(row.pieces);
            const parsedUom = Number.isFinite(uom) && uom > 0 ? uom : 0;
            const parsedPieces = Number.isFinite(pieces) && pieces > 0 ? Math.floor(pieces) : 0;
            if (parsedUom <= 0 && parsedPieces <= 0) return null;
            const rate = Number(row.rate);
            const parsedRate = Number.isFinite(rate) && rate >= 0 ? rate : splitSourceRow.rate;
            const cost = parsedRate * (parsedUom > 0 ? parsedUom : 1);
            const slug = row.itemName.trim().replace(/[^\w.-]+/g, "_").slice(0, 40) || "child";
            return {
              display_name: row.itemName.trim(),
              public_code: `${slug}-${Date.now().toString(36)}`.slice(0, 80),
              primary_uom_qty: String(parsedUom > 0 ? parsedUom : 0),
              pieces: parsedPieces,
              cost_basis_total: parsedUom > 0 || parsedPieces > 0 ? String(Math.max(0, cost)) : null,
            };
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);
        if (!children.length) {
          setSplitError("Add at least one child with quantity.");
          setSplitBusy(false);
          return;
        }
        await splitStockUnits({
          source_unit_id: splitSourceRow.id,
          children,
          client_ref: `hub-split-${Date.now()}`,
          expected_source_row_version: splitSourceRow.rowVersion ?? 1,
        });
        await refetchInventoryCatalog();
        setSplitParcelOpen(false);
        setSplitError(null);
        pushToast(`Split saved on the server (${children.length} child line(s)).`, "success");
      } catch (err) {
        setSplitError(err instanceof Error ? err.message : "Split failed");
        pushToast(err instanceof Error ? err.message : "Split failed", "error");
      } finally {
        setSplitBusy(false);
      }
      return;
    }
    if (splitMode === "pieces") {
      const nowPieces = Date.now();
      const n = Number.parseInt(splitPiecesCount.trim(), 10);
      const perU = Number(splitPerPieceUom);
      const rateRaw = splitPerPieceRate.trim() === "" ? splitSourceRow.rate : Number(splitPerPieceRate);
      const parsedRate = Number.isFinite(rateRaw) && rateRaw >= 0 ? rateRaw : splitSourceRow.rate;
      const parent = splitSourceRow;
      const existingNos = new Set(rows.map((r) => r.itemNo.trim()).filter((s) => s !== ""));
      const sourceBaseNo = parent.itemNo.trim() || `LOT-${nowPieces}`;
      let splitSeq = 1;
      const nextItemNo = () => {
        while (existingNos.has(`${sourceBaseNo}-P${splitSeq}`)) splitSeq += 1;
        const next = `${sourceBaseNo}-P${splitSeq}`;
        existingNos.add(next);
        splitSeq += 1;
        return next;
      };
      const newRows: ItemRow[] = Array.from({ length: n }, (_, i) => ({
        ...parent,
        id: `split-${nowPieces}-pc-${i}-${Math.random().toString(36).slice(2, 8)}`,
        itemNo: nextItemNo(),
        itemName: `${parent.itemName} #${i + 1}`.slice(0, 512),
        uom: perU,
        pieces: 1,
        rate: parsedRate,
        details: `Pieces split from ${parent.itemNo || parent.itemName}${parent.details ? ` | ${parent.details}` : ""}`,
      } satisfies ItemRow));
      const remainingUom = Math.max(0, parent.uom - n * perU);
      const remainingPieces = Math.max(0, parent.pieces - n);
      const sourceMarked = remainingUom === 0 && remainingPieces === 0 ? "Consumed by split" : "Split";
      setRows((prev) => [
        ...newRows,
        ...prev.map((r) =>
          r.id !== parent.id
            ? r
            : {
                ...r,
                uom: remainingUom,
                pieces: remainingPieces,
                details: `${sourceMarked}: ${newRows.length} piece row(s).${r.details ? ` | ${r.details}` : ""}`,
              },
        ),
      ]);
      setSplitParcelOpen(false);
      setSplitError(null);
      pushToast(`Local pieces split: ${newRows.length} new line(s).`, "success");
      return;
    }

    const now = Date.now();
    const existingNos = new Set(rows.map((r) => r.itemNo.trim()).filter((s) => s !== ""));
    const sourceBaseNo = splitSourceRow.itemNo.trim() || `LOT-${now}`;
    let splitSeq = 1;
    const nextItemNo = () => {
      while (existingNos.has(`${sourceBaseNo}-S${splitSeq}`)) splitSeq += 1;
      const next = `${sourceBaseNo}-S${splitSeq}`;
      existingNos.add(next);
      splitSeq += 1;
      return next;
    };

    const newRows: ItemRow[] = splitRows
      .map((row, index) => {
        const uom = Number(row.uom);
        const pieces = Number(row.pieces);
        const parsedUom = Number.isFinite(uom) && uom > 0 ? uom : 0;
        const parsedPieces = Number.isFinite(pieces) && pieces > 0 ? Math.floor(pieces) : 0;
        if (parsedUom <= 0 && parsedPieces <= 0) return null;
        const rate = Number(row.rate);
        const parsedRate = Number.isFinite(rate) && rate >= 0 ? rate : splitSourceRow.rate;
        return {
          ...splitSourceRow,
          id: `split-${now}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          itemNo: nextItemNo(),
          itemName: row.itemName.trim(),
          uom: parsedUom,
          pieces: parsedPieces,
          rate: parsedRate,
          details: `Split from ${splitSourceRow.itemNo || splitSourceRow.itemName}${splitSourceRow.details ? ` | ${splitSourceRow.details}` : ""}`,
        } satisfies ItemRow;
      })
      .filter((row): row is ItemRow => row !== null);

    const remainingUom = Math.max(0, splitSourceRow.uom - splitTotals.uom);
    const remainingPieces = Math.max(0, splitSourceRow.pieces - splitTotals.pieces);
    const sourceMarked = remainingUom === 0 && remainingPieces === 0 ? "Consumed by split" : "Split";

    setRows((prev) =>
      [...
        newRows,
        ...prev.map((r) =>
          r.id !== splitSourceRow.id
            ? r
            : {
                ...r,
                uom: remainingUom,
                pieces: remainingPieces,
                details: `${sourceMarked}: ${newRows.length} child parcel(s).${r.details ? ` | ${r.details}` : ""}`,
              },
        ),
      ],
    );

    setSplitParcelOpen(false);
    setSplitError(null);
    pushToast(`Parcel split complete (local only). Created ${newRows.length} new parcel(s).`, "success");
  }

  function openEditItemModal(row: ItemRow) {
    let customFields: Record<string, string> = parseCustomFieldValues(row.customFieldValuesJson);
    const ct = customInventoryTypes.find((t) => t.id === row.itemKind);
    if (ct?.builderFields?.length) {
      const m = { ...customFields };
      for (const f of ct.builderFields) {
        if (!(f.id in m)) m[f.id] = "";
      }
      customFields = m;
    } else {
      customFields = {};
    }
    const next: ItemFormState = {
      entryType: row.entryType,
      imageDataUrl: row.imageDataUrl,
      itemTypeKey: row.itemKind,
      itemNo: row.itemNo,
      itemName: row.itemName,
      type: row.type,
      grade: row.grade === "" ? "" : row.grade,
      dimLength: row.dimLength === "" ? "" : row.dimLength,
      dimWidth: row.dimWidth === "" ? "" : row.dimWidth,
      dimHeight: row.dimHeight === "" ? "" : row.dimHeight,
      customFields,
      pieces: String(row.pieces),
      rate: String(row.rate),
      location: row.location === "" ? "" : row.location,
      custodian: row.custodian === "" ? "" : row.custodian,
      uom: String(row.uom),
      date: row.date,
      details: row.details === "" ? "" : row.details,
      serviceUnit: row.serviceUnit === "" ? "" : row.serviceUnit,
      revenueAccountId: row.revenueAccountId ?? (row.entryType === "service" ? "8" : ""),
      linkedRoughLotCode: row.linkedRoughLotCode ?? "",
    };
    setEditingItemId(row.id);
    setDiscardConfirmOpen(false);
    setAddTypeModalOpen(false);
    setNewItemQrBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setNewItemQrUnitId(null);
    setItemForm(next);
    setItemFormBaselineKey(itemFormSnapshot(next));
    setItemModalOpen(true);
  }

  useEffect(() => {
    if (!itemModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (addTypeModalOpen) {
        setAddTypeModalOpen(false);
        setEditingInventoryTypeId(null);
        return;
      }
      if (discardConfirmOpen) {
        setDiscardConfirmOpen(false);
      } else {
        requestCloseItemModal();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [itemModalOpen, discardConfirmOpen, addTypeModalOpen, requestCloseItemModal]);

  useEffect(() => {
    if (!viewAllTypesOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewAllTypesOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewAllTypesOpen]);

  useEffect(() => {
    if (!addTypeModalOpen || itemModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setAddTypeModalOpen(false);
      setEditingInventoryTypeId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addTypeModalOpen, itemModalOpen]);

  async function deleteItem(id: string) {
    const row = rows.find((r) => r.id === id);
    const apiWrite = Boolean(getAccessToken() && invFlags && inventoryWritesAllowed(invFlags));
    const ok = await confirm({
      title: "Delete item?",
      message:
        row?.entryType === "inventory" && isServerUuid(id) && apiWrite
          ? "Void this stock line on the server? It will be marked void in inventory."
          : row?.entryType === "service" && isServerUuid(id) && apiWrite
            ? "Deactivate this service on the server?"
            : "Delete this item? This cannot be undone in the demo.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    if (row?.entryType === "service" && isServerUuid(id) && apiWrite) {
      try {
        await updateService(id, { is_active: false });
        await refetchInventoryCatalog();
        pushToast("Service deactivated on the server.", "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Deactivate failed", "error");
      }
      return;
    }
    if (row?.entryType === "inventory" && isServerUuid(id) && apiWrite) {
      try {
        await voidStockUnit(id, "Deleted from Inventory Hub");
        await refetchInventoryCatalog();
        pushToast("Stock line voided on the server.", "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Void failed", "error");
      }
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleImportFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const invalid = list.filter((f) => {
      const n = f.name.toLowerCase();
      return !n.endsWith(".csv") && !n.endsWith(".xlsx") && !n.endsWith(".xls");
    });
    if (invalid.length) {
      pushToast("Only Excel (.xlsx, .xls) and CSV files are allowed for import.", "error");
      return;
    }
    pushToast(
      `Demo: received ${list.length} file(s): ${list.map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`).join(", ")}. Parse on the server and upsert items.`,
      "info",
    );
  }

  function isUuidString(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
  }

  async function submitItemForm(e: React.FormEvent) {
    e.preventDefault();
    const wasEdit = Boolean(editingItemId);
    const apiWrite = Boolean(getAccessToken() && invFlags && inventoryWritesAllowed(invFlags));

    if (itemForm.entryType === "service") {
      if (!itemForm.itemName.trim()) {
        pushToast("Enter a service name.", "error");
        return;
      }
      const rate = Number(itemForm.rate);
      if (!Number.isFinite(rate) || rate < 0) {
        pushToast("Enter a valid rate / price.", "error");
        return;
      }
      if (!apiWrite && !itemForm.revenueAccountId.trim()) {
        pushToast("Select a revenue (income) account for this service.", "error");
        return;
      }
      if (apiWrite && itemForm.revenueAccountId.trim() && !isUuidString(itemForm.revenueAccountId)) {
        pushToast("Revenue account must be a valid UUID for server save, or clear the field.", "error");
        return;
      }
      if (apiWrite) {
        setInventorySaving(true);
        try {
          const rev = itemForm.revenueAccountId.trim() && isUuidString(itemForm.revenueAccountId)
            ? itemForm.revenueAccountId.trim()
            : null;
          if (editingItemId && isServerUuid(editingItemId)) {
            await updateService(editingItemId, {
              name: itemForm.itemName.trim(),
              description: itemForm.details.trim() || "",
              billing_unit_label: itemForm.serviceUnit.trim() || "Each",
              default_rate: String(rate),
              revenue_gl_account_id: rev,
            });
          } else {
            await createService({
              name: itemForm.itemName.trim(),
              description: itemForm.details.trim() || "",
              billing_unit_label: itemForm.serviceUnit.trim() || "Each",
              default_rate: String(rate),
              revenue_gl_account_id: rev,
            });
          }
          await refetchInventoryCatalog();
          forceCloseItemModal();
          pushToast(wasEdit ? "Service updated on the server." : "Service saved on the server.", "success");
        } catch (err) {
          pushToast(err instanceof Error ? err.message : "Service save failed", "error");
        } finally {
          setInventorySaving(false);
        }
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const rowPayload: ItemRow = {
        id: editingItemId ?? `svc-${Date.now()}`,
        entryType: "service",
        imageDataUrl: null,
        itemNo: "",
        date: today,
        itemName: itemForm.itemName.trim(),
        itemKind: KIND_ROUGH,
        type: "Service",
        grade: "",
        dimLength: "",
        dimWidth: "",
        dimHeight: "",
        uom: 1,
        pieces: 1,
        rate,
        location: "",
        custodian: "",
        details: itemForm.details.trim() || "",
        customFieldValuesJson: "{}",
        serviceUnit: itemForm.serviceUnit.trim() || "",
        revenueAccountId: itemForm.revenueAccountId.trim(),
        linkedRoughLotCode: "",
      };
      if (editingItemId) {
        setRows((prev) => prev.map((r) => (r.id === editingItemId ? rowPayload : r)));
      } else {
        setRows((prev) => [rowPayload, ...prev]);
      }
      forceCloseItemModal();
      pushToast(wasEdit ? "Demo: service updated (local only)." : "Demo: service saved (local only).", "info");
      return;
    }

    if (!itemForm.itemNo.trim()) {
      pushToast("Item # is required.", "error");
      return;
    }
    if (!itemForm.date.trim()) {
      pushToast("Enter a date.", "error");
      return;
    }

    const customStd = !isBuiltinKind(itemForm.itemTypeKey)
      ? customInventoryTypes.find((t) => t.id === itemForm.itemTypeKey)?.standardFields
      : undefined;

    const piecesNum = Number(itemForm.pieces);
    const uomNum = Number(itemForm.uom);
    const rateNum = Number(itemForm.rate);

    const rUom = resolveStandardFieldRule("uomQty", customStd);
    const rPieces = resolveStandardFieldRule("pieces", customStd);
    const rRate = resolveStandardFieldRule("rate", customStd);
    const rLoc = resolveStandardFieldRule("location", customStd);
    const rCust = resolveStandardFieldRule("custodian", customStd);
    const rDet = resolveStandardFieldRule("details", customStd);

    let effUom = uomNum;
    let effPieces = piecesNum;
    let effRate = rateNum;

    if (!isBuiltinKind(itemForm.itemTypeKey)) {
      if (!rUom.enabled) effUom = 1;
      if (!rPieces.enabled) effPieces = 1;
      if (!rRate.enabled) effRate = 0;
    }

    if (!itemForm.itemName.trim()) {
      pushToast("Item name is required.", "error");
      return;
    }

    if (isBuiltinKind(itemForm.itemTypeKey)) {
      if (!Number.isFinite(piecesNum) || piecesNum < 0) {
        pushToast("Enter a valid pieces count.", "error");
        return;
      }
      if (!Number.isFinite(uomNum) || uomNum < 0) {
        pushToast("Enter a valid UOM.", "error");
        return;
      }
      if (!Number.isFinite(rateNum) || rateNum < 0) {
        pushToast("Enter a valid rate.", "error");
        return;
      }
      effUom = uomNum;
      effPieces = piecesNum;
      effRate = rateNum;
    } else {
      if (rPieces.enabled && (!Number.isFinite(piecesNum) || piecesNum < 0)) {
        pushToast("Enter a valid pieces count.", "error");
        return;
      }
      if (rUom.enabled && (!Number.isFinite(uomNum) || uomNum < 0)) {
        pushToast("Enter a valid UOM.", "error");
        return;
      }
      if (rRate.enabled && (!Number.isFinite(rateNum) || rateNum < 0)) {
        pushToast("Enter a valid rate.", "error");
        return;
      }
    }

    const mode = getInventoryTypeUiMode(itemForm.itemTypeKey, customInventoryTypes);
    if (mode === "cut") {
      if (!itemForm.dimLength.trim() || !itemForm.dimWidth.trim() || !itemForm.dimHeight.trim()) {
        pushToast("Enter length, width, and height / thickness for this item type.", "error");
        return;
      }
    }
    if (mode === "builder") {
      const t = customInventoryTypes.find((x) => x.id === itemForm.itemTypeKey);
      const fields = t?.builderFields ?? [];
      for (const f of fields) {
        if (f.required === false) continue;
        if (!itemForm.customFields[f.id]?.trim()) {
          pushToast(`Enter a value for "${f.label}".`, "error");
          return;
        }
      }
    }
    const rowPayload: ItemRow = {
      id: editingItemId ?? `i-${Date.now()}`,
      entryType: "inventory",
      imageDataUrl: itemForm.imageDataUrl,
      itemNo: itemForm.itemNo.trim(),
      date: itemForm.date.trim(),
      itemName: itemForm.itemName.trim(),
      itemKind: itemForm.itemTypeKey,
      type: "Product",
      grade: mode === "rough" ? itemForm.grade.trim() || "" : "",
      dimLength: mode === "cut" ? itemForm.dimLength.trim() : "",
      dimWidth: mode === "cut" ? itemForm.dimWidth.trim() : "",
      dimHeight: mode === "cut" ? itemForm.dimHeight.trim() : "",
      uom: effUom,
      pieces: Math.floor(effPieces),
      rate: effRate,
      location: rLoc.enabled ? itemForm.location.trim() || "" : "",
      custodian: rCust.enabled ? itemForm.custodian.trim() || "" : "",
      details: rDet.enabled ? itemForm.details.trim() || "" : "",
      customFieldValuesJson: mode === "builder" ? JSON.stringify(itemForm.customFields) : "{}",
      serviceUnit: "",
      revenueAccountId: "",
      linkedRoughLotCode:
        itemForm.itemTypeKey === KIND_ROUGH ? itemForm.linkedRoughLotCode.trim() : "",
    };
    if (apiWrite) {
      setInventorySaving(true);
      try {
        if (editingItemId && isServerUuid(editingItemId)) {
          const existing = rows.find((r) => r.id === editingItemId);
          await patchStockFromItemForm({
            unitId: editingItemId,
            expectedRowVersion: existing?.rowVersion ?? 1,
            form: itemForm,
            effUom,
            effPieces: Math.floor(effPieces),
            effRate,
            mode,
            locationEnabled: rLoc.enabled,
            custodianEnabled: rCust.enabled,
          });
          await refetchInventoryCatalog();
          forceCloseItemModal();
          pushToast("Item updated on the server.", "success");
        } else if (!editingItemId) {
          const types = await fetchItemTypes();
          const wantSellables = trackEachPieceSeparately && Math.floor(effPieces) > 1;
          const { parent, sellableUnits } = await createStockWithOptionalSellablePieces({
            types,
            form: itemForm,
            effUom,
            effPieces: Math.floor(effPieces),
            effRate,
            mode,
            locationEnabled: rLoc.enabled,
            custodianEnabled: rCust.enabled,
            trackEachPieceSeparately,
          });
          await refetchInventoryCatalog();
          setNewItemQrUnitId(parent.id);
          if (wantSellables && sellableUnits.length > 0) {
            pushToast(
              `Item created with ${sellableUnits.length} sellable piece(s) — each has a unique # + QR. Click the stock unit to view them.`,
              "success",
            );
          } else {
            pushToast("Item created on the server — QR / label niche.", "success");
          }
        } else {
          pushToast("This line is not on the server yet. Refresh after enabling server inventory, or delete the local row.", "error");
          setInventorySaving(false);
          return;
        }
      } catch (err) {
        pushToast(err instanceof Error ? err.message : "Inventory save failed", "error");
      } finally {
        setInventorySaving(false);
      }
      return;
    }
    if (editingItemId) {
      setRows((prev) => prev.map((r) => (r.id === editingItemId ? rowPayload : r)));
      forceCloseItemModal();
      pushToast("Demo: item updated (local only).", "info");
      return;
    }
    setRows((prev) => [rowPayload, ...prev]);
    setItemFormBaselineKey(itemFormSnapshot(itemForm));
  }

  const downloadNewItemQr = useCallback(async () => {
    const uid = newItemQrUnitId;
    if (!uid) return;
    try {
      const blob = await fetchStockUnitQrPng(uid, 256);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeNo = itemForm.itemNo.trim().replace(/[^\w.-]+/g, "_") || "item";
      a.href = url;
      a.download = `${safeNo}-qr.png`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      pushToast("QR download failed.", "error");
    }
  }, [newItemQrUnitId, itemForm.itemNo, pushToast]);

  /** Download the QR PNG for any server-backed stock unit / sellable piece. */
  const downloadUnitQr = useCallback(
    async (unitId: string, code: string) => {
      if (!isServerUuid(unitId)) {
        pushToast("This line isn't saved on the server yet — QR is only available for saved units.", "info");
        return;
      }
      try {
        const blob = await fetchStockUnitQrPng(unitId, 256);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(code || "unit").replace(/[^\w.-]+/g, "_")}-qr.png`;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        pushToast("QR download failed.", "error");
      }
    },
    [pushToast],
  );

  /** Open a printable single-unit label sheet (with QR) for any sellable piece. */
  const printUnitLabel = useCallback(
    async (unitId: string) => {
      if (!isServerUuid(unitId)) {
        pushToast("This line isn't saved on the server yet — labels are only available for saved units.", "info");
        return;
      }
      try {
        const blob = await fetchStockUnitLabelPdf(unitId, "single");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Label PDF failed", "error");
      }
    },
    [pushToast],
  );

  const printNewItemLabelPdf = useCallback(async () => {
    const uid = newItemQrUnitId;
    if (!uid) return;
    try {
      const blob = await fetchStockUnitLabelPdf(uid, "single");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Label PDF failed", "error");
    }
  }, [newItemQrUnitId, pushToast]);

  const commitAudit = useCallback(
    async (mode: "now" | "close") => {
      if (auditFilteredStockRows.length === 0) {
        pushToast("No lines to save.", "error");
        return;
      }
      const lines: AuditLineSnap[] = auditFilteredStockRows.map((r) => {
        const d = auditDraft[r.id] ?? { physical: "", verified: false };
        const physRaw = d.physical.trim();
        const physicalUom = physRaw === "" ? null : Number(physRaw);
        const variance =
          physicalUom !== null && Number.isFinite(physicalUom) ? physicalUom - r.uom : null;
        return {
          itemId: r.id,
          itemNo: r.itemNo,
          itemName: r.itemName,
          itemKind: r.itemKind,
          location: r.location,
          custodian: r.custodian,
          systemUom: r.uom,
          systemPieces: r.pieces,
          physicalUom,
          verified: d.verified,
          variance,
        };
      });
      const rec: AuditRecord = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        note: "",
        lines,
      };
      const apiLines = auditFilteredStockRows
        .map((r) => {
          const unitId = r.serverUnitId ?? r.id;
          if (!isServerUuid(unitId)) return null;
          const d = auditDraft[r.id] ?? { physical: "", verified: false };
          const physRaw = d.physical.trim();
          const physicalUom = physRaw === "" ? null : Number(physRaw);
          const physical_qty =
            physicalUom !== null && Number.isFinite(physicalUom) ? String(physicalUom) : null;
          return {
            stock_unit_id: unitId,
            physical_qty,
            verified: d.verified,
          };
        })
        .filter((x): x is { stock_unit_id: string; physical_qty: string | null; verified: boolean } => x !== null);

      let serverSavedOk = false;
      if (getAccessToken() && apiLines.length > 0) {
        setAuditSaving(true);
        try {
          const sess = await createAuditSession({ note: "", lines: apiLines });
          if (mode === "close") {
            await closeAuditSession(sess.id);
          }
          serverSavedOk = true;
          pushToast(
            mode === "close"
              ? `Audit session ${sess.id.slice(0, 8)}… saved and closed on the server.`
              : `Audit session ${sess.id.slice(0, 8)}… saved on the server.`,
            "success",
          );
        } catch (e) {
          pushToast(e instanceof Error ? e.message : "Could not save audit on the server.", "error");
        } finally {
          setAuditSaving(false);
        }
      } else if (getAccessToken() && apiLines.length === 0) {
        pushToast(
          "No server stock lines in this list — open Stock items while signed in so lines have server IDs.",
          "info",
        );
      }

      if (serverSavedOk) {
        await reloadAuditSessions();
      } else {
        setAuditRecords((prev) => {
          const next = [rec, ...prev];
          persistAuditRecords(next);
          return next;
        });
      }
      if (mode === "close") {
        const idsToClose = auditFilteredStockRows
          .filter((r) => (auditDraft[r.id] ?? { physical: "", verified: false }).verified)
          .map((r) => r.id);
        if (idsToClose.length > 0) {
          setAuditClosedItemIds((prev) => {
            const next = new Set(prev);
            for (const id of idsToClose) next.add(id);
            persistAuditClosedIds(next);
            return next;
          });
          setAuditDraft((prev) => {
            const next = { ...prev };
            for (const id of idsToClose) delete next[id];
            return next;
          });
        }
        if (!serverSavedOk) {
          pushToast(
            idsToClose.length === 0
              ? "No rows were marked Verified — nothing was removed from this audit list."
              : `${idsToClose.length} verified line(s) removed from this audit list.`,
            "info",
          );
        } else if (idsToClose.length > 0) {
          pushToast(`${idsToClose.length} verified line(s) removed from this audit list.`, "info");
        }
      } else if (!serverSavedOk && !getAccessToken()) {
        pushToast("Audit snapshot saved in this browser (demo). Sign in to save on the server.", "info");
      } else if (!serverSavedOk && getAccessToken()) {
        pushToast("Could not save audit on the server. Counts kept on screen only (not in browser storage).", "info");
      }
    },
    [auditFilteredStockRows, auditDraft, pushToast, reloadAuditSessions],
  );

  const serverStockRowsForTransfer = useMemo(
    () =>
      rows.filter(
        (r) => r.entryType === "inventory" && isServerUuid(r.serverUnitId ?? r.id),
      ),
    [rows],
  );

  const submitStockTransfer = useCallback(async () => {
    if (!getAccessToken() || !invFlags || !inventoryWritesAllowed(invFlags)) {
      pushToast("Sign in with server inventory writes enabled.", "error");
      return;
    }
    setTransferBusy(true);
    try {
      if (stockTransferMode === "location") {
        if (!transferUnitId.trim()) {
          pushToast("Select a stock line.", "error");
          return;
        }
        if (!transferToLocation.trim()) {
          pushToast("Enter a destination location.", "error");
          return;
        }
        const row = rows.find((r) => r.id === transferUnitId || r.serverUnitId === transferUnitId);
        const unitId = row?.serverUnitId ?? transferUnitId;
        if (!isServerUuid(unitId)) {
          pushToast("Selected line is not on the server.", "error");
          return;
        }
        const { location_id } = await resolveLocationAndCustodian(transferToLocation.trim(), "");
        await patchStockUnit(unitId, {
          location_id,
          expected_row_version: row?.rowVersion ?? 1,
        });
        await refetchInventoryCatalog();
        pushToast("Location updated on the server.", "success");
        setStockTransferOpen(false);
        return;
      }
      if (!transferFromUnitId.trim() || !transferToUnitId.trim()) {
        pushToast("Select source and destination stock lines.", "error");
        return;
      }
      if (transferFromUnitId === transferToUnitId) {
        pushToast("Source and destination must be different.", "error");
        return;
      }
      const qtyNum = Number(transferQty);
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        pushToast("Enter a valid quantity to transfer.", "error");
        return;
      }
      const fromRow = rows.find((r) => r.id === transferFromUnitId || r.serverUnitId === transferFromUnitId);
      const toRow = rows.find((r) => r.id === transferToUnitId || r.serverUnitId === transferToUnitId);
      const fromId = fromRow?.serverUnitId ?? transferFromUnitId;
      const toId = toRow?.serverUnitId ?? transferToUnitId;
      if (!isServerUuid(fromId) || !isServerUuid(toId)) {
        pushToast("Both lines must exist on the server.", "error");
        return;
      }
      const piecesNum = transferPieces.trim() === "" ? 0 : Math.floor(Number(transferPieces));
      if (!Number.isFinite(piecesNum) || piecesNum < 0) {
        pushToast("Enter a valid pieces count (or leave empty for 0).", "error");
        return;
      }
      await transferStockUnits({
        from_unit_id: fromId,
        to_unit_id: toId,
        qty: qtyNum,
        pieces: piecesNum,
        memo: transferMemo.trim(),
        expected_from_row_version: fromRow?.rowVersion ?? null,
        expected_to_row_version: toRow?.rowVersion ?? null,
      });
      await refetchInventoryCatalog();
      pushToast("Quantity transferred on the server.", "success");
      setStockTransferOpen(false);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Transfer failed", "error");
    } finally {
      setTransferBusy(false);
    }
  }, [
    invFlags,
    pushToast,
    refetchInventoryCatalog,
    rows,
    stockTransferMode,
    transferFromUnitId,
    transferMemo,
    transferPieces,
    transferQty,
    transferToLocation,
    transferToUnitId,
    transferUnitId,
  ]);

  const reloadServerReports = useCallback(() => {
    if (!getAccessToken()) {
      pushToast("Sign in to load server reports.", "info");
      return;
    }
    setReportsApiLoading(true);
    setReportsApiError(null);
    void Promise.all([fetchReportSummary(), fetchReportByType(), fetchReportByCustodian()])
      .then(([su, bt, bc]) => {
        setServerReportSummary(su);
        setServerReportByType(bt);
        setServerReportByCustodian(bc);
        pushToast("Server reports refreshed.", "success");
      })
      .catch((e) => {
        setReportsApiError(e instanceof Error ? e.message : "Could not load server reports.");
      })
      .finally(() => setReportsApiLoading(false));
  }, [pushToast]);

  if (!hasAuthToken) {
    return (
      <div className="w-full">
        <div className="mx-auto max-w-lg rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Sign in required</h2>
          <p className="mt-2 text-sm text-[var(--gs-muted)]">
            Inventory is available to signed-in users only. All item types, stock, locations, and custodians are stored
            on the server.
          </p>
          <a
            href="/login"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {tab !== "items" ? (
        <div className="flex flex-wrap gap-1 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-2 shadow-sm sm:p-3">
          {(
            [
              ["items", "Items", null],
              ["stock", "Stock transactions", null],
              ["reports", "Inventory reports", null],
              ["audit", "Audit / Stock count", ClipboardCheck],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                tab === id ? "bg-[var(--gs-accent)] text-white" : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
              }`}
            >
              {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden /> : null}
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "items" && (
        <section className="w-full rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
          <div className="border-b border-[var(--gs-border)] p-5">
            {catalogBootstrap === "loading" ? (
              <p className="mb-3 rounded-xl bg-[var(--gs-hover)]/80 px-4 py-3 text-sm text-[var(--gs-muted)]">
                Loading inventory from server…
              </p>
            ) : null}
            {inventoryCatalogSource === "local" && getAccessToken() ? (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                Showing browser catalog (offline/demo). Sign in and enable server reads in Settings → Inventory (server) for
                live stock.
              </p>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-[var(--gs-text)]">Items</h2>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(
                    [
                      ["stock", "Stock transactions", null],
                      ["reports", "Inventory reports", null],
                      ["audit", "Audit / Stock count", ClipboardCheck],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)] sm:text-sm"
                    >
                      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden /> : null}
                      {label}
                    </button>
                  ))}
                </div>
                {itemCatalogScope === "stock" ? (
                  <p className="mt-2 text-xs text-[var(--gs-muted)]">
                    This table shows only <span className="font-semibold text-[var(--gs-text)]">stock units</span> (from a lot or the Items form).
                    Click a stock row to view its <span className="font-semibold text-[var(--gs-text)]">sellable pieces</span> (unique # + QR).
                    Create pieces with <span className="font-semibold text-[var(--gs-text)]">Track each piece separately</span> on the New item form,
                    or a row&apos;s <span className="font-semibold text-[var(--gs-text)]">Actions → Split parcel</span>.
                  </p>
                ) : null}
              </div>
              <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <div className="inline-flex rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-1">
                  <button
                    type="button"
                    onClick={() => setItemCatalogScope("stock")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      itemCatalogScope === "stock"
                        ? "bg-[var(--gs-accent)] text-white shadow-sm"
                        : "text-[var(--gs-muted)] hover:bg-[var(--gs-card)]",
                    )}
                  >
                    Stock items
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemCatalogScope("services")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      itemCatalogScope === "services"
                        ? "bg-[var(--gs-accent)] text-white shadow-sm"
                        : "text-[var(--gs-muted)] hover:bg-[var(--gs-card)]",
                    )}
                  >
                    Service catalog
                  </button>
                </div>
                <ItemsImportExportMenu
                  rows={rows.filter((r) => r.entryType === "inventory")}
                  customTypes={customInventoryTypes}
                  onImportFiles={handleImportFiles}
                />
                {itemCatalogScope === "stock" ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAddStockMenuOpen((o) => !o)}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--gs-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
                      aria-expanded={addStockMenuOpen}
                      aria-haspopup="menu"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                      Add stock
                      <ChevronDown className="h-3.5 w-3.5 opacity-90" strokeWidth={2} aria-hidden />
                    </button>
                    {addStockMenuOpen ? (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-[105] cursor-default bg-transparent"
                          aria-label="Close add stock menu"
                          onClick={() => setAddStockMenuOpen(false)}
                        />
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-[106] mt-1 min-w-[15rem] overflow-hidden rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-xl"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                            onClick={() => {
                              setAddStockMenuOpen(false);
                              openNewItemModal();
                            }}
                          >
                            Type it in manually
                          </button>
                          {getAccessToken() && invFlags && inventoryWritesAllowed(invFlags) ? (
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                              onClick={() => {
                                setAddStockMenuOpen(false);
                                setFromLotOpen(true);
                              }}
                            >
                              Receive from purchase lot
                            </button>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {itemCatalogScope === "services" ? (
                  <button
                    type="button"
                    onClick={openNewItemModal}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--gs-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    New service
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              {itemCatalogScope === "stock" ? (
                <ItemKindMultiSelect
                  id="items-kind-filter"
                  label="Item types"
                  options={typeFilterTabs.filter((x) => x.key !== "all")}
                  selectedKeys={itemKindFilterKeys}
                  onChange={setItemKindFilterKeys}
                />
              ) : null}
              {itemCatalogScope === "stock" ? (
                <label className="inline-flex cursor-pointer select-none items-center gap-2 self-center rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-[var(--gs-border)]"
                    checked={groupCatalogByLot}
                    onChange={(e) => setGroupCatalogByLot(e.target.checked)}
                  />
                  Group by purchase lot
                </label>
              ) : null}
              <input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder={
                  itemCatalogScope === "services"
                    ? "Search service name, description..."
                    : "Search item #, name, location..."
                }
                className="w-full flex-1 max-w-2xl rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
              {itemCatalogScope === "stock" ? (
                <div className="min-w-[12rem] max-w-full">
                  <SearchableFieldPicker
                    id="items-filter-loc"
                    label="Location"
                    value={locationFilter}
                    onChange={setLocationFilter}
                    options={locationOptionsMerged}
                    placeholder="Search locations..."
                    leadingOption={{ value: "All", label: "All locations" }}
                    canManageOption={canManageLocationOption}
                    onRenameOption={renameLocationOption}
                    onDeleteOption={deleteLocationOption}
                  />
                </div>
              ) : null}
              {itemCatalogScope === "stock" ? (
                <div className="inline-flex h-10 max-w-full flex-nowrap items-center gap-1.5 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/90 px-2 py-0.5">
                  <label
                    htmlFor="items-period-from"
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]"
                  >
                    From
                  </label>
                  <input
                    id="items-period-from"
                    type="date"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    className="h-8 w-[8.75rem] shrink-0 rounded-md border border-[var(--gs-border)] bg-[var(--gs-card)] px-1.5 text-xs outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                  />
                  <label
                    htmlFor="items-period-to"
                    className="ml-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]"
                  >
                    To
                  </label>
                  <input
                    id="items-period-to"
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    className="h-8 w-[8.75rem] shrink-0 rounded-md border border-[var(--gs-border)] bg-[var(--gs-card)] px-1.5 text-xs outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                  />
                  {(periodFrom || periodTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodFrom("");
                        setPeriodTo("");
                      }}
                      className="shrink-0 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="w-full overflow-x-auto overflow-y-visible px-3 pb-5 sm:px-5">
            {itemCatalogScope === "services" ? (
            <table className="w-full table-fixed border-collapse overflow-visible text-left text-[11px] sm:text-sm">
              <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)] sm:text-xs">
                <tr>
                  <th className="min-w-[10rem] px-4 py-3">Service name</th>
                  <th className="min-w-[12rem] px-4 py-3">Description</th>
                  <th className="whitespace-nowrap px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="min-w-[10rem] px-4 py-3">Revenue account</th>
                  <th className="w-14 min-w-[3.25rem] px-2 py-3 text-center align-middle" scope="col">
                    <span className="block truncate">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)] overflow-visible">
                {items.map((r) => (
                  <tr key={r.id} className="overflow-visible hover:bg-[var(--gs-hover)]/80">
                    <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{r.itemName}</td>
                    <td className="max-w-[20rem] px-4 py-3 text-[var(--gs-muted)]">
                      <span className="line-clamp-2 text-xs leading-snug" title={r.details}>
                        {r.details}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--gs-muted)]">{r.serviceUnit !== "" ? r.serviceUnit : ""}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--gs-muted)]">{revenueAccountLabel(r.revenueAccountId)}</td>
                    <td className="relative z-10 w-14 min-w-[3.25rem] overflow-visible px-2 py-2 text-center align-middle">
                      <div className="flex justify-center">
                        <ItemRowActionMenu onEdit={() => openEditItemModal(r)} onDelete={() => void deleteItem(r.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            ) : (
            <table className="w-full table-fixed border-collapse overflow-visible text-left text-[11px] sm:text-sm">
              <colgroup>
                {Array.from({ length: 11 }, (_, i) => (
                  <col key={i} style={{ width: `${100 / 11}%` }} />
                ))}
              </colgroup>
              <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)] sm:text-xs">
                <tr>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-left align-middle">
                    <span className="block truncate">Item #</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-left align-middle">
                    <div className="flex min-w-0 max-w-full items-center gap-0.5">
                      <span className="min-w-0 truncate">Date</span>
                      <div
                        className="inline-flex shrink-0 flex-col rounded border border-[var(--gs-border-strong)]/90 bg-[var(--gs-card)] p-px shadow-sm"
                        role="group"
                        aria-label="Sort by date"
                      >
                        <button
                          type="button"
                          title="Oldest first"
                          onClick={() => setDateSort("asc")}
                          className={cn(
                            "m-0 rounded-t p-0 leading-none text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]",
                            dateSort === "asc" && "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)]",
                          )}
                          aria-pressed={dateSort === "asc"}
                        >
                          <ArrowUp className="h-2 w-2" strokeWidth={3} aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Newest first"
                          onClick={() => setDateSort("desc")}
                          className={cn(
                            "m-0 rounded-b p-0 leading-none text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]",
                            dateSort === "desc" && "bg-[var(--gs-accent-soft)] text-[var(--gs-accent)]",
                          )}
                          aria-pressed={dateSort === "desc"}
                        >
                          <ArrowDown className="h-2 w-2" strokeWidth={3} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-left align-middle leading-tight">
                    <span className="line-clamp-2 break-words">Item Name</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-center align-middle leading-tight">
                    <span className="line-clamp-2 break-words">Grade / Dims / Attr.</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-center align-middle tabular-nums">
                    <span className="block truncate">UOM</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-right align-middle tabular-nums">
                    <span className="block truncate">Pieces</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-right align-middle tabular-nums">
                    <span className="block truncate">Rate</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-right align-middle tabular-nums">
                    <span className="block truncate">Amount</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-center align-middle leading-tight">
                    <span className="line-clamp-2 break-words">Location</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-center align-middle leading-tight">
                    <span className="line-clamp-2 break-words">Custodian</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-center align-middle leading-tight" scope="col">
                    <span className="block truncate">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)] overflow-visible">
                {catalogTableEntries.map((entry) => {
                  if (entry.kind === "lot_header") {
                    const isCollapsed = collapsedLotIds.has(entry.lotKey);
                    return (
                      <tr key={`lot-h-${entry.lotKey}`} className="bg-[var(--gs-hover)]/80">
                        <td colSpan={11} className="px-2 py-1.5">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-card)]"
                            onClick={() =>
                              setCollapsedLotIds((prev) => {
                                const n = new Set(prev);
                                if (n.has(entry.lotKey)) n.delete(entry.lotKey);
                                else n.add(entry.lotKey);
                                return n;
                              })
                            }
                          >
                            <ChevronRight
                              className={cn("h-4 w-4 shrink-0 text-[var(--gs-muted)] transition-transform", !isCollapsed && "rotate-90")}
                              strokeWidth={2}
                              aria-hidden
                            />
                            {entry.title}
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  const r = entry.r;
                  const amt = lineAmount(r, customInventoryTypes);
                  const specText = formatSpecCell(r, customInventoryTypes);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "overflow-visible hover:bg-[var(--gs-hover)]/80",
                        r.entryType === "inventory" ? "cursor-pointer" : "",
                      )}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("[data-row-actions]")) return;
                        if (r.entryType === "inventory") openParcelLinesDrawer(r);
                      }}
                      onKeyDown={(e) => {
                        if (r.entryType !== "inventory") return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openParcelLinesDrawer(r);
                        }
                      }}
                      tabIndex={r.entryType === "inventory" ? 0 : undefined}
                    >
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle font-mono text-[var(--gs-text)]">
                        {r.itemNo}
                      </td>
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle text-[var(--gs-muted)]">
                        {r.date}
                      </td>
                      <td
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle font-medium text-[var(--gs-text)]"
                        title={r.lockReason ? `${r.itemName} (locked: ${r.lockReason})` : r.itemName}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {r.itemName}
                          {r.isLocked ? (
                            <span
                              className="inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300"
                              title={r.lockReason || "Locked"}
                            >
                              Locked
                            </span>
                          ) : null}
                          {(() => {
                            const sellableCount = sellableCountByParent.get(r.serverUnitId ?? r.id) ?? 0;
                            return sellableCount > 0 ? (
                              <span
                                className="inline-flex items-center rounded-full border border-sky-400/50 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sky-700 dark:text-sky-300"
                                title={`${sellableCount} sellable piece(s) — click row to view`}
                              >
                                {sellableCount} sellable
                              </span>
                            ) : null;
                          })()}
                          {r.serverPurchaseLotId && lotBalances[r.serverPurchaseLotId] ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                lotBalances[r.serverPurchaseLotId].balanced
                                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                              )}
                              title={`Lot ${lotBalances[r.serverPurchaseLotId].lot_code}: ${lotBalances[r.serverPurchaseLotId].lot_total_qty} = ${lotBalances[r.serverPurchaseLotId].current_parcels_qty} + ${lotBalances[r.serverPurchaseLotId].recorded_loss_qty} loss`}
                            >
                              {lotBalances[r.serverPurchaseLotId].balanced ? "Lot ✓" : `Δ ${lotBalances[r.serverPurchaseLotId].variance_qty}`}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-center align-middle text-xs text-[var(--gs-muted)]"
                        title={specText}
                      >
                        {specText}
                      </td>
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-center align-middle tabular-nums text-[var(--gs-muted)]">
                        {r.uom.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                      </td>
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-right align-middle tabular-nums text-[var(--gs-muted)]">
                        {r.pieces}
                      </td>
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-right align-middle tabular-nums">
                        {r.rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-right align-middle tabular-nums text-[var(--gs-text)]">
                        {amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-center align-middle text-[var(--gs-muted)]"
                        title={r.location}
                      >
                        {r.location}
                      </td>
                      <td
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 text-center align-middle text-[var(--gs-muted)]"
                        title={r.custodian}
                      >
                        {r.custodian}
                      </td>
                      <td
                        className="relative z-10 w-14 min-w-[3.25rem] overflow-visible px-2 py-2.5 text-center align-middle"
                        data-row-actions
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center overflow-visible">
                          <ItemRowActionMenu
                            onEdit={() => openEditItemModal(r)}
                            onDelete={() => void deleteItem(r.id)}
                            extraItems={(() => {
                              const items: { label: string; onSelect: () => void; danger?: boolean; icon?: "split" }[] = [
                                {
                                  label: "Sellable pieces / splits…",
                                  onSelect: () => openParcelLinesDrawer(r),
                                },
                              ];
                              if (
                                r.entryType === "inventory" &&
                                isServerUuid(r.serverUnitId ?? r.id) &&
                                !r.isLocked
                              ) {
                                items.push({
                                  label: "Sell on invoice…",
                                  onSelect: () => {
                                    const uid = encodeURIComponent(r.serverUnitId ?? r.id);
                                    router.push(`/sales/new?stockUnitIds=${uid}`);
                                  },
                                });
                              }
                              if (!r.isLocked) {
                                items.push(
                                  {
                                    label: "Split parcel…",
                                    icon: "split",
                                    onSelect: () => openSplitParcelFromRow(r),
                                  },
                                  {
                                    label: "Adjust weight…",
                                    onSelect: () => openAdjustWeight(r),
                                  },
                                  {
                                    label: "Rebalance with sibling…",
                                    onSelect: () => openRebalance(r),
                                  },
                                  {
                                    label: "Record loss / dust…",
                                    onSelect: () => openRecordLoss(r),
                                  },
                                );
                                if (getInventoryTypeUiMode(r.itemKind, customInventoryTypes) === "rough") {
                                  items.push({
                                    label: "Cut to faceted…",
                                    onSelect: () => void openCutWizard(r),
                                  });
                                }
                              }
                              if (r.entryType === "inventory" && isServerUuid(r.serverUnitId ?? r.id)) {
                                items.push({
                                  label: "QR / print label (PDF)",
                                  onSelect: () => void openRowStockLabelPdf(r),
                                });
                              }
                              if (r.entryType === "inventory" && isServerUuid(r.serverUnitId ?? r.id)) {
                                items.push({
                                  label: r.isLocked ? "Unlock parcel" : "Lock (mark as sold)",
                                  onSelect: () => void toggleStockLock(r),
                                });
                              }
                              return items;
                            })()}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </section>
      )}

      {parcelLinesParent ? (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center bg-black/50 p-3"
          role="presentation"
          onClick={() => setParcelLinesParent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="parcel-lines-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-[var(--gs-border)] px-4 py-3">
              <div className="min-w-0">
                <h3 id="parcel-lines-title" className="text-base font-bold text-[var(--gs-text)]">
                  Sellable pieces & split lines
                </h3>
                <p className="mt-1 text-xs text-[var(--gs-muted)]">
                  Parent: <span className="font-medium text-[var(--gs-text)]">{parcelLinesParent.itemName}</span> · Item #
                  <span className="font-mono text-[var(--gs-text)]"> {parcelLinesParent.itemNo || "—"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setParcelLinesParent(null)}
                className="shrink-0 rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            {parcelLinesParent.serverParentUnitId ? (
              <p className="border-b border-[var(--gs-border)] bg-[var(--gs-hover)]/50 px-4 py-2 text-xs text-[var(--gs-muted)]">
                This line is itself a split child of another stock unit (parent link is set on the server).
              </p>
            ) : null}

            {/* Phase 1: tabs (Children vs History audit trail) */}
            <div className="border-b border-[var(--gs-border)] px-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParcelDrawerTab("children")}
                  className={cn(
                    "border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                    parcelDrawerTab === "children"
                      ? "border-[var(--gs-accent)] text-[var(--gs-accent)]"
                      : "border-transparent text-[var(--gs-muted)] hover:text-[var(--gs-text)]",
                  )}
                >
                  Sellable pieces
                </button>
                <button
                  type="button"
                  onClick={() => setParcelDrawerTab("history")}
                  className={cn(
                    "border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                    parcelDrawerTab === "history"
                      ? "border-[var(--gs-accent)] text-[var(--gs-accent)]"
                      : "border-transparent text-[var(--gs-muted)] hover:text-[var(--gs-text)]",
                  )}
                >
                  History / Audit
                </button>
                <button
                  type="button"
                  onClick={() => setParcelDrawerTab("lineage")}
                  className={cn(
                    "border-b-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                    parcelDrawerTab === "lineage"
                      ? "border-[var(--gs-accent)] text-[var(--gs-accent)]"
                      : "border-transparent text-[var(--gs-muted)] hover:text-[var(--gs-text)]",
                  )}
                >
                  Lineage
                </button>
              </div>
            </div>

            <div className="p-4">
              {parcelDrawerTab === "children" ? (
                parcelChildRows.length === 0 ? (
                  <p className="text-sm text-[var(--gs-muted)]">
                    This stock unit has no sellable pieces yet. Use{" "}
                    <span className="font-semibold text-[var(--gs-text)]">Track each piece separately</span> on the New item form, or{" "}
                    <span className="font-semibold text-[var(--gs-text)]">Split parcel → Break into individual pieces</span> to create them.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[var(--gs-border)]">
                    <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                      <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                        <tr>
                          <th className="px-3 py-2">Unique #</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2 text-right">UOM</th>
                          <th className="px-3 py-2 text-right">Pieces</th>
                          <th className="px-3 py-2">Location</th>
                          <th className="px-3 py-2 text-center">QR / Label</th>
                        </tr>
                      </thead>
                      <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                        {parcelChildRows.map((c) => (
                          <tr key={c.id} className="hover:bg-[var(--gs-hover)]/80">
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[var(--gs-text)]">{c.itemNo}</td>
                            <td className="max-w-[14rem] px-3 py-2 font-medium text-[var(--gs-text)]">
                              {c.itemName}
                              {c.isLocked ? (
                                <span className="ml-1 inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                  Locked
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                              {c.uom.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-muted)]">{c.pieces}</td>
                            <td className="px-3 py-2 text-xs text-[var(--gs-muted)]">{c.location || "—"}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void downloadUnitQr(c.serverUnitId ?? c.id, c.itemNo)}
                                  className="rounded-lg border border-[var(--gs-border)] px-2 py-1 text-[10px] font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)]"
                                >
                                  QR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void printUnitLabel(c.serverUnitId ?? c.id)}
                                  className="rounded-lg border border-[var(--gs-border)] px-2 py-1 text-[10px] font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)]"
                                >
                                  Label
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : parcelDrawerTab === "history" ? (
                <>
                  {drawerHistoryLoading ? (
                    <p className="text-sm text-[var(--gs-muted)]">Loading history…</p>
                  ) : drawerHistoryError ? (
                    <p className="text-sm text-red-600">{drawerHistoryError}</p>
                  ) : drawerHistoryRows.length === 0 ? (
                    <p className="text-sm text-[var(--gs-muted)]">No movements yet for this stock unit.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[var(--gs-border)]">
                      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                        <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                          <tr>
                            <th className="px-3 py-2">When</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2 text-right">Δ Qty</th>
                            <th className="px-3 py-2 text-right">Δ Pcs</th>
                            <th className="px-3 py-2">Reason / memo</th>
                          </tr>
                        </thead>
                        <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                          {drawerHistoryRows.map((m) => {
                            const reason =
                              m.extra_metadata && typeof m.extra_metadata === "object" && "reason" in m.extra_metadata
                                ? String((m.extra_metadata as { reason?: unknown }).reason ?? "")
                                : "";
                            return (
                              <tr key={m.id} className="hover:bg-[var(--gs-hover)]/80">
                                <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--gs-muted)]">
                                  {m.occurred_at.replace("T", " ").slice(0, 19)}
                                </td>
                                <td className="px-3 py-2 text-xs font-semibold text-[var(--gs-text)]">{m.movement_type}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                                  {m.qty_delta_primary_uom}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-muted)]">{m.pieces_delta}</td>
                                <td className="px-3 py-2 text-xs text-[var(--gs-muted)]">
                                  {reason ? (
                                    <span className="mr-1 inline-flex items-center rounded-full border border-[var(--gs-border)] bg-[var(--gs-hover)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--gs-text)]">
                                      {reason}
                                    </span>
                                  ) : null}
                                  {m.memo}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {lineageLoading ? (
                    <p className="text-sm text-[var(--gs-muted)]">Loading lineage…</p>
                  ) : lineageError ? (
                    <p className="text-sm text-red-600">{lineageError}</p>
                  ) : !lineageData ? (
                    <p className="text-sm text-[var(--gs-muted)]">No lineage data.</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <p className="text-[11px] text-[var(--gs-muted)]">
                        Click a row to open that unit in this drawer (the Lineage tab stays here).
                      </p>
                      {(() => {
                        const d = lineageData;
                        const byId = lineageIdMap(d);
                        const focalId = d.unit.id;
                        const ancLen = d.ancestors.length;
                        const rowBtn =
                          "flex w-full rounded-lg border border-transparent px-2 py-1.5 text-left text-[var(--gs-text)] transition hover:border-[var(--gs-border)] hover:bg-[var(--gs-hover)]/90";
                        return (
                          <div className="space-y-1 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/30 p-2">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                              Family tree
                            </div>
                            <div className="space-y-0.5">
                              {d.ancestors.map((a, i) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  className={rowBtn}
                                  style={{ paddingLeft: 8 + i * LINEAGE_TREE_STEP_PX }}
                                  onClick={() => navigateLineageToStockUnit(a)}
                                >
                                  <span className="font-mono text-[10px] text-[var(--gs-muted)]">{a.public_code}</span>{" "}
                                  <span className="font-medium">{a.display_name}</span>{" "}
                                  <span className="text-[var(--gs-muted)]">· {a.item_type_label}</span>
                                </button>
                              ))}
                              <div
                                className="rounded-md border border-[var(--gs-accent)]/50 bg-[var(--gs-card)]/90 px-2 py-1.5"
                                style={{ marginLeft: 8 + ancLen * LINEAGE_TREE_STEP_PX }}
                              >
                                <span className="text-[10px] font-bold uppercase text-[var(--gs-accent)]">Current</span>
                                <div className="mt-0.5 font-mono text-[10px] text-[var(--gs-text)]">{d.unit.public_code}</div>
                                <div className="text-xs font-medium text-[var(--gs-text)]">{d.unit.display_name}</div>
                                <div className="text-[10px] text-[var(--gs-muted)]">{d.unit.item_type_label}</div>
                              </div>
                              {d.children.length === 0 ? (
                                <p className="pl-2 text-xs text-[var(--gs-muted)]">No direct children.</p>
                              ) : null}
                              {d.children.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={rowBtn}
                                  style={{ paddingLeft: 8 + (ancLen + 1) * LINEAGE_TREE_STEP_PX }}
                                  onClick={() => navigateLineageToStockUnit(c)}
                                >
                                  <span className="font-mono text-[10px] text-[var(--gs-muted)]">{c.public_code}</span>{" "}
                                  <span className="font-medium">{c.display_name}</span>{" "}
                                  <span className="text-[var(--gs-muted)]">· {c.item_type_label}</span>
                                </button>
                              ))}
                              {d.descendants.map((x) => {
                                const steps = stepsDownToFocal(x.id, focalId, byId);
                                const pl = 8 + (ancLen + steps) * LINEAGE_TREE_STEP_PX;
                                return (
                                  <button
                                    key={x.id}
                                    type="button"
                                    className={rowBtn}
                                    style={{ paddingLeft: pl }}
                                    onClick={() => navigateLineageToStockUnit(x)}
                                  >
                                    <span className="font-mono text-[10px] text-[var(--gs-muted)]">{x.public_code}</span>{" "}
                                    <span className="font-medium">{x.display_name}</span>{" "}
                                    <span className="text-[var(--gs-muted)]">· {x.item_type_label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {splitParcelOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3"
          role="presentation"
          onClick={() => setSplitParcelOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="split-parcel-title"
            className="w-full max-w-5xl rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--gs-border)] px-4 py-3">
              <h3 id="split-parcel-title" className="text-base font-bold text-[var(--gs-text)]">
                Split Parcel
              </h3>
              <button
                type="button"
                onClick={() => setSplitParcelOpen(false)}
                className="rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                aria-label="Close split parcel dialog"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <SearchableSplitSourcePicker
                    id="split-parcel-source"
                    label="Select Parcel / Lot"
                    value={splitSourceId}
                    onChange={(v) => {
                      setSplitError(null);
                      setSplitSourceId(v);
                    }}
                    options={splitParcelPickerOptions}
                    placeholder="Search by name, lot, UOM..."
                    emptyLabel="Select item..."
                  />
                </div>
                <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/60 p-3 text-xs text-[var(--gs-muted)]">
                  <p>
                    <span className="font-semibold text-[var(--gs-text)]">Total UOM / Weight:</span>{" "}
                    {splitSourceRow ? splitSourceRow.uom : "-"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-[var(--gs-text)]">Total Pieces:</span>{" "}
                    {splitSourceRow ? splitSourceRow.pieces : "-"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-[var(--gs-text)]">Selected Lot:</span>{" "}
                    {splitSourceRow ? splitSourceRow.itemNo || "-" : "-"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setSplitError(null);
                    setSplitMode("parcels");
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    splitMode === "parcels"
                      ? "bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm"
                      : "text-[var(--gs-muted)] hover:text-[var(--gs-text)]",
                  )}
                >
                  Split into smaller parcels
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitError(null);
                    setSplitMode("pieces");
                    if (splitSourceRow) {
                      const pcs = splitSourceRow.pieces;
                      const defU = pcs > 0 ? splitSourceRow.uom / pcs : splitSourceRow.uom;
                      setSplitPiecesCount(pcs > 1 ? String(pcs) : "1");
                      setSplitPerPieceUom(String(defU));
                      setSplitPerPieceRate(String(splitSourceRow.rate));
                    }
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    splitMode === "pieces"
                      ? "bg-[var(--gs-card)] text-[var(--gs-text)] shadow-sm"
                      : "text-[var(--gs-muted)] hover:text-[var(--gs-text)]",
                  )}
                >
                  Break into individual pieces
                </button>
              </div>

              {splitMode === "pieces" ? (
                <div className="space-y-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/30 p-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                        Pieces to break out
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={splitSourceRow ? splitSourceRow.pieces : 1}
                        value={splitPiecesCount}
                        onChange={(e) => setSplitPiecesCount(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-2 text-sm tabular-nums outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                      />
                      <p className="mt-0.5 text-[10px] text-[var(--gs-muted)]">
                        Max {splitSourceRow ? splitSourceRow.pieces : 0} (parent pieces)
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                        Per-piece UOM / weight
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={splitPerPieceUom}
                        onChange={(e) => setSplitPerPieceUom(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-2 text-sm tabular-nums outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                        Per-piece rate (optional)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={splitPerPieceRate}
                        onChange={(e) => setSplitPerPieceRate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-2 text-sm tabular-nums outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                        placeholder={splitSourceRow ? String(splitSourceRow.rate) : "0"}
                      />
                    </div>
                  </div>
                  {splitPiecesPreview && splitSourceRow ? (
                    <p className="text-xs text-[var(--gs-muted)]">
                      Parent will be left with{" "}
                      <span className="font-semibold tabular-nums text-[var(--gs-text)]">
                        {splitPiecesPreview.remainingUom.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>{" "}
                      UOM and{" "}
                      <span className="font-semibold tabular-nums text-[var(--gs-text)]">{splitPiecesPreview.remainingPieces}</span>{" "}
                      pieces.{" "}
                      <span className="font-semibold text-[var(--gs-text)]">{splitPiecesPreview.n}</span> new row(s) will be
                      created (each 1 piece).
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-[var(--gs-border)]">
                <table className="w-full min-w-[42rem] text-xs">
                  <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-2 py-2 text-left">New Item Name</th>
                      <th className="px-2 py-2 text-right">UOM / Weight</th>
                      <th className="px-2 py-2 text-right">Pieces</th>
                      <th className="px-2 py-2 text-right">Rate (optional)</th>
                      <th className="w-14 px-2 py-2 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                    {splitRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-2 py-1.5">
                          <input
                            value={row.itemName}
                            onChange={(e) => updateSplitRow(row.id, "itemName", e.target.value)}
                            className="h-9 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                            placeholder="Parcel name"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={row.uom}
                            onChange={(e) => updateSplitRow(row.id, "uom", e.target.value)}
                            className="h-9 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 text-right text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={row.pieces}
                            onChange={(e) => updateSplitRow(row.id, "pieces", e.target.value)}
                            className="h-9 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 text-right text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={row.rate}
                            onChange={(e) => updateSplitRow(row.id, "rate", e.target.value)}
                            className="h-9 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 text-right text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-1 focus:ring-[var(--gs-accent)]"
                            placeholder={splitSourceRow ? String(splitSourceRow.rate) : "0"}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeSplitRow(row.id)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={addSplitRow}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  Add Row
                </button>
                <div className="text-xs text-[var(--gs-muted)]">
                  Split totals  UOM:{" "}
                  <span className="font-semibold text-[var(--gs-text)]">{splitTotals.uom.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                  {" | "}Pieces: <span className="font-semibold text-[var(--gs-text)]">{splitTotals.pieces}</span>
                </div>
              </div>
                </>
              )}

              {(splitMode === "parcels" && splitLiveError) || splitError ? (
                <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
                  {(splitMode === "parcels" ? splitLiveError : null) ?? splitError}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--gs-border)] px-4 py-3">
              <button
                type="button"
                onClick={() => setSplitParcelOpen(false)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={splitBusy}
                onClick={() => void submitSplitParcel()}
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
              >
                {splitBusy ? "Saving…" : splitMode === "pieces" ? "Create piece rows" : "Split"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {fromLotOpen ? (
        <div
          className="fixed inset-0 z-[112] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => {
            if (fromLotSavingHub) return;
            setFromLotOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-from-lot-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="hub-from-lot-title" className="text-lg font-bold text-[var(--gs-text)]">
                Receive parcels from purchase lot
              </h3>
              <button
                type="button"
                disabled={fromLotSavingHub}
                onClick={() => setFromLotOpen(false)}
                className="rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--gs-muted)]">
              Choose a lot from{" "}
              <Link href="/lots" className="font-semibold text-[var(--gs-accent)] hover:underline">
                Lots
              </Link>
              . Each parcel becomes an inventory stock line tied to the lot line.
            </p>

            <label className="mt-4 block text-xs font-bold uppercase text-[var(--gs-muted)]">Purchase lot</label>
            <select
              value={selectedLotCodeHub}
              onChange={(e) => {
                setSelectedLotCodeHub(e.target.value);
                setFromLotParcelsHub([]);
              }}
              className="mt-1 w-full max-w-xl rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
            >
              <option value="">{lotSummariesHub.length ? "Select a lot…" : "No lots returned from server"}</option>
              {lotSummariesHub.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.code} · {s.supplier} · {s.date_iso}
                </option>
              ))}
            </select>
            {lotSummariesErrorHub ? <p className="mt-2 text-xs text-red-600">{lotSummariesErrorHub}</p> : null}
            {!lotSummariesErrorHub && fromLotOpen && !lotSummariesHub.length ? (
              <p className="mt-2 text-xs text-[var(--gs-muted)]">
                No purchase lots found.{" "}
                <Link href="/lots/new" className="font-semibold text-[var(--gs-accent)] hover:underline">
                  Create a lot
                </Link>{" "}
                first.
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Inventory item type</label>
                <select
                  value={fromLotItemTypeIdHub}
                  onChange={(e) => setFromLotItemTypeIdHub(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                >
                  <option value="">{fromLotTypes.length ? "Select…" : "Loading types…"}</option>
                  {fromLotTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Primary UOM code</label>
                <input
                  value={fromLotPrimaryUomCodeHub}
                  onChange={(e) => setFromLotPrimaryUomCodeHub(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  placeholder="ct"
                />
              </div>
            </div>

            {selectedLotCodeHub && lotDetailHub ? (
              <>
                <p className="mt-4 text-sm font-medium text-[var(--gs-text)]">
                  Lot {lotDetailHub.lot_code} · {lotDetailHub.vendor_name}
                </p>
                {lotBalances[lotDetailHub.id] ? (
                  <div
                    className={cn(
                      "mt-2 rounded-xl border px-3 py-2 text-xs",
                      lotBalances[lotDetailHub.id].balanced
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    <span className="font-semibold">Lot balance:</span>{" "}
                    {lotBalances[lotDetailHub.id].lot_total_qty} = current parcels{" "}
                    {lotBalances[lotDetailHub.id].current_parcels_qty} + recorded loss{" "}
                    {lotBalances[lotDetailHub.id].recorded_loss_qty}
                    {lotBalances[lotDetailHub.id].balanced ? " ✓" : ` (variance ${lotBalances[lotDetailHub.id].variance_qty})`}
                  </div>
                ) : null}

                {/* Mode tabs */}
                <div className="mt-4 inline-flex rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-1">
                  <button
                    type="button"
                    onClick={() => setFromLotMode("auto")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      fromLotMode === "auto"
                        ? "bg-[var(--gs-accent)] text-white shadow-sm"
                        : "text-[var(--gs-muted)] hover:bg-[var(--gs-card)]",
                    )}
                  >
                    Mode A · Auto-equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFromLotMode("custom")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      fromLotMode === "custom"
                        ? "bg-[var(--gs-accent)] text-white shadow-sm"
                        : "text-[var(--gs-muted)] hover:bg-[var(--gs-card)]",
                    )}
                  >
                    Mode B · Custom divisions
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                  {fromLotMode === "auto"
                    ? "Pick a lot line, type how many equal parcels you want, and click Create."
                    : "Type each parcel by hand. The mass-balance strip shows whether your sums match the lot."}
                </p>

                {lotDetailLoadingHub ? (
                  <p className="mt-2 text-sm text-[var(--gs-muted)]">Loading lot lines…</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--gs-border)]">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-[var(--gs-border)] text-[10px] font-bold uppercase text-[var(--gs-muted)]">
                        <tr>
                          <th className="px-3 py-2">Line item</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2">UOM</th>
                          <th className="px-3 py-2 text-right">Pieces</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--gs-border)]">
                        {lotDetailHub.lines.map((ln) => {
                          const draft = autoSplitDraft[ln.id] ?? { n: String(ln.pieces || 1), basis: "equal_weight" as const };
                          return (
                            <tr key={ln.id}>
                              <td className="px-3 py-2">{ln.item_name}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{ln.quantity}</td>
                              <td className="px-3 py-2 text-[var(--gs-muted)]">{ln.uom}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{ln.pieces}</td>
                              <td className="px-3 py-2 text-right">
                                {fromLotMode === "auto" ? (
                                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    <input
                                      type="number"
                                      min={1}
                                      value={draft.n}
                                      onChange={(e) =>
                                        setAutoSplitDraft((prev) => ({
                                          ...prev,
                                          [ln.id]: { ...draft, n: e.target.value },
                                        }))
                                      }
                                      className="h-8 w-16 rounded-lg border border-[var(--gs-border)] px-2 text-right text-xs"
                                      aria-label="Number of parcels"
                                    />
                                    <select
                                      value={draft.basis}
                                      onChange={(e) =>
                                        setAutoSplitDraft((prev) => ({
                                          ...prev,
                                          [ln.id]: { ...draft, basis: e.target.value as "equal_weight" | "equal_pieces" },
                                        }))
                                      }
                                      className="h-8 rounded-lg border border-[var(--gs-border)] px-1 text-xs"
                                      aria-label="Split basis"
                                    >
                                      <option value="equal_weight">Equal weight</option>
                                      <option value="equal_pieces">Equal pieces</option>
                                    </select>
                                    <button
                                      type="button"
                                      disabled={fromLotSavingHub}
                                      className="rounded-full bg-[var(--gs-accent)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
                                      onClick={() => void submitAutoSplitLine(ln.id)}
                                    >
                                      Auto-split
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-[var(--gs-accent)] hover:underline"
                                    onClick={() => appendParcelFromLineHub(ln.id, ln.item_name, ln.pieces)}
                                  >
                                    Add parcel row
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}

            {fromLotMode === "custom" && selectedLotCodeHub ? (
              <>
                <h4 className="mt-6 text-xs font-bold uppercase text-[var(--gs-muted)]">Custom parcel rows</h4>
                {fromLotParcelsHub.length === 0 ? (
                  <p className="mt-1 text-sm text-[var(--gs-muted)]">
                    Click &ldquo;Add parcel row&rdquo; on a line above, then type each parcel&apos;s weight and pieces.
                  </p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {fromLotParcelsHub.map((p) => {
                      const lotLine = lotDetailHub?.lines.find((l) => l.id === p.purchase_lot_line_id);
                      return (
                        <div key={p.key} className="space-y-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-[var(--gs-muted)]">
                              Lot line: <span className="font-medium text-[var(--gs-text)]">{lotLine?.item_name ?? "—"}</span>
                            </p>
                            <button
                              type="button"
                              className="rounded-full border border-[var(--gs-border)] px-3 py-1 text-xs font-semibold"
                              onClick={() => setFromLotParcelsHub((rs) => rs.filter((r) => r.key !== p.key))}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              placeholder="Parcel display name"
                              value={p.display_name}
                              onChange={(e) =>
                                setFromLotParcelsHub((rs) =>
                                  rs.map((r) => (r.key === p.key ? { ...r, display_name: e.target.value } : r)),
                                )
                              }
                              className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm sm:col-span-2"
                            />
                            <input
                              placeholder="UOM qty"
                              value={p.primary_uom_qty}
                              onChange={(e) =>
                                setFromLotParcelsHub((rs) =>
                                  rs.map((r) => (r.key === p.key ? { ...r, primary_uom_qty: e.target.value } : r)),
                                )
                              }
                              className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                            />
                            <input
                              placeholder="Pieces"
                              value={p.pieces}
                              onChange={(e) =>
                                setFromLotParcelsHub((rs) =>
                                  rs.map((r) => (r.key === p.key ? { ...r, pieces: e.target.value } : r)),
                                )
                              }
                              className="rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                            />
                            <input
                              placeholder="Public code (optional)"
                              value={p.public_code}
                              onChange={(e) =>
                                setFromLotParcelsHub((rs) =>
                                  rs.map((r) => (r.key === p.key ? { ...r, public_code: e.target.value } : r)),
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

                {/* Live mass-balance strip for Mode B */}
                {fromLotParcelsHub.length > 0 ? (
                  <div
                    className={cn(
                      "mt-3 rounded-xl border px-3 py-2 text-xs",
                      Math.abs(customSplitTotals.varianceQty) < 0.0001 && customSplitTotals.variancePc === 0
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    <p>
                      <span className="font-semibold">Lot lines (referenced):</span> {customSplitTotals.lotQty}{" "}
                      {fromLotPrimaryUomCodeHub} / {customSplitTotals.lotPc} pcs
                    </p>
                    <p>
                      <span className="font-semibold">Your parcels sum:</span> {customSplitTotals.qtySum.toFixed(4)}{" "}
                      {fromLotPrimaryUomCodeHub} / {customSplitTotals.pcSum} pcs
                    </p>
                    <p>
                      <span className="font-semibold">Variance:</span> {customSplitTotals.varianceQty.toFixed(4)}{" "}
                      {fromLotPrimaryUomCodeHub} / {customSplitTotals.variancePc} pcs
                      {Math.abs(customSplitTotals.varianceQty) < 0.0001 && customSplitTotals.variancePc === 0
                        ? " ✓"
                        : ""}
                    </p>
                  </div>
                ) : null}

                {/* Variance reason (only when sums don't match) */}
                {fromLotParcelsHub.length > 0 &&
                (Math.abs(customSplitTotals.varianceQty) >= 0.0001 || customSplitTotals.variancePc !== 0) ? (
                  <div className="mt-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-3">
                    <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                      Variance reason *
                    </label>
                    <select
                      value={customSplitVarianceReason}
                      onChange={(e) =>
                        setCustomSplitVarianceReason(e.target.value as InvLotVarianceReason | "")
                      }
                      className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                    >
                      <option value="">Pick a reason…</option>
                      <option value="re_measure">Re-measure (weights differ from invoice)</option>
                      <option value="dust">Dust / breakage</option>
                      <option value="data_entry_error">Data entry error</option>
                      <option value="lost">Lost / missing</option>
                      <option value="found_extra">Found extra (more than invoice)</option>
                      <option value="cutting_prep">Cutting prep loss</option>
                      <option value="other">Other (see memo)</option>
                    </select>
                    <input
                      value={customSplitVarianceMemo}
                      onChange={(e) => setCustomSplitVarianceMemo(e.target.value)}
                      placeholder="Memo (optional but helpful for audit)"
                      className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                      Variance is logged as a permanent audit entry on the lot. Cannot be hidden later.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={fromLotSavingHub}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                onClick={() => setFromLotOpen(false)}
              >
                Close
              </button>
              {fromLotMode === "custom" ? (
                <button
                  type="button"
                  disabled={fromLotSavingHub || !fromLotParcelsHub.length}
                  className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
                  onClick={() => void submitCustomSplitFromHub()}
                >
                  {fromLotSavingHub ? "Saving…" : "Create custom parcels"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Phase 1: Adjust weight modal ---- */}
      {adjustWeightTarget ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => {
            if (adjustWeightSaving) return;
            setAdjustWeightTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-weight-title"
            className="w-full max-w-md rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="adjust-weight-title" className="text-base font-bold text-[var(--gs-text)]">
                Re-measure parcel
              </h3>
              <button
                type="button"
                disabled={adjustWeightSaving}
                onClick={() => setAdjustWeightTarget(null)}
                className="rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">
              <span className="font-medium text-[var(--gs-text)]">{adjustWeightTarget.itemName}</span> · current{" "}
              {adjustWeightTarget.uom} / {adjustWeightTarget.pieces} pcs
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">New weight</label>
                <input
                  value={adjustWeightDraft.qty}
                  onChange={(e) => setAdjustWeightDraft((d) => ({ ...d, qty: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">New pieces</label>
                <input
                  value={adjustWeightDraft.pieces}
                  onChange={(e) => setAdjustWeightDraft((d) => ({ ...d, pieces: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Reason *</label>
              <select
                value={adjustWeightDraft.reason}
                onChange={(e) =>
                  setAdjustWeightDraft((d) => ({ ...d, reason: e.target.value as InvLotVarianceReason }))
                }
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              >
                <option value="re_measure">Re-measure</option>
                <option value="dust">Dust / breakage</option>
                <option value="data_entry_error">Data entry error</option>
                <option value="found_extra">Found extra</option>
                <option value="cutting_prep">Cutting prep</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Memo</label>
              <textarea
                value={adjustWeightDraft.memo}
                onChange={(e) => setAdjustWeightDraft((d) => ({ ...d, memo: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                placeholder="Optional context for the audit log"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={adjustWeightSaving}
                onClick={() => setAdjustWeightTarget(null)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adjustWeightSaving}
                onClick={() => void submitAdjustWeight()}
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
              >
                {adjustWeightSaving ? "Saving…" : "Save adjustment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Phase 1: Rebalance modal ---- */}
      {rebalanceTarget ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => {
            if (rebalanceSaving) return;
            setRebalanceTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rebalance-title"
            className="w-full max-w-md rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="rebalance-title" className="text-base font-bold text-[var(--gs-text)]">
                Move weight between sibling parcels
              </h3>
              <button
                type="button"
                disabled={rebalanceSaving}
                onClick={() => setRebalanceTarget(null)}
                className="rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">
              From: <span className="font-medium text-[var(--gs-text)]">{rebalanceTarget.itemName}</span> ({rebalanceTarget.uom}{" "}
              / {rebalanceTarget.pieces} pcs)
            </p>

            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Move to (sibling on same lot)</label>
              <select
                value={rebalanceDraft.toUnitId}
                onChange={(e) => setRebalanceDraft((d) => ({ ...d, toUnitId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              >
                <option value="">{rebalanceSiblingOptions.length ? "Pick a sibling…" : "No siblings on this lot"}</option>
                {rebalanceSiblingOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Qty to move</label>
                <input
                  value={rebalanceDraft.qty}
                  onChange={(e) => setRebalanceDraft((d) => ({ ...d, qty: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Pieces to move</label>
                <input
                  value={rebalanceDraft.pieces}
                  onChange={(e) => setRebalanceDraft((d) => ({ ...d, pieces: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Reason *</label>
              <select
                value={rebalanceDraft.reason}
                onChange={(e) => setRebalanceDraft((d) => ({ ...d, reason: e.target.value as InvLotVarianceReason }))}
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              >
                <option value="re_measure">Re-measure</option>
                <option value="data_entry_error">Data entry error</option>
                <option value="cutting_prep">Cutting prep</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Memo</label>
              <textarea
                value={rebalanceDraft.memo}
                onChange={(e) => setRebalanceDraft((d) => ({ ...d, memo: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={rebalanceSaving}
                onClick={() => setRebalanceTarget(null)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rebalanceSaving || !rebalanceDraft.toUnitId}
                onClick={() => void submitRebalance()}
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
              >
                {rebalanceSaving ? "Saving…" : "Move weight"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- Phase 1: Record loss modal ---- */}
      {lossTarget ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => {
            if (lossSaving) return;
            setLossTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="loss-title"
            className="w-full max-w-md rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="loss-title" className="text-base font-bold text-[var(--gs-text)]">
                Record loss / dust
              </h3>
              <button
                type="button"
                disabled={lossSaving}
                onClick={() => setLossTarget(null)}
                className="rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">
              <span className="font-medium text-[var(--gs-text)]">{lossTarget.itemName}</span> · current {lossTarget.uom} /{" "}
              {lossTarget.pieces} pcs
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Qty lost</label>
                <input
                  value={lossDraft.qty}
                  onChange={(e) => setLossDraft((d) => ({ ...d, qty: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Pieces lost</label>
                <input
                  value={lossDraft.pieces}
                  onChange={(e) => setLossDraft((d) => ({ ...d, pieces: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Reason *</label>
              <select
                value={lossDraft.reason}
                onChange={(e) => setLossDraft((d) => ({ ...d, reason: e.target.value as InvLotVarianceReason }))}
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              >
                <option value="dust">Dust</option>
                <option value="lost">Lost / missing</option>
                <option value="cutting_prep">Cutting prep</option>
                <option value="data_entry_error">Data entry error</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Memo</label>
              <textarea
                value={lossDraft.memo}
                onChange={(e) => setLossDraft((d) => ({ ...d, memo: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={lossSaving}
                onClick={() => setLossTarget(null)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={lossSaving}
                onClick={() => void submitRecordLoss()}
                className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {lossSaving ? "Saving…" : "Record loss"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Phase 2: rough → cut wizard */}
      {cutWizardSource ? (
        <div
          className="fixed inset-0 z-[122] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => {
            if (cutSaving) return;
            setCutWizardSource(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cut-wizard-title"
            className="max-h-[min(92vh,40rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 id="cut-wizard-title" className="text-base font-bold text-[var(--gs-text)]">
                Cut rough → faceted
              </h3>
              <button
                type="button"
                disabled={cutSaving}
                onClick={() => setCutWizardSource(null)}
                className="rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">
              <span className="font-medium text-[var(--gs-text)]">{cutWizardSource.itemName}</span> · rough weight{" "}
              <span className="tabular-nums text-[var(--gs-text)]">{cutWizardSource.uom}</span> ·{" "}
              <span className="tabular-nums">{cutWizardSource.pieces}</span> pcs
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Cut inventory type *</label>
              <select
                value={cutCutTypeIdHub}
                onChange={(e) => setCutCutTypeIdHub(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              >
                <option value="">Select type…</option>
                {cutWizardTypes
                  .filter(
                    (t) =>
                      (t.code || "").toLowerCase() === "cut" ||
                      getInventoryTypeUiMode(t.id as ItemKindKey, customInventoryTypes) === "cut",
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </select>
              {cutWizardTypes.length > 0 &&
              !cutWizardTypes.some(
                (t) =>
                  (t.code || "").toLowerCase() === "cut" ||
                  getInventoryTypeUiMode(t.id as ItemKindKey, customInventoryTypes) === "cut",
              ) ? (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  No Cut-style type found in the catalog. Ask an admin to keep the built-in Cut type active.
                </p>
              ) : null}
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--gs-border)]">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  <tr>
                    <th className="px-3 py-2">Display name *</th>
                    <th className="px-3 py-2 text-right">Weight *</th>
                    <th className="px-3 py-2 text-right">Pieces</th>
                    <th className="px-3 py-2">Public code</th>
                    <th className="px-3 py-2 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gs-border)]">
                  {cutOutputRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <input
                          value={row.display_name}
                          onChange={(e) =>
                            setCutOutputRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, display_name: e.target.value } : x)),
                            )
                          }
                          className="w-full min-w-[10rem] rounded-lg border border-[var(--gs-border)] px-2 py-1.5 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          value={row.primary_uom_qty}
                          onChange={(e) =>
                            setCutOutputRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, primary_uom_qty: e.target.value } : x)),
                            )
                          }
                          className="w-full max-w-[8rem] rounded-lg border border-[var(--gs-border)] px-2 py-1.5 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          value={row.pieces}
                          onChange={(e) =>
                            setCutOutputRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, pieces: e.target.value } : x)),
                            )
                          }
                          className="w-full max-w-[5rem] rounded-lg border border-[var(--gs-border)] px-2 py-1.5 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.public_code}
                          onChange={(e) =>
                            setCutOutputRows((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, public_code: e.target.value } : x)),
                            )
                          }
                          className="w-full min-w-[8rem] rounded-lg border border-[var(--gs-border)] px-2 py-1.5 font-mono text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={cutOutputRows.length <= 1}
                          onClick={() => setCutOutputRows((prev) => prev.filter((x) => x.id !== row.id))}
                          className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-[var(--gs-border)] px-3 py-2">
                <button
                  type="button"
                  onClick={() =>
                    setCutOutputRows((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        display_name: "",
                        primary_uom_qty: "",
                        pieces: "1",
                        public_code: "",
                      },
                    ])
                  }
                  className="text-xs font-semibold text-[var(--gs-accent)] hover:underline"
                >
                  + Add output line
                </button>
              </div>
            </div>

            {(() => {
              const sumQty = cutOutputRows.reduce((a, o) => a + (Number.parseFloat(o.primary_uom_qty) || 0), 0);
              const sumPc = cutOutputRows.reduce((a, o) => a + (Number.parseInt(o.pieces, 10) || 0), 0);
              const lossQty = cutWizardSource.uom - sumQty;
              const lossPc = cutWizardSource.pieces - sumPc;
              const needsReason = lossQty > 0.0001 || lossPc > 0;
              return (
                <div className="mt-3 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/50 px-3 py-2 text-xs">
                  <p className="font-semibold text-[var(--gs-text)]">Yield check</p>
                  <p className="mt-1 tabular-nums text-[var(--gs-muted)]">
                    Outputs total weight <span className="text-[var(--gs-text)]">{sumQty.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span> vs rough{" "}
                    <span className="text-[var(--gs-text)]">{cutWizardSource.uom.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                    {" · "}
                    pieces {sumPc} vs {cutWizardSource.pieces}
                  </p>
                  {needsReason ? (
                    <p className="mt-1 text-amber-800 dark:text-amber-200">
                      Loss detected — pick a reason below (server requires it when weight or pieces do not match).
                    </p>
                  ) : (
                    <p className="mt-1 text-emerald-800 dark:text-emerald-200">No loss vs rough line (within rounding).</p>
                  )}
                </div>
              );
            })()}

            {(() => {
              const sumQty = cutOutputRows.reduce((a, o) => a + (Number.parseFloat(o.primary_uom_qty) || 0), 0);
              const sumPc = cutOutputRows.reduce((a, o) => a + (Number.parseInt(o.pieces, 10) || 0), 0);
              const needsReason = cutWizardSource.uom - sumQty > 0.0001 || cutWizardSource.pieces - sumPc > 0;
              if (!needsReason) return null;
              return (
                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Loss reason *</label>
                  <select
                    value={cutLossReason}
                    onChange={(e) => setCutLossReason((e.target.value || "") as InvLotVarianceReason | "")}
                    className="mt-1 w-full max-w-md rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    <option value="dust">Dust</option>
                    <option value="lost">Lost / missing</option>
                    <option value="cutting_prep">Cutting prep</option>
                    <option value="re_measure">Re-measure</option>
                    <option value="data_entry_error">Data entry error</option>
                    <option value="found_extra">Found extra</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              );
            })()}

            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[var(--gs-muted)]">Memo</label>
              <textarea
                value={cutMemo}
                onChange={(e) => setCutMemo(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={cutSaving}
                onClick={() => setCutWizardSource(null)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cutSaving || !cutCutTypeIdHub}
                onClick={() => void submitCutWizard()}
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
              >
                {cutSaving ? "Saving…" : "Run cut"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addTypeModalOpen ? (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 p-4"
          role="presentation"
          onClick={() => {
            setAddTypeModalOpen(false);
            setEditingInventoryTypeId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-type-title"
            className="max-h-[min(94vh,52rem)] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h4 id="add-type-title" className="text-base font-bold text-[var(--gs-text)]">
                {editingInventoryTypeId ? "Edit inventory type" : "New inventory type"}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setAddTypeModalOpen(false);
                  setEditingInventoryTypeId(null);
                }}
                className="rounded-lg p-1.5 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">
              Give the type a name, pick a starting template, then define its attribute fields and which standard <strong className="text-[var(--gs-text)]">New item</strong> fields show. Built-in Rough/Cut types are unchanged.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="add-type-name" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  Type name *
                </label>
                <input
                  id="add-type-name"
                  value={addTypeDraft.label}
                  onChange={(e) => setAddTypeDraft((d) => ({ ...d, label: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                  placeholder="e.g. Polished"
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
                <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Attribute style</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["rough", "Rough (grade)"],
                      ["cut", "Cut (dimensions)"],
                      ["builder", "Custom fields"],
                    ] as const
                  ).map(([id, lab]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setAddTypeDraft((d) => ({ ...d, specMode: id, builderFields: builderTemplateForStyle(id) }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        addTypeDraft.specMode === id
                          ? "border-[var(--gs-accent)] bg-[var(--gs-accent-soft)] text-[var(--gs-accent)]"
                          : "border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]",
                      )}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                  Pick a starting template: <strong className="text-[var(--gs-text)]">Rough</strong> adds a Grade dropdown,{" "}
                  <strong className="text-[var(--gs-text)]">Cut</strong> adds Length/Width/Height, and{" "}
                  <strong className="text-[var(--gs-text)]">Custom fields</strong> starts blank. You can edit, add, or remove any field below.
                </p>
              </div>
              <div className="order-4 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Standard New Item fields</p>
                <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                  Item #, date, item name, and inventory type selector are always shown. Toggle the rest.
                </p>
                <div className="mt-3 space-y-2">
                  {INVENTORY_STANDARD_FIELD_CATALOG.map((row) => {
                    const rule = addTypeDraft.standardFields[row.id];
                    return (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--gs-text)]">{row.label}</p>
                          <p className="text-[11px] text-[var(--gs-muted)]">{row.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--gs-text)]">
                            <input
                              type="checkbox"
                              className="rounded border-[var(--gs-border-strong)]"
                              checked={rule.enabled}
                              onChange={(e) => {
                                const en = e.target.checked;
                                setAddTypeDraft((d) => ({
                                  ...d,
                                  standardFields: {
                                    ...d.standardFields,
                                    [row.id]: { enabled: en, required: en && row.defaultRule.required },
                                  },
                                }));
                              }}
                            />
                            Show
                          </label>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--gs-text)]",
                              !rule.enabled && "pointer-events-none opacity-40",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-[var(--gs-border-strong)]"
                              disabled={!rule.enabled}
                              checked={rule.required}
                              onChange={(e) => {
                                const rq = e.target.checked;
                                setAddTypeDraft((d) => ({
                                  ...d,
                                  standardFields: {
                                    ...d.standardFields,
                                    [row.id]: { enabled: d.standardFields[row.id].enabled, required: rq },
                                  },
                                }));
                              }}
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
                </div>
                <div className="flex flex-col gap-4">
              <div className="order-2">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">UOM</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(
                    [
                      ["kg", "Kg"],
                      ["liter", "Liter"],
                      ["piece", "Piece"],
                      ["custom", "Custom"],
                    ] as const
                  ).map(([id, lab]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAddTypeDraft((d) => ({ ...d, uomTab: id }))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        addTypeDraft.uomTab === id
                          ? "border-[var(--gs-accent)] bg-[var(--gs-accent-soft)] text-[var(--gs-accent)]"
                          : "border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]",
                      )}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
                {addTypeDraft.uomTab === "custom" ? (
                  <input
                    value={addTypeDraft.customUom}
                    onChange={(e) => setAddTypeDraft((d) => ({ ...d, customUom: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                    placeholder="Custom UOM label (e.g. ct)"
                    autoComplete="off"
                  />
                ) : null}
              </div>
              <div className="order-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Attribute fields *</p>
                  <button
                    type="button"
                    onClick={() =>
                      setAddTypeDraft((d) => ({
                        ...d,
                        builderFields: [
                          ...d.builderFields,
                          {
                            id: newFieldId(),
                            label: `Field ${d.builderFields.length + 1}`,
                            kind: "text",
                            required: true,
                            visible: true,
                          },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                  >
                    <Plus className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    Add field
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {addTypeDraft.builderFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-3 sm:flex-row sm:flex-wrap sm:items-end"
                    >
                      <div className="min-w-[8rem] flex-1">
                        <label className="block text-[10px] font-semibold text-[var(--gs-muted)]">Label *</label>
                        <input
                          value={field.label}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAddTypeDraft((d) => ({
                              ...d,
                              builderFields: d.builderFields.map((x) => (x.id === field.id ? { ...x, label: v } : x)),
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-1.5 text-sm"
                          placeholder="Field name"
                        />
                      </div>
                      <div className="w-full min-w-[7rem] sm:w-36">
                        <label className="block text-[10px] font-semibold text-[var(--gs-muted)]">Type</label>
                        <select
                          value={field.kind}
                          onChange={(e) => {
                            const kind = e.target.value as CustomFieldDef["kind"];
                            setAddTypeDraft((d) => ({
                              ...d,
                              builderFields: d.builderFields.map((x) =>
                                x.id === field.id ? { ...x, kind, options: kind === "dropdown" ? x.options ?? ["A", "B"] : undefined } : x,
                              ),
                            }));
                          }}
                          className="mt-1 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-1.5 text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                      </div>
                      {field.kind === "dropdown" ? (
                        <div className="min-w-[10rem] flex-1">
                          <label className="block text-[10px] font-semibold text-[var(--gs-muted)]">Options (comma-separated) *</label>
                          <input
                            value={(field.options ?? []).join(", ")}
                            onChange={(e) => {
                              const opts = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              setAddTypeDraft((d) => ({
                                ...d,
                                builderFields: d.builderFields.map((x) => (x.id === field.id ? { ...x, options: opts } : x)),
                              }));
                            }}
                            className="mt-1 w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-2 py-1.5 text-sm"
                            placeholder="Option A, Option B"
                          />
                        </div>
                      ) : null}
                      <label className="flex items-center gap-1.5 self-center text-[10px] font-semibold text-[var(--gs-muted)]">
                        <input
                          type="checkbox"
                          className="rounded border-[var(--gs-border-strong)]"
                          checked={field.visible !== false}
                          onChange={(e) =>
                            setAddTypeDraft((d) => ({
                              ...d,
                              builderFields: d.builderFields.map((x) =>
                                x.id === field.id ? { ...x, visible: e.target.checked } : x,
                              ),
                            }))
                          }
                        />
                        Show
                      </label>
                      <label className="flex items-center gap-1.5 self-center text-[10px] font-semibold text-[var(--gs-muted)]">
                        <input
                          type="checkbox"
                          className="rounded border-[var(--gs-border-strong)]"
                          checked={field.required !== false}
                          onChange={(e) =>
                            setAddTypeDraft((d) => ({
                              ...d,
                              builderFields: d.builderFields.map((x) =>
                                x.id === field.id ? { ...x, required: e.target.checked } : x,
                              ),
                            }))
                          }
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        disabled={addTypeDraft.builderFields.length <= 1}
                        onClick={() =>
                          setAddTypeDraft((d) => ({
                            ...d,
                            builderFields: d.builderFields.filter((x) => x.id !== field.id),
                          }))
                        }
                        className="self-end rounded-lg p-2 text-[var(--gs-muted)] hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        aria-label={`Remove field ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex justify-end gap-2 border-t border-[var(--gs-border)] bg-[var(--gs-card)] px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setAddTypeModalOpen(false);
                  setEditingInventoryTypeId(null);
                }}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={inventorySaving}
                onClick={() => {
                  void (async () => {
                    const label = addTypeDraft.label.trim();
                    if (!label) {
                      pushToast("Enter a type name.", "error");
                      return;
                    }
                    if (addTypeDraft.uomTab === "custom" && !addTypeDraft.customUom.trim()) {
                      pushToast("Enter a custom UOM label.", "error");
                      return;
                    }
                    const mergedStd = mergeStandardFields(addTypeDraft.standardFields);
                    const trimmedFields: CustomFieldDef[] = addTypeDraft.builderFields.map((f) => ({
                      id: f.id,
                      label: f.label.trim(),
                      kind: f.kind,
                      options: f.kind === "dropdown" ? (f.options ?? []).filter(Boolean) : undefined,
                      required: f.required !== false,
                      visible: f.visible !== false,
                    }));
                    if (trimmedFields.length < 1) {
                      pushToast("Add at least one attribute field.", "error");
                      return;
                    }
                    for (const f of trimmedFields) {
                      if (!f.label) {
                        pushToast("Each field needs a label.", "error");
                        return;
                      }
                      if (f.kind === "dropdown" && (!f.options || f.options.length < 1)) {
                        pushToast(`Add at least one option for dropdown "${f.label || "field"}".`, "error");
                        return;
                      }
                    }
                    // Stable, readable keys so values persist correctly under attributes_json.custom.
                    const cleaned: CustomFieldDef[] = assignBuilderFieldSlugs(trimmedFields);
                    const id = editingInventoryTypeId ?? `ctype-${Date.now()}`;
                    const nextType: CustomInventoryType = {
                      id,
                      label,
                      uomTab: addTypeDraft.uomTab,
                      customUomLabel: addTypeDraft.uomTab === "custom" ? addTypeDraft.customUom.trim() : undefined,
                      fieldPreset: undefined,
                      builderFields: cleaned,
                      standardFields: mergedStd,
                    };
                    const apiWrite = Boolean(getAccessToken() && invFlags && inventoryWritesAllowed(invFlags));
                    if (apiWrite) {
                      setInventorySaving(true);
                      try {
                        const dto = await persistCustomInventoryType({
                          editingId: editingInventoryTypeId,
                          nextType,
                          codeHint: label,
                        });
                        await refetchInventoryCatalog();
                        if (!editingInventoryTypeId) {
                          setItemForm((s) => {
                            const cf: Record<string, string> = {};
                            for (const f of cleaned) cf[f.id] = "";
                            return { ...s, itemTypeKey: dto.id, customFields: cf };
                          });
                        }
                        pushToast(editingInventoryTypeId ? "Inventory type updated on the server." : "Inventory type created on the server.", "success");
                      } catch (err) {
                        pushToast(err instanceof Error ? err.message : "Could not save type", "error");
                        setInventorySaving(false);
                        return;
                      } finally {
                        setInventorySaving(false);
                      }
                    } else {
                      if (editingInventoryTypeId) {
                        setCustomInventoryTypes((prev) => prev.map((x) => (x.id === editingInventoryTypeId ? nextType : x)));
                      } else {
                        setCustomInventoryTypes((prev) => [...prev, nextType]);
                        setItemForm((s) => {
                          const cf: Record<string, string> = {};
                          for (const f of cleaned) cf[f.id] = "";
                          return { ...s, itemTypeKey: id, customFields: cf };
                        });
                      }
                      pushToast("Type saved locally only (sign in and allow server writes to sync).", "info");
                    }
                    setAddTypeModalOpen(false);
                    setEditingInventoryTypeId(null);
                    setAddTypeDraft({
                      label: "",
                      uomTab: "kg",
                      customUom: "",
                      specMode: "builder",
                      standardFields: defaultStandardFieldRules(),
                      builderFields: [{ id: newFieldId(), label: "Field 1", kind: "text", required: true, visible: true }],
                    });
                  })();
                }}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
              >
                Save type
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {itemModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/50 p-0 sm:p-3"
          role="presentation"
          onClick={() => {
            if (addTypeModalOpen) {
              setAddTypeModalOpen(false);
              setEditingInventoryTypeId(null);
              return;
            }
            if (discardConfirmOpen) {
              setDiscardConfirmOpen(false);
              return;
            }
            requestCloseItemModal();
          }}
        >
          <div
            role="dialog"
            aria-labelledby="item-modal-title"
            aria-modal={!discardConfirmOpen}
            className="flex h-full w-full max-h-[100dvh] flex-col overflow-hidden rounded-none border-0 bg-[var(--gs-card)] shadow-2xl sm:max-h-[min(100dvh,52rem)] sm:max-w-[min(96rem,calc(100vw-1.5rem))] sm:rounded-2xl sm:border sm:border-[var(--gs-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--gs-border)] bg-[var(--gs-card)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--gs-card)]/90 sm:px-6">
              <div className="min-w-0 flex-1">
                <h3 id="item-modal-title" className="text-lg font-bold text-[var(--gs-text)]">
                  {itemForm.entryType === "service"
                    ? editingItemId
                      ? "Edit service"
                      : "New service"
                    : editingItemId
                      ? "Edit item"
                      : "New item"}
                </h3>
                {editingItemId ? (
                  <p className="mt-0.5 text-sm text-[var(--gs-muted)]">
                    {getAccessToken() && invFlags && inventoryWritesAllowed(invFlags)
                      ? "Changes save to the inventory server."
                      : getAccessToken() && invFlags && !inventoryWritesAllowed(invFlags)
                        ? "Read-only: server writes are disabled (hub_backend_writes)."
                        : "Update fields below (local demo when not signed in or server writes off)."}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-[var(--gs-muted)]">Full-width form  sections follow ERP-style grouping.</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={requestCloseItemModal}
                  className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  Cancel
                </button>
                {newItemQrUnitId ? (
                  <button
                    type="button"
                    onClick={forceCloseItemModal}
                    className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
                  >
                    Close
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="gs-new-item-form"
                    disabled={inventorySaving}
                    className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
                  >
                    {inventorySaving ? "Saving…" : editingItemId ? "Save changes" : "Save item"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestCloseItemModal}
                  className="shrink-0 rounded-lg p-2 text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </header>
            <form
              id="gs-new-item-form"
              onSubmit={submitItemForm}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
              autoComplete="off"
            >
              <div className="space-y-8 px-4 py-5 sm:px-6">
              {itemForm.entryType === "service" ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <FormSection title="Service">
                    <LineTypeToggle
                      value={itemForm.entryType}
                      onChange={(next) =>
                        setItemForm((s) => ({
                          ...s,
                          entryType: next,
                          ...(next === "service" ? { imageDataUrl: null, linkedRoughLotCode: "" } : {}),
                        }))
                      }
                    />
                    <div>
                      <label htmlFor="ni-svc-name" className={FIELD_LABEL}>
                        Service name *
                      </label>
                      <input
                        id="ni-svc-name"
                        value={itemForm.itemName}
                        onChange={(e) => setItemForm((s) => ({ ...s, itemName: e.target.value }))}
                        className={FIELD_INPUT}
                        placeholder="e.g. Stone appraisal, sizing visit"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="ni-svc-desc" className={FIELD_LABEL}>
                        Description
                      </label>
                      <textarea
                        id="ni-svc-desc"
                        value={itemForm.details}
                        onChange={(e) => setItemForm((s) => ({ ...s, details: e.target.value }))}
                        rows={6}
                        className={cn(FIELD_INPUT, "min-h-[8rem] resize-y")}
                        placeholder="Scope, deliverables, billing notes..."
                      />
                    </div>
                  </FormSection>
                  <FormSection title="Pricing & posting" subtitle="Default bill rate and income account">
                    <div>
                      <label htmlFor="ni-svc-rev" className={FIELD_LABEL}>
                        Revenue account (Chart of accounts) *
                      </label>
                      <select
                        id="ni-svc-rev"
                        value={itemForm.revenueAccountId}
                        onChange={(e) => setItemForm((s) => ({ ...s, revenueAccountId: e.target.value }))}
                        className={FIELD_INPUT}
                        required
                      >
                        <option value="">Select income account...</option>
                        {DEMO_REVENUE_ACCOUNTS.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code}  {a.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                        Used when posting invoice lines and revenue journal entries (demo links to Accounting → COA).
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="ni-svc-rate" className={FIELD_LABEL}>
                          Rate / price *
                        </label>
                        <input
                          id="ni-svc-rate"
                          type="number"
                          min={0}
                          step="0.01"
                          value={itemForm.rate}
                          onChange={(e) => setItemForm((s) => ({ ...s, rate: e.target.value }))}
                          className={FIELD_INPUT}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="ni-svc-unit" className={FIELD_LABEL}>
                          Unit (optional)
                        </label>
                        <input
                          id="ni-svc-unit"
                          value={itemForm.serviceUnit}
                          onChange={(e) => setItemForm((s) => ({ ...s, serviceUnit: e.target.value }))}
                          className={FIELD_INPUT}
                          placeholder="e.g. Hours, Visit, Each"
                        />
                      </div>
                    </div>
                  </FormSection>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 lg:grid-cols-3">
                    <FormSection title="Basic info">
                      <LineTypeToggle
                        value={itemForm.entryType}
                        onChange={(next) =>
                          setItemForm((s) => ({
                            ...s,
                            entryType: next,
                            ...(next === "service" ? { imageDataUrl: null, linkedRoughLotCode: "" } : {}),
                          }))
                        }
                      />
                      <ItemImageDropzone
                        value={itemForm.imageDataUrl}
                        onChange={(v) => setItemForm((s) => ({ ...s, imageDataUrl: v }))}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="ni-itemno-inv" className={FIELD_LABEL}>
                            Item # *
                          </label>
                          <input
                            id="ni-itemno-inv"
                            value={itemForm.itemNo}
                            onChange={(e) => setItemForm((s) => ({ ...s, itemNo: e.target.value }))}
                            className={FIELD_INPUT}
                            placeholder="e.g. S-NEW"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="ni-date-inv" className={FIELD_LABEL}>
                            Date *
                          </label>
                          <input
                            id="ni-date-inv"
                            type="date"
                            value={itemForm.date}
                            onChange={(e) => setItemForm((s) => ({ ...s, date: e.target.value }))}
                            className={FIELD_INPUT}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="ni-itemname" className={FIELD_LABEL}>
                          Item name *
                        </label>
                        <input
                          id="ni-itemname"
                          value={itemForm.itemName}
                          onChange={(e) => setItemForm((s) => ({ ...s, itemName: e.target.value }))}
                          className={FIELD_INPUT}
                          placeholder="Short label as it appears in lists"
                          required
                        />
                      </div>
                    </FormSection>
                    <FormSection title="Type & UOM">
              <div>
                <label htmlFor="ni-inv-kind" className={FIELD_LABEL}>
                  Inventory item type
                </label>
                <select
                  id="ni-inv-kind"
                  value={itemForm.itemTypeKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === ADD_NEW_TYPE_VALUE) {
                      setEditingInventoryTypeId(null);
                      setAddTypeDraft({
                        label: "",
                        uomTab: "kg",
                        customUom: "",
                        specMode: "builder",
                        standardFields: defaultStandardFieldRules(),
                        builderFields: [{ id: newFieldId(), label: "Field 1", kind: "text", required: true, visible: true }],
                      });
                      setAddTypeModalOpen(true);
                      return;
                    }
                    setItemForm((s) => {
                      const ct = customInventoryTypes.find((t) => t.id === v);
                      const customFields: Record<string, string> = {};
                      if (ct?.builderFields?.length) {
                        for (const f of ct.builderFields) customFields[f.id] = s.customFields[f.id] ?? "";
                      }
                      return {
                        ...s,
                        itemTypeKey: v as ItemKindKey,
                        customFields,
                        linkedRoughLotCode: v === KIND_ROUGH ? s.linkedRoughLotCode : "",
                      };
                    });
                  }}
                  className={FIELD_INPUT}
                >
                  <option value={KIND_ROUGH}>Rough</option>
                  <option value={KIND_CUT}>Cut</option>
                  {customInventoryTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                  <option value={ADD_NEW_TYPE_VALUE}>+ Add New Type</option>
                </select>
                <button
                  type="button"
                  onClick={() => setViewAllTypesOpen(true)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--gs-accent)] hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  Manage types (edit / delete)
                </button>
                {itemForm.itemTypeKey === KIND_ROUGH ? (
                  <div className="mt-4">
                    <label htmlFor="ni-rough-lot" className={FIELD_LABEL}>
                      Select Rough Lot
                    </label>
                    <select
                      id="ni-rough-lot"
                      value={itemForm.linkedRoughLotCode}
                      onChange={(e) => setItemForm((s) => ({ ...s, linkedRoughLotCode: e.target.value }))}
                      className={FIELD_INPUT}
                    >
                      <option value="">Select lot…</option>
                      {roughLotOptions.map((lot) => (
                        <option key={lot.code} value={lot.code}>
                          {lot.code} — {lot.supplier}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              {activeUiMode === "rough" ? (
                <div>
                  <label htmlFor="ni-grade" className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                    Grade
                  </label>
                  <select
                    id="ni-grade"
                    value={itemForm.grade}
                    onChange={(e) => setItemForm((s) => ({ ...s, grade: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              ) : activeUiMode === "cut" ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Dimensions</p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="ni-dim-l" className="block text-[10px] font-semibold text-[var(--gs-muted)]">
                        Length *
                      </label>
                      <input
                        id="ni-dim-l"
                        type="text"
                        inputMode="decimal"
                        value={itemForm.dimLength}
                        onChange={(e) => setItemForm((s) => ({ ...s, dimLength: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                        placeholder="e.g. 4.2"
                      />
                    </div>
                    <div>
                      <label htmlFor="ni-dim-w" className="block text-[10px] font-semibold text-[var(--gs-muted)]">
                        Width *
                      </label>
                      <input
                        id="ni-dim-w"
                        type="text"
                        inputMode="decimal"
                        value={itemForm.dimWidth}
                        onChange={(e) => setItemForm((s) => ({ ...s, dimWidth: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                        placeholder="e.g. 3.1"
                      />
                    </div>
                    <div>
                      <label htmlFor="ni-dim-h" className="block text-[10px] font-semibold text-[var(--gs-muted)]">
                        Height / Thickness *
                      </label>
                      <input
                        id="ni-dim-h"
                        type="text"
                        inputMode="decimal"
                        value={itemForm.dimHeight}
                        onChange={(e) => setItemForm((s) => ({ ...s, dimHeight: e.target.value }))}
                        className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                        placeholder="e.g. 2.0"
                      />
                    </div>
                  </div>
                </div>
              ) : activeUiMode === "builder" && activeCustomTypeDef?.builderFields?.length ? (
                <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Type-specific fields</p>
                  <div className="mt-3 space-y-3">
                    {activeCustomTypeDef.builderFields.filter((f) => f.visible !== false).map((f) => (
                      <div key={f.id}>
                        <label htmlFor={`ni-cf-${f.id}`} className="block text-[11px] font-semibold text-[var(--gs-muted)]">
                          {f.label}
                          {f.required !== false ? " *" : ""}
                        </label>
                        {f.kind === "text" ? (
                          <input
                            id={`ni-cf-${f.id}`}
                            value={itemForm.customFields[f.id] ?? ""}
                            onChange={(e) =>
                              setItemForm((s) => ({
                                ...s,
                                customFields: { ...s.customFields, [f.id]: e.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                          />
                        ) : null}
                        {f.kind === "number" ? (
                          <input
                            id={`ni-cf-${f.id}`}
                            type="number"
                            step="any"
                            value={itemForm.customFields[f.id] ?? ""}
                            onChange={(e) =>
                              setItemForm((s) => ({
                                ...s,
                                customFields: { ...s.customFields, [f.id]: e.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                          />
                        ) : null}
                        {f.kind === "dropdown" ? (
                          <select
                            id={`ni-cf-${f.id}`}
                            value={itemForm.customFields[f.id] ?? ""}
                            onChange={(e) =>
                              setItemForm((s) => ({
                                ...s,
                                customFields: { ...s.customFields, [f.id]: e.target.value },
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                          >
                            <option value="">Select...</option>
                            {(f.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {stdRule("uomQty").enabled || stdRule("pieces").enabled ? (
                <div
                  className={cn(
                    "grid gap-4",
                    stdRule("uomQty").enabled && stdRule("pieces").enabled ? "sm:grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {stdRule("uomQty").enabled ? (
                    <div>
                      <label htmlFor="ni-uom" className={FIELD_LABEL}>
                        UOM qty{uomFieldHint ? ` (${uomFieldHint})` : ""}
                        {stdRule("uomQty").required ? " *" : ""}
                      </label>
                      <input
                        id="ni-uom"
                        type="number"
                        min={0}
                        step="any"
                        value={itemForm.uom}
                        onChange={(e) => setItemForm((s) => ({ ...s, uom: e.target.value }))}
                        className={FIELD_INPUT}
                        placeholder="0"
                        required={stdRule("uomQty").required}
                      />
                    </div>
                  ) : null}
                  {stdRule("pieces").enabled ? (
                    <div>
                      <label htmlFor="ni-pieces" className={FIELD_LABEL}>
                        Pieces{stdRule("pieces").required ? " *" : ""}
                      </label>
                      <input
                        id="ni-pieces"
                        type="number"
                        min={0}
                        step={1}
                        value={itemForm.pieces}
                        onChange={(e) => setItemForm((s) => ({ ...s, pieces: e.target.value }))}
                        className={FIELD_INPUT}
                        placeholder="0"
                        required={stdRule("pieces").required}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!editingItemId && stdRule("pieces").enabled && (Number(itemForm.pieces) || 0) > 1 ? (
                <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 p-3">
                  <input
                    type="checkbox"
                    checked={trackEachPieceSeparately}
                    onChange={(e) => setTrackEachPieceSeparately(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--gs-accent)]"
                  />
                  <span className="text-xs text-[var(--gs-text)]">
                    <span className="font-semibold">Track each piece separately</span>
                    <span className="block text-[var(--gs-muted)]">
                      Create {Number(itemForm.pieces) || 0} sellable pieces for this stock unit — each with its own unique # and QR.
                      The inventory table shows only this stock unit; the pieces appear when you click the row.
                    </span>
                  </span>
                </label>
              ) : null}
                    </FormSection>
                    <FormSection title="Pricing" subtitle="Unit rate and calculated amount (UOM × rate)">
                      {stdRule("rate").enabled ? (
                        <div>
                          <label htmlFor="ni-rate" className={FIELD_LABEL}>
                            Rate{stdRule("rate").required ? " *" : ""}
                          </label>
                          <input
                            id="ni-rate"
                            type="number"
                            min={0}
                            step="0.01"
                            value={itemForm.rate}
                            onChange={(e) => setItemForm((s) => ({ ...s, rate: e.target.value }))}
                            className={FIELD_INPUT}
                            placeholder="0.00"
                            required={stdRule("rate").required}
                          />
                        </div>
                      ) : null}
                      <div>
                        <label className={FIELD_LABEL}>Amount</label>
                        <div className="mt-1.5 flex h-10 items-center rounded-lg border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)] px-3 text-sm font-semibold tabular-nums text-[var(--gs-text)]">
                          {formAmountPreview !== null
                            ? formAmountPreview.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                            : ""}
                        </div>
                      </div>
                      {newItemQrUnitId ? (
                        <div className="mt-4 border-t border-[var(--gs-border)] pt-4" aria-live="polite">
                          <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">QR / label</p>
                          <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                            Server se asli QR (stock <span className="font-mono text-[var(--gs-text)]">{newItemQrUnitId.slice(0, 8)}…</span>).
                          </p>
                          <div className="mt-3 inline-flex min-h-[7.5rem] min-w-[7.5rem] items-center justify-center rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/90 p-2.5 shadow-sm">
                            {newItemQrBlobUrl ? (
                              <img
                                src={newItemQrBlobUrl}
                                alt="Stock unit QR code"
                                width={112}
                                height={112}
                                className="h-28 w-28 object-contain"
                              />
                            ) : (
                              <span className="text-xs text-[var(--gs-muted)]">QR load ho rahi hai…</span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void downloadNewItemQr()}
                              className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)]"
                            >
                              Download QR (PNG)
                            </button>
                            <button
                              type="button"
                              onClick={() => void printNewItemLabelPdf()}
                              className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)]"
                            >
                              Print label (PDF)
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </FormSection>
                  </div>
                  <FormSection title="Inventory / service details" subtitle="Where it lives, who is responsible, and notes">
                    <div
                      className={cn(
                        "grid gap-4",
                        stdRule("location").enabled && stdRule("custodian").enabled ? "sm:grid-cols-2" : "grid-cols-1",
                      )}
                    >
                      {stdRule("location").enabled ? (
                        <div>
                          <SearchableFieldPicker
                            id="ni-loc"
                            label={`Location${stdRule("location").required ? " *" : ""}`}
                            value={itemForm.location}
                            onChange={(v) => setItemForm((s) => ({ ...s, location: v }))}
                            options={locationOptionsMerged}
                            placeholder="Search locations..."
                            emptyLabel="Select location…"
                            canManageOption={canManageLocationOption}
                            onRenameOption={renameLocationOption}
                            onDeleteOption={deleteLocationOption}
                          />
                          <button
                            type="button"
                            onClick={() => void addCustomLocation()}
                            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-3 py-2 text-xs font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)] sm:w-auto"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            Add new location
                          </button>
                        </div>
                      ) : null}
                      {stdRule("custodian").enabled ? (
                        <div>
                          <SearchableFieldPicker
                            id="ni-cust"
                            label={`Custodian${stdRule("custodian").required ? " *" : ""}`}
                            value={itemForm.custodian}
                            onChange={(v) => setItemForm((s) => ({ ...s, custodian: v }))}
                            options={custodianOptionsMerged}
                            placeholder="Search custodians..."
                            emptyLabel="Select custodian…"
                            canManageOption={canManageCustodianOption}
                            onRenameOption={renameCustodianOption}
                            onDeleteOption={deleteCustodianOption}
                          />
                          <button
                            type="button"
                            onClick={() => void addCustomCustodian()}
                            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-3 py-2 text-xs font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)] sm:w-auto"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            Add new custodian
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {stdRule("details").enabled ? (
                      <div>
                        <label htmlFor="ni-details" className={FIELD_LABEL}>
                          Details / notes{stdRule("details").required ? " *" : ""}
                        </label>
                        <textarea
                          id="ni-details"
                          value={itemForm.details}
                          onChange={(e) => setItemForm((s) => ({ ...s, details: e.target.value }))}
                          rows={4}
                          className={cn(FIELD_INPUT, "min-h-[5rem] resize-y")}
                          placeholder="Treatment, batch reference, handling notes..."
                          required={stdRule("details").required}
                        />
                      </div>
                    ) : null}
                  </FormSection>
                </>
              )}
              </div>
            </form>
          </div>
          {discardConfirmOpen ? (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
              role="presentation"
              onClick={() => setDiscardConfirmOpen(false)}
            >
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="item-discard-title"
                className="w-full max-w-md rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 id="item-discard-title" className="pr-2 text-base font-bold text-[var(--gs-text)]">
                    Discard changes?
                  </h4>
                  <button
                    type="button"
                    onClick={() => setDiscardConfirmOpen(false)}
                    className="shrink-0 rounded-lg p-1.5 text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
                    aria-label="Back to form"
                  >
                    <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </button>
                </div>
                <p className="mt-2 text-sm text-[var(--gs-muted)]">You have unsaved changes. Close without saving?</p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscardConfirmOpen(false)}
                    className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    onClick={forceCloseItemModal}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                  >
                    Discard & close
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "stock" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Stock in (GRN)", desc: "Receive against PO or opening", href: "/purchases?tab=flow" },
            { title: "Stock out", desc: "Issue to production / sales", href: "/sales?tab=transactions" },
            { title: "Stock adjustment", desc: "Shrinkage / recount", href: "/inventory?tab=audit" },
          ].map((c) => (
            <button
              key={c.title}
              type="button"
              onClick={() => (c.href.startsWith("/") ? router.push(c.href) : undefined)}
              className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 text-left shadow-sm transition hover:border-[var(--gs-accent)]"
            >
              <p className="font-bold text-[var(--gs-text)]">{c.title}</p>
              <p className="mt-2 text-sm text-[var(--gs-muted)]">{c.desc}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setStockTransferMode("location");
              setTransferUnitId(serverStockRowsForTransfer[0]?.id ?? "");
              setTransferToLocation("");
              setTransferFromUnitId(serverStockRowsForTransfer[0]?.id ?? "");
              setTransferToUnitId(serverStockRowsForTransfer[1]?.id ?? "");
              setTransferQty("");
              setTransferPieces("");
              setTransferMemo("");
              setStockTransferOpen(true);
            }}
            className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 text-left shadow-sm transition hover:border-[var(--gs-accent)]"
          >
            <p className="font-bold text-[var(--gs-text)]">Stock transfer</p>
            <p className="mt-2 text-sm text-[var(--gs-muted)]">
              Move a line to another location or transfer quantity between two server stock lines.
            </p>
          </button>
          <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-5">
            <p className="text-sm font-semibold text-[var(--gs-text)]">Gemstone inventory</p>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">
              Track rough stock and graded inventory in lots and stock lines. Service catalog entries are not stock-tracked  use Stock / Services → Service catalog for billable services.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/lots"
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
              >
                Open lots
              </Link>
              <Link
                href="/inventory?tab=items"
                className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
              >
                Open stock
              </Link>
            </div>
          </div>
        </section>
      )}

      {tab === "reports" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
          <div className="border-b border-[var(--gs-border)] p-6 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--gs-text)]">Inventory reports</h2>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">
                  Overview, custodian, and type-wise totals load from the inventory server when you are signed in. Analysis
                  and item name views use stock lines currently shown in this hub (same grid as Stock items).
                </p>
              </div>
              {getAccessToken() ? (
                <button
                  type="button"
                  onClick={() => void reloadServerReports()}
                  disabled={reportsApiLoading}
                  className="shrink-0 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)] disabled:pointer-events-none disabled:opacity-50"
                >
                  {reportsApiLoading ? "Refreshing…" : "Refresh server reports"}
                </button>
              ) : null}
            </div>
            {reportsApiError ? (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {reportsApiError}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-1">
              {(
                [
                  ["overview", "Overview / Summary"],
                  ["analysis", "Analysis"],
                  ["itemname", "Item name-wise"],
                  ["custodian", "Custodian-wise"],
                  ["typewise", "Type-wise"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReportSubTab(id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
                    reportSubTab === id
                      ? "bg-[var(--gs-accent)] text-white shadow-sm"
                      : "text-[var(--gs-muted)] hover:bg-[var(--gs-card)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 pt-4">
            {reportSubTab === "overview" ? (
              <div className="space-y-6">
                {serverReportSummary && !reportsApiError ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Server totals (all active stock)</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Stock lines</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">
                          {serverReportSummary.stock_line_count}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Total primary UOM</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">
                          {Number(serverReportSummary.total_primary_uom_qty).toLocaleString(undefined, {
                            maximumFractionDigits: 4,
                          })}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Total pieces</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">
                          {serverReportSummary.total_pieces.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Total cost basis</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">
                          {Number(serverReportSummary.total_cost_basis).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-sm font-semibold text-[var(--gs-muted)]">
                            {serverReportSummary.functional_currency}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div>
                  {serverReportSummary && !reportsApiError ? (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                      Hub table roll-up (loaded lines)
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Stock lines</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">{reportOverview.lineCount}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Total UOM qty</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">
                        {reportOverview.totalUom.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Total pieces</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">
                        {reportOverview.totalPieces.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Stock value (UOM × rate)</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--gs-text)]">
                        {reportOverview.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {reportSubTab === "analysis" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--gs-border)] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Value & quantity by month (by line date)</p>
                  <p className="mt-1 text-sm text-[var(--gs-muted)]">
                    Trend reflects when lines were dated  useful for spotting intake concentration vs current stock mix.
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                      <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                        <tr>
                          <th className="px-3 py-2">Month</th>
                          <th className="px-3 py-2 text-right">UOM qty</th>
                          <th className="px-3 py-2 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                        {reportQtyByMonth.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-sm text-[var(--gs-muted)]">
                              No inventory lines yet.
                            </td>
                          </tr>
                        ) : (
                          reportQtyByMonth.map(([month, v]) => (
                            <tr key={month} className="hover:bg-[var(--gs-hover)]/80">
                              <td className="px-3 py-2 font-medium tabular-nums text-[var(--gs-text)]">{month}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                                {v.uom.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                                {v.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
            {reportSubTab === "itemname" ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Filter by type</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReportItemNameKinds(new Set())}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition sm:text-xs",
                        reportItemNameKinds.size === 0
                          ? "border-[var(--gs-accent)] bg-[var(--gs-accent)] text-white shadow-sm"
                          : "border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]",
                      )}
                    >
                      All types
                    </button>
                    {typeFilterTabs
                      .filter((t) => t.key !== "all")
                      .map(({ key, label }) => {
                        const all = reportItemNameKinds.size === 0;
                        const on = !all && reportItemNameKinds.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleReportItemNameKind(key)}
                            className={cn(
                              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition sm:text-xs",
                              on
                                ? "border-[var(--gs-accent)] bg-[var(--gs-accent)] text-white shadow-sm"
                                : "border-[var(--gs-border)] bg-[var(--gs-card)] text-[var(--gs-text)] hover:bg-[var(--gs-hover)]",
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                    <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                      <tr>
                        <th className="px-3 py-2">Item name</th>
                        <th className="px-3 py-2 text-right">Lines</th>
                        <th className="px-3 py-2 text-right">Pieces</th>
                        <th className="px-3 py-2 text-right">UOM qty</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                      {reportByItemName.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-sm text-[var(--gs-muted)]">
                            No inventory lines yet.
                          </td>
                        </tr>
                      ) : (
                        reportByItemName.map(([name, v]) => (
                          <tr key={name} className="hover:bg-[var(--gs-hover)]/80">
                            <td className="max-w-[20rem] px-3 py-2 font-medium text-[var(--gs-text)]" title={name}>
                              <span className="line-clamp-2">{name}</span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">{v.lines}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                              {v.pieces.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                              {v.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                              {v.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {reportSubTab === "custodian" ? (
              <div className="overflow-x-auto">
                {getAccessToken() && serverReportByCustodian.length > 0 && !reportsApiError ? (
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                      <tr>
                        <th className="w-8 px-1 py-2" aria-hidden />
                        <th className="px-3 py-2">Custodian</th>
                        <th className="px-3 py-2 text-right">Lines</th>
                        <th className="px-3 py-2 text-right">Total cost basis</th>
                      </tr>
                    </thead>
                    <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                      {serverReportByCustodian.map((row) => {
                        const key = row.custodian_user_id ?? "";
                        const open = serverCustodianReportExpanded === key;
                        const detailLines = reportLinesByServerCustodian.get(key) ?? [];
                        const label = custodianServerReportLabel(row.custodian_user_id);
                        return (
                          <Fragment key={key || "__none__"}>
                            <tr
                              className={cn(
                                "cursor-pointer transition-colors",
                                open ? "bg-[var(--gs-hover)]" : "hover:bg-[var(--gs-hover)]/80",
                              )}
                              onClick={() => setServerCustodianReportExpanded((prev) => (prev === key ? null : key))}
                            >
                              <td className="px-1 py-2 text-[var(--gs-muted)]">
                                {open ? (
                                  <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                                ) : (
                                  <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium text-[var(--gs-text)]">{label}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">{row.line_count}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                                {Number(row.total_cost_basis).toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                <span className="text-xs text-[var(--gs-muted)]">
                                  {serverReportSummary?.functional_currency ?? ""}
                                </span>
                              </td>
                            </tr>
                            {open ? (
                              <tr className="bg-[var(--gs-hover)]/90">
                                <td colSpan={4} className="p-0">
                                  <div className="border-t border-[var(--gs-border)] px-3 py-3 sm:px-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                                      Lines in this hub matching this custodian
                                    </p>
                                    {detailLines.length === 0 ? (
                                      <p className="mt-2 text-xs text-[var(--gs-muted)]">
                                        No rows in the current hub load, or custodian ids are not on loaded lines yet.
                                      </p>
                                    ) : (
                                      <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)]">
                                        <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
                                          <thead className="bg-[var(--gs-hover)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                                            <tr>
                                              <th className="px-2 py-1.5">Item #</th>
                                              <th className="px-2 py-1.5">Name</th>
                                              <th className="px-2 py-1.5">Type</th>
                                              <th className="px-2 py-1.5">Location</th>
                                              <th className="px-2 py-1.5 text-right">UOM</th>
                                              <th className="px-2 py-1.5 text-right">Value</th>
                                            </tr>
                                          </thead>
                                          <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                                            {detailLines.map((r) => (
                                              <tr key={r.id} className="hover:bg-[var(--gs-hover)]/80">
                                                <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[var(--gs-text)]">
                                                  {r.itemNo}
                                                </td>
                                                <td className="max-w-[14rem] px-2 py-1.5 text-[var(--gs-text)]">{r.itemName}</td>
                                                <td className="whitespace-nowrap px-2 py-1.5 text-[var(--gs-muted)]">
                                                  {kindLabel(r.itemKind, customInventoryTypes)}
                                                </td>
                                                <td className="max-w-[10rem] px-2 py-1.5 text-[var(--gs-muted)]">{r.location}</td>
                                                <td className="px-2 py-1.5 text-right tabular-nums text-[var(--gs-text)]">
                                                  {inventoryPrimaryQty(r, customInventoryTypes).toLocaleString(undefined, {
                                                    maximumFractionDigits: 4,
                                                  })}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums text-[var(--gs-text)]">
                                                  {lineAmount(r, customInventoryTypes).toLocaleString(undefined, {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 2,
                                                  })}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                      <tr>
                        <th className="w-8 px-1 py-2" aria-hidden />
                        <th className="px-3 py-2">Custodian</th>
                        <th className="px-3 py-2 text-right">Lines</th>
                        <th className="px-3 py-2 text-right">UOM qty</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                      {reportByCustodian.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-sm text-[var(--gs-muted)]">
                            No inventory lines yet.
                          </td>
                        </tr>
                      ) : (
                        reportByCustodian.map(([name, v]) => {
                          const open = custodianReportExpanded === name;
                          const detailLines = reportLinesByCustodian.get(name) ?? [];
                          return (
                            <Fragment key={name}>
                              <tr
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  open ? "bg-[var(--gs-hover)]" : "hover:bg-[var(--gs-hover)]/80",
                                )}
                                onClick={() =>
                                  setCustodianReportExpanded((prev) => (prev === name ? null : name))
                                }
                              >
                                <td className="px-1 py-2 text-[var(--gs-muted)]">
                                  {open ? (
                                    <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                                  )}
                                </td>
                                <td className="px-3 py-2 font-medium text-[var(--gs-text)]">{name}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">{v.lines}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                                  {v.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                                  {v.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                              {open ? (
                                <tr className="bg-[var(--gs-hover)]/90">
                                  <td colSpan={5} className="p-0">
                                    <div className="border-t border-[var(--gs-border)] px-3 py-3 sm:px-4">
                                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                                        Stock lines {name}
                                      </p>
                                      <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)]">
                                        <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
                                          <thead className="bg-[var(--gs-hover)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                                            <tr>
                                              <th className="px-2 py-1.5">Item #</th>
                                              <th className="px-2 py-1.5">Name</th>
                                              <th className="px-2 py-1.5">Type</th>
                                              <th className="px-2 py-1.5">Location</th>
                                              <th className="px-2 py-1.5 text-right">UOM</th>
                                              <th className="px-2 py-1.5 text-right">Value</th>
                                            </tr>
                                          </thead>
                                          <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                                            {detailLines.map((r) => (
                                              <tr key={r.id} className="hover:bg-[var(--gs-hover)]/80">
                                                <td className="whitespace-nowrap px-2 py-1.5 font-mono text-[var(--gs-text)]">
                                                  {r.itemNo}
                                                </td>
                                                <td className="max-w-[14rem] px-2 py-1.5 text-[var(--gs-text)]">{r.itemName}</td>
                                                <td className="whitespace-nowrap px-2 py-1.5 text-[var(--gs-muted)]">
                                                  {kindLabel(r.itemKind, customInventoryTypes)}
                                                </td>
                                                <td className="max-w-[10rem] px-2 py-1.5 text-[var(--gs-muted)]">{r.location}</td>
                                                <td className="px-2 py-1.5 text-right tabular-nums text-[var(--gs-text)]">
                                                  {inventoryPrimaryQty(r, customInventoryTypes).toLocaleString(undefined, {
                                                    maximumFractionDigits: 4,
                                                  })}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums text-[var(--gs-text)]">
                                                  {lineAmount(r, customInventoryTypes).toLocaleString(undefined, {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 2,
                                                  })}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
            {reportSubTab === "typewise" ? (
              <div className="overflow-x-auto">
                {getAccessToken() && serverReportByType.length > 0 && !reportsApiError ? (
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                      <tr>
                        <th className="px-3 py-2">Item type</th>
                        <th className="px-3 py-2 text-right">Lines</th>
                        <th className="px-3 py-2 text-right">Total cost basis</th>
                      </tr>
                    </thead>
                    <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                      {serverReportByType.map((row) => (
                        <tr key={row.item_type_id} className="hover:bg-[var(--gs-hover)]/80">
                          <td className="px-3 py-2 font-medium text-[var(--gs-text)]">{row.item_type_label}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">{row.line_count}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                            {Number(row.total_cost_basis).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{" "}
                            <span className="text-xs text-[var(--gs-muted)]">
                              {serverReportSummary?.functional_currency ?? ""}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                    <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                      <tr>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Lines</th>
                        <th className="px-3 py-2 text-right">UOM qty</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                      {reportByType.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-sm text-[var(--gs-muted)]">
                            No inventory lines yet.
                          </td>
                        </tr>
                      ) : (
                        reportByType.map(([label, v]) => (
                          <tr key={label} className="hover:bg-[var(--gs-hover)]/80">
                            <td className="px-3 py-2 font-medium text-[var(--gs-text)]">{label}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">{v.lines}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                              {v.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-[var(--gs-text)]">
                              {v.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
            <p className="mt-6 text-xs text-[var(--gs-muted)]">
              Align with accounting periods via{" "}
              <Link href="/reports?tab=hub" className="font-semibold text-[var(--gs-accent)] hover:underline">
                Reports → hub
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      {tab === "audit" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
          <div className="border-b border-[var(--gs-border)] p-6">
            <h2 className="text-lg font-bold text-[var(--gs-text)]">Audit / Stock count</h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[12rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gs-muted)]"
                  strokeWidth={2}
                  aria-hidden
                />
                <input
                  id="audit-search"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search item #, name, or UOM..."
                  className="w-full rounded-xl border border-[var(--gs-border)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                  aria-label="Search stock lines for audit"
                />
              </div>
              <AuditSaveDropdown
                disabled={auditFilteredStockRows.length === 0 || auditSaving}
                onSaveNow={() => void commitAudit("now")}
                onSaveAndClose={() => void commitAudit("close")}
              />
            </div>
          </div>
          <div className="overflow-x-auto px-3 pb-6 sm:px-5">
            <table className="w-full min-w-[52rem] table-fixed border-collapse text-left text-[11px] sm:text-sm">
              <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)] sm:text-xs">
                <tr>
                  <th className="min-w-[8rem] px-2 py-2">Item #</th>
                  <th className="min-w-[10rem] px-2 py-2">Name</th>
                  <th className="px-2 py-2">Custodian</th>
                  <th className="px-2 py-2 text-right">System UOM</th>
                  <th className="px-2 py-2 text-right">Physical</th>
                  <th className="px-2 py-2 text-right">Variance</th>
                  <th className="px-2 py-2 text-center">Verified</th>
                </tr>
              </thead>
              <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                {inventoryStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--gs-muted)]">
                      No stock lines  add stock under Stock / Services → Stock items.
                    </td>
                  </tr>
                ) : auditVisibleStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--gs-muted)]">
                      All stock lines have been completed for this audit.
                    </td>
                  </tr>
                ) : auditFilteredStockRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--gs-muted)]">
                      No lines match your search.
                    </td>
                  </tr>
                ) : (
                  auditFilteredStockRows.map((r) => {
                    const d = auditDraft[r.id] ?? { physical: "", verified: false };
                    const physRaw = d.physical.trim();
                    const physNum = physRaw === "" ? null : Number(physRaw);
                    const variance =
                      physNum !== null && Number.isFinite(physNum) ? physNum - r.uom : null;
                    return (
                      <tr key={r.id} className="hover:bg-[var(--gs-hover)]/80">
                        <td className="px-2 py-2 font-mono text-xs text-[var(--gs-text)]">{r.itemNo}</td>
                        <td className="px-2 py-2 font-medium text-[var(--gs-text)]">{r.itemName}</td>
                        <td className="px-2 py-2 text-[var(--gs-muted)]">{r.custodian}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--gs-text)]">
                          {r.uom.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={d.physical}
                            onChange={(e) =>
                              setAuditDraft((prev) => ({
                                ...prev,
                                [r.id]: { ...d, physical: e.target.value },
                              }))
                            }
                            className="w-full min-w-[5rem] rounded-lg border border-[var(--gs-border)] px-2 py-1 text-right text-xs tabular-nums outline-none focus:border-[var(--gs-accent)] sm:text-sm"
                            placeholder=""
                            aria-label={`Physical count for ${r.itemNo}`}
                          />
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-[var(--gs-text)]">
                          {variance === null ? (
                            <span className="text-[var(--gs-muted)]"></span>
                          ) : (
                            <span
                              className={
                                variance === 0
                                  ? "text-emerald-700"
                                  : variance > 0
                                    ? "text-amber-700"
                                    : "text-rose-700"
                              }
                            >
                              {variance > 0 ? "+" : ""}
                              {variance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={d.verified}
                            onChange={(e) =>
                              setAuditDraft((prev) => ({
                                ...prev,
                                [r.id]: { ...d, verified: e.target.checked },
                              }))
                            }
                            className="h-4 w-4 rounded border-[var(--gs-border-strong)] text-[var(--gs-text)]"
                            aria-label={`Verified / available for ${r.itemNo}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--gs-border)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--gs-text)]">Saved audit records</h3>
              {getAccessToken() ? (
                <button
                  type="button"
                  onClick={() => void reloadAuditSessions()}
                  disabled={auditHistoryLoading}
                  className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-1 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                >
                  {auditHistoryLoading ? "Loading…" : "Refresh from server"}
                </button>
              ) : null}
            </div>
            {auditHistoryLoading && auditRecords.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--gs-muted)]">Loading audit history…</p>
            ) : auditRecords.length > 0 ? (
              <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto text-sm">
                {auditRecords.map((rec) => (
                  <li
                    key={rec.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-3 py-2"
                  >
                    <span className="font-medium text-[var(--gs-text)]">
                      {new Date(rec.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-[var(--gs-muted)]">
                      {rec.lines.length} lines
                      {rec.note ? ` · ${rec.note}` : ""}
                      {isServerUuid(rec.id) ? " · server" : isInventoryGuestMode() ? " · demo" : " · session"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--gs-muted)]">
                {getAccessToken()
                  ? "No audit sessions yet. Save a count above to create one on the server."
                  : "Sign in to load audit history from the server."}
              </p>
            )}
          </div>
        </section>
      )}

      {stockTransferOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12"
          role="presentation"
          onClick={() => !transferBusy && setStockTransferOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="stock-transfer-title"
            aria-modal="true"
            className="my-8 w-full max-w-lg rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="stock-transfer-title" className="text-lg font-bold text-[var(--gs-text)]">
                  Stock transfer
                </h2>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">
                  Requires sign-in and server inventory writes. Uses the inventory API on the server.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStockTransferOpen(false)}
                disabled={transferBusy}
                className="rounded-lg p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStockTransferMode("location")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  stockTransferMode === "location"
                    ? "bg-[var(--gs-accent)] text-white"
                    : "border border-[var(--gs-border)] text-[var(--gs-text)]"
                }`}
              >
                Move location
              </button>
              <button
                type="button"
                onClick={() => setStockTransferMode("qty")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  stockTransferMode === "qty"
                    ? "bg-[var(--gs-accent)] text-white"
                    : "border border-[var(--gs-border)] text-[var(--gs-text)]"
                }`}
              >
                Transfer quantity
              </button>
            </div>
            {serverStockRowsForTransfer.length === 0 ? (
              <p className="mt-4 text-sm text-amber-800">
                No server stock lines in this catalog. Add stock under Stock items while signed in.
              </p>
            ) : stockTransferMode === "location" ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitStockTransfer();
                }}
              >
                <label className="block text-xs font-semibold text-[var(--gs-muted)]">
                  Stock line
                  <select
                    value={transferUnitId}
                    onChange={(e) => setTransferUnitId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  >
                    {serverStockRowsForTransfer.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.itemNo} — {r.itemName}
                        {r.location ? ` (${r.location})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[var(--gs-muted)]">
                  New location
                  <input
                    list="transfer-location-options"
                    value={transferToLocation}
                    onChange={(e) => setTransferToLocation(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                    placeholder="e.g. Vault A"
                  />
                  <datalist id="transfer-location-options">
                    {locationPickerOptions.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </label>
                <button
                  type="submit"
                  disabled={transferBusy}
                  className="w-full rounded-full bg-[var(--gs-accent)] py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
                >
                  {transferBusy ? "Saving…" : "Move to location"}
                </button>
              </form>
            ) : (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitStockTransfer();
                }}
              >
                <label className="block text-xs font-semibold text-[var(--gs-muted)]">
                  From (source)
                  <select
                    value={transferFromUnitId}
                    onChange={(e) => setTransferFromUnitId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  >
                    {serverStockRowsForTransfer.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.itemNo} — {r.itemName} (UOM {r.uom})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-[var(--gs-muted)]">
                  To (destination)
                  <select
                    value={transferToUnitId}
                    onChange={(e) => setTransferToUnitId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  >
                    {serverStockRowsForTransfer.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.itemNo} — {r.itemName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-[var(--gs-muted)]">
                    Quantity (UOM)
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={transferQty}
                      onChange={(e) => setTransferQty(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[var(--gs-muted)]">
                    Pieces (optional)
                    <input
                      type="number"
                      step={1}
                      min={0}
                      value={transferPieces}
                      onChange={(e) => setTransferPieces(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-[var(--gs-muted)]">
                  Memo
                  <input
                    value={transferMemo}
                    onChange={(e) => setTransferMemo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={transferBusy}
                  className="w-full rounded-full bg-[var(--gs-accent)] py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:opacity-50"
                >
                  {transferBusy ? "Transferring…" : "Transfer quantity"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {viewAllTypesOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12"
          role="presentation"
          onClick={() => setViewAllTypesOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="view-types-title"
            aria-modal="true"
            className="my-8 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-[var(--gs-border)] px-6 py-4">
              <div>
                <h2 id="view-types-title" className="text-lg font-bold text-[var(--gs-text)]">
                  Manage types
                </h2>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">Edit or delete your inventory types. Built-in Rough and Cut cannot be changed.</p>
              </div>
              <button
                type="button"
                onClick={() => setViewAllTypesOpen(false)}
                className="rounded-lg p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto px-6 py-5">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Built-in</h3>
                <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <li className="rounded-xl border border-[var(--gs-border)] p-3">
                    <p className="font-semibold text-[var(--gs-text)]">Rough</p>
                    <p className="mt-1 text-xs text-[var(--gs-muted)]">
                      Grade (fixed list), UOM quantity, pieces, rate, amount, location, custodian, details.
                    </p>
                  </li>
                  <li className="rounded-xl border border-[var(--gs-border)] p-3">
                    <p className="font-semibold text-[var(--gs-text)]">Cut</p>
                    <p className="mt-1 text-xs text-[var(--gs-muted)]">
                      Length, width, height/thickness, UOM quantity, pieces, rate, amount, plus common fields.
                    </p>
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Other types</h3>
                {customInventoryTypes.length > 0 ? (
                  <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {customInventoryTypes.map((t) => (
                      <li key={t.id} className="rounded-xl border border-[var(--gs-border)] p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold text-[var(--gs-text)]">{t.label}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditInventoryType(t)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--gs-border)] px-2 py-1 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteInventoryType(t.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--gs-border)] px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-[var(--gs-muted)]">
                          UOM:{" "}
                          {t.uomTab === "custom" && t.customUomLabel
                            ? t.customUomLabel
                            : t.uomTab === "kg"
                              ? "Kilogram (kg)"
                              : t.uomTab === "liter"
                                ? "Liter (L)"
                                : t.uomTab === "piece"
                                  ? "Piece (pc)"
                                  : ""}
                        </p>
                        {t.builderFields && t.builderFields.length > 0 ? (
                          <ul className="mt-2 list-inside list-disc text-xs text-[var(--gs-muted)]">
                            {t.builderFields.map((f) => (
                              <li key={f.id}>
                                {f.label} ({f.kind}
                                {f.kind === "dropdown" && f.options?.length ? `: ${f.options.join(", ")}` : ""})
                              </li>
                            ))}
                          </ul>
                        ) : t.fieldPreset ? (
                          <p className="mt-2 text-sm text-[var(--gs-muted)]">
                            Legacy layout: mirrors <strong>{t.fieldPreset === KIND_CUT ? "Cut (dimensions)" : "Rough (grade)"}</strong>.
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-[var(--gs-muted)]">No fields defined.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--gs-muted)]">No custom types yet. Use New item → + Add New Type.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}