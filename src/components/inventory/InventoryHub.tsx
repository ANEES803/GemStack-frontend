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
  Trash2,
  X,
  Sheet,
  Table,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DEMO_REVENUE_ACCOUNTS, revenueAccountLabel } from "@/lib/demoRevenueAccounts";
import { loadItemCatalog, saveItemCatalog, type StoredItemRow } from "@/lib/itemCatalogStorage";
import { getAccessToken } from "@/lib/authClient";
import { fetchRoughLotPickerOptions } from "@/lib/purchaseLotsApi";
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

const AUDIT_RECORDS_KEY = "gemstack-inventory-audit-records-v1";

function loadAuditRecords(): AuditRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUDIT_RECORDS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p as AuditRecord[];
  } catch {
    return [];
  }
}

function persistAuditRecords(records: AuditRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIT_RECORDS_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

const AUDIT_CLOSED_IDS_KEY = "gemstack-inventory-audit-closed-ids-v1";

function loadAuditClosedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(AUDIT_CLOSED_IDS_KEY);
    if (!raw) return new Set();
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return new Set();
    return new Set(p.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistAuditClosedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIT_CLOSED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

const ADD_NEW_TYPE_VALUE = "__add_new_type__";

const CUSTOM_INVENTORY_LOCATIONS_KEY = "gemstack-inventory-custom-locations-v1";

function loadCustomLocations(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_INVENTORY_LOCATIONS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function persistCustomLocations(locations: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_INVENTORY_LOCATIONS_KEY, JSON.stringify(locations));
  } catch {
    /* ignore */
  }
}

const CUSTOM_INVENTORY_CUSTODIANS_KEY = "gemstack-inventory-custom-custodians-v1";

function loadCustomCustodians(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_INVENTORY_CUSTODIANS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function persistCustomCustodians(names: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_INVENTORY_CUSTODIANS_KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}

const CUSTOM_INVENTORY_CATEGORIES_KEY = "gemstack-inventory-custom-categories-v1";

function loadCustomCategories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_INVENTORY_CATEGORIES_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function persistCustomCategories(categories: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_INVENTORY_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {
    /* ignore */
  }
}

const HIDDEN_LOCATION_PRESETS_KEY = "gemstack-inventory-hidden-location-presets-v1";

function loadHiddenLocationPresets(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_LOCATION_PRESETS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function persistHiddenLocationPresets(names: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HIDDEN_LOCATION_PRESETS_KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}

const HIDDEN_CUSTODIAN_PRESETS_KEY = "gemstack-inventory-hidden-custodian-presets-v1";

function loadHiddenCustodianPresets(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_CUSTODIAN_PRESETS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function persistHiddenCustodianPresets(names: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HIDDEN_CUSTODIAN_PRESETS_KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}

const HIDDEN_CATEGORY_PRESETS_KEY = "gemstack-inventory-hidden-category-presets-v1";

function loadHiddenCategoryPresets(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_CATEGORY_PRESETS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function persistHiddenCategoryPresets(names: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HIDDEN_CATEGORY_PRESETS_KEY, JSON.stringify(names));
  } catch {
    /* ignore */
  }
}

/** Default category labels merged with custom and row-derived values */
const DEFAULT_CATEGORY_OPTIONS = ["Faceted", "Services", "Rough"] as const;

/** Demo placeholder PNG (1×1)  replace with real QR data URL from API. */
const DUMMY_NEW_ITEM_QR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type AddTypeSpecMode = "rough" | "cut" | "builder";

const GRADE_OPTIONS = ["AAA", "AA", "A", "B", "C", "Commercial", ""] as const;

type ItemLineEntryType = "inventory" | "service";

type ItemRow = {
  id: string;
  /** Top-level line: stocked inventory vs non-stock service */
  entryType: ItemLineEntryType;
  /** Optional image (demo: data URL stored in state; replace with URL after upload API) */
  imageDataUrl: string | null;
  itemNo: string;
  date: string;
  itemName: string;
  /** Inventory item kind: Rough (grade) or Cut (dimensions), or custom id */
  itemKind: ItemKindKey;
  category: string;
  type: "Product" | "Service" | "Raw";
  /** Used when field preset is Rough */
  grade: string;
  /** Used when field preset is Cut */
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  /** Unit of measure quantity  amount = uom × rate */
  uom: number;
  pieces: number;
  rate: number;
  location: string;
  custodian: string;
  details: string;
  /** JSON object: field id → value for builder-based custom types */
  customFieldValuesJson: string;
  /** Optional unit label for service lines (e.g. Hours) */
  serviceUnit: string;
  /** Revenue (income) COA link for service lines  demo ids from `demoRevenueAccounts` */
  revenueAccountId: string;
  /** Linked rough purchase lot (demo); only used when `itemKind` is Rough */
  linkedRoughLotCode: string;
};

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
    category: "Faceted",
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
    category: "Services",
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
    category: "Rough",
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
    category: "Faceted",
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
    "Category",
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
        esc(r.category),
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
    window.alert(`Demo: export ${rows.length} item(s)  connect API for full export.`);
  }, [rows.length]);

  const runPdf = useCallback(() => {
    window.alert("Demo: Download to PDF  connect report service or window.print() from a preview.");
  }, []);

  const runCsv = useCallback(() => {
    downloadTextFile(`items-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(rows, customTypes), "text/csv;charset=utf-8;");
    close();
  }, [rows, customTypes, close]);

  const runExcel = useCallback(() => {
    window.alert("Demo: Download to Excel (.xlsx)  connect API or add a sheet library; CSV download is available now.");
    close();
  }, [close]);

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
  onSaveNow: () => void;
  onSaveAndClose: () => void;
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function readFile(file: File) {
    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file (PNG, JPG, WebP, etc.).");
      return;
    }
    if (file.size > MAX_ITEM_IMAGE_BYTES) {
      window.alert(`Image must be under ${Math.round(MAX_ITEM_IMAGE_BYTES / 1e6)} MB.`);
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
                        const n = window.prompt(`Rename "${opt}" to`, opt);
                        if (n == null) return;
                        const t = n.trim();
                        if (!t || t === opt) return;
                        onRenameOption(opt, t);
                        if (value === opt) onChange(t);
                        setOpen(false);
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
                        if (!window.confirm(`Remove "${opt}" from the list? Items using it will be cleared.`)) return;
                        onDeleteOption(opt);
                        if (value === opt) onChange("");
                        setOpen(false);
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
  const specMode: AddTypeSpecMode = hasBuilder ? "builder" : t.fieldPreset === KIND_CUT ? "cut" : "rough";
  return {
    label: t.label,
    uomTab: t.uomTab,
    customUom: t.customUomLabel ?? "",
    specMode,
    standardFields: mergeStandardFields(t.standardFields),
    builderFields: hasBuilder
      ? t.builderFields!.map((f) => ({
          ...f,
          visible: f.visible !== false,
          required: f.required !== false,
        }))
      : [{ id: newFieldId(), label: "Field 1", kind: "text", required: true, visible: true }],
  };
}

function ItemRowActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Row actions"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] py-1 shadow-lg ring-1 ring-[var(--gs-border)]"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
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
  category: "Faceted",
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
    category: f.category,
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

  const [rows, setRows] = useState<ItemRow[]>(INITIAL_ITEMS);
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
  /** Serialized `normalizeItemForm` when the modal opened  for dirty detection */
  const [itemFormBaselineKey, setItemFormBaselineKey] = useState<string | null>(null);
  /** Shown after a new inventory item is saved (not edit or service). */
  const [newItemQrDataUrl, setNewItemQrDataUrl] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [customInventoryTypes, setCustomInventoryTypes] = useState<CustomInventoryType[]>([]);
  const [addTypeModalOpen, setAddTypeModalOpen] = useState(false);
  const [viewAllTypesOpen, setViewAllTypesOpen] = useState(false);
  const [splitParcelOpen, setSplitParcelOpen] = useState(false);
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
    setAuditRecords(loadAuditRecords());
    setAuditClosedItemIds(loadAuditClosedIds());
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
    const loaded = loadItemCatalog();
    if (!loaded?.length) return;
    setRows(
      loaded.map((r) => ({
        ...r,
        revenueAccountId: r.revenueAccountId ?? (r.entryType === "service" ? "8" : ""),
        linkedRoughLotCode: r.linkedRoughLotCode ?? "",
      })) as ItemRow[],
    );
  }, []);

  useEffect(() => {
    saveItemCatalog(rows as StoredItemRow[]);
  }, [rows]);

  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [customCustodians, setCustomCustodians] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [hiddenLocationPresets, setHiddenLocationPresets] = useState<string[]>([]);
  const [hiddenCustodianPresets, setHiddenCustodianPresets] = useState<string[]>([]);
  const [hiddenCategoryPresets, setHiddenCategoryPresets] = useState<string[]>([]);

  useEffect(() => {
    setCustomLocations(loadCustomLocations());
    setCustomCustodians(loadCustomCustodians());
    setCustomCategories(loadCustomCategories());
    setHiddenLocationPresets(loadHiddenLocationPresets());
    setHiddenCustodianPresets(loadHiddenCustodianPresets());
    setHiddenCategoryPresets(loadHiddenCategoryPresets());
  }, []);

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
    persistCustomCategories(customCategories);
  }, [customCategories]);

  useEffect(() => {
    persistHiddenLocationPresets(hiddenLocationPresets);
  }, [hiddenLocationPresets]);

  useEffect(() => {
    persistHiddenCustodianPresets(hiddenCustodianPresets);
  }, [hiddenCustodianPresets]);

  useEffect(() => {
    persistHiddenCategoryPresets(hiddenCategoryPresets);
  }, [hiddenCategoryPresets]);

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

  const categoryPickerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of DEFAULT_CATEGORY_OPTIONS) {
      if (!hiddenCategoryPresets.includes(c)) set.add(c);
    }
    rows.forEach((r) => {
      if (r.entryType !== "inventory") return;
      if (r.category && r.category !== "") set.add(r.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, hiddenCategoryPresets]);

  const categoryOptionsMerged = useMemo(() => {
    const set = new Set<string>(categoryPickerOptions);
    customCategories.forEach((c) => {
      const t = c.trim();
      if (t) set.add(t);
    });
    const cur = itemForm.category.trim();
    if (cur) set.add(cur);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categoryPickerOptions, customCategories, itemForm.category]);

  const addCustomLocation = useCallback(() => {
    const name = window.prompt("Enter new location name:");
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomLocations((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setItemForm((s) => ({ ...s, location: trimmed }));
  }, []);

  const addCustomCustodian = useCallback(() => {
    const name = window.prompt("Enter new custodian name:");
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomCustodians((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setItemForm((s) => ({ ...s, custodian: trimmed }));
  }, []);

  const addCustomCategory = useCallback(() => {
    const name = window.prompt("Enter new category name:");
    if (name == null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomCategories((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setItemForm((s) => ({ ...s, category: trimmed }));
  }, []);

  const renameLocationOption = useCallback((from: string, to: string) => {
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
  }, []);

  const deleteLocationOption = useCallback((name: string) => {
    setRows((prev) =>
      prev.map((r) => (r.entryType === "inventory" && r.location === name ? { ...r, location: "" } : r)),
    );
    setCustomLocations((prev) => prev.filter((x) => x !== name));
    if ((ALL_LOCATIONS as readonly string[]).includes(name)) {
      setHiddenLocationPresets((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }
    setItemForm((s) => (s.location === name ? { ...s, location: "" } : s));
    setLocationFilter((f) => (f === name ? "All" : f));
  }, []);

  const renameCustodianOption = useCallback((from: string, to: string) => {
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
  }, []);

  const deleteCustodianOption = useCallback((name: string) => {
    setRows((prev) =>
      prev.map((r) => (r.entryType === "inventory" && r.custodian === name ? { ...r, custodian: "" } : r)),
    );
    setCustomCustodians((prev) => prev.filter((x) => x !== name));
    if ((ALL_CUSTODIANS as readonly string[]).includes(name)) {
      setHiddenCustodianPresets((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }
    setItemForm((s) => (s.custodian === name ? { ...s, custodian: "" } : s));
  }, []);

  const renameCategoryOption = useCallback((from: string, to: string) => {
    setRows((prev) =>
      prev.map((r) => (r.entryType === "inventory" && r.category === from ? { ...r, category: to } : r)),
    );
    setCustomCategories((prev) => {
      const i = prev.indexOf(from);
      if (i >= 0) {
        const next = [...prev];
        next[i] = to;
        return [...new Set(next.filter(Boolean))];
      }
      if ((DEFAULT_CATEGORY_OPTIONS as readonly string[]).includes(from as (typeof DEFAULT_CATEGORY_OPTIONS)[number])) {
        return prev.includes(to) ? prev : [...prev, to];
      }
      return prev;
    });
    setHiddenCategoryPresets((prev) =>
      from && (DEFAULT_CATEGORY_OPTIONS as readonly string[]).includes(from as (typeof DEFAULT_CATEGORY_OPTIONS)[number]) && !prev.includes(from)
        ? [...prev, from]
        : prev,
    );
    setItemForm((s) => (s.category === from ? { ...s, category: to } : s));
  }, []);

  const deleteCategoryOption = useCallback((name: string) => {
    setRows((prev) =>
      prev.map((r) => (r.entryType === "inventory" && r.category === name ? { ...r, category: "" } : r)),
    );
    setCustomCategories((prev) => prev.filter((x) => x !== name));
    if ((DEFAULT_CATEGORY_OPTIONS as readonly string[]).includes(name as (typeof DEFAULT_CATEGORY_OPTIONS)[number])) {
      setHiddenCategoryPresets((prev) => (prev.includes(name) ? prev : [...prev, name]));
    }
    setItemForm((s) => (s.category === name ? { ...s, category: "" } : s));
  }, []);

  const canManageLocationOption = useCallback((opt: string) => Boolean(opt.trim()), []);
  const canManageCustodianOption = useCallback((opt: string) => Boolean(opt.trim()), []);
  const canManageCategoryOption = useCallback((opt: string) => Boolean(opt.trim()), []);

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
    if (!splitSourceRow) return null;
    if (splitTotals.uom > splitSourceRow.uom) return "Split UOM exceeds available source UOM.";
    if (splitTotals.pieces > splitSourceRow.pieces) return "Split pieces exceed available source pieces.";
    return null;
  }, [splitSourceRow, splitTotals]);

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
    const filtered = rows.filter((r) => {
      if (itemCatalogScope === "stock" && r.entryType !== "inventory") return false;
      if (itemCatalogScope === "services" && r.entryType !== "service") return false;
      if (itemCatalogScope === "stock" && itemKindFilterKeys.size > 0 && !itemKindFilterKeys.has(r.itemKind)) return false;
      if (itemCatalogScope === "stock" && locationFilter !== "All" && r.location !== locationFilter) return false;
      if (periodFrom && r.date < periodFrom) return false;
      if (periodTo && r.date > periodTo) return false;
      const q = itemSearch.trim().toLowerCase();
      if (!q) return true;
      const hay = [
        r.itemNo,
        r.itemName,
        kindLabel(r.itemKind, customInventoryTypes),
        r.category,
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
    setItemFormBaselineKey(null);
    setNewItemQrDataUrl(null);
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
    setNewItemQrDataUrl(null);
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

  function deleteInventoryType(typeId: string) {
    if (!window.confirm("Delete this inventory type? Items using it will switch to Rough.")) return;
    setCustomInventoryTypes((prev) => prev.filter((x) => x.id !== typeId));
    setRows((prev) =>
      prev.map((r) => (r.itemKind === typeId ? { ...r, itemKind: KIND_ROUGH, customFieldValuesJson: "{}" } : r)),
    );
    setItemForm((s) => (s.itemTypeKey === typeId ? { ...s, itemTypeKey: KIND_ROUGH, customFields: {} } : s));
  }

  function openSplitParcel() {
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

  function submitSplitParcel() {
    const validation = splitValidationMessage();
    if (validation) {
      setSplitError(validation);
      return;
    }
    if (!splitSourceRow) return;

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
    window.alert(`Parcel split complete. Created ${newRows.length} new parcel(s).`);
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
      category: row.category,
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
    setNewItemQrDataUrl(null);
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

  function deleteItem(id: string) {
    if (!window.confirm("Delete this item? This cannot be undone in the demo.")) return;
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
      window.alert("Only Excel (.xlsx, .xls) and CSV files are allowed for import.");
      return;
    }
    window.alert(
      `Demo: received ${list.length} file(s): ${list.map((f) => `${f.name} (${Math.round(f.size / 1024)} KB)`).join(", ")}. Parse on the server and upsert items.`,
    );
  }

  function submitItemForm(e: React.FormEvent) {
    e.preventDefault();
    const wasEdit = Boolean(editingItemId);

    if (itemForm.entryType === "service") {
      if (!itemForm.itemName.trim()) {
        window.alert("Enter a service name.");
        return;
      }
      if (!itemForm.revenueAccountId.trim()) {
        window.alert("Select a revenue (income) account for this service.");
        return;
      }
      const rate = Number(itemForm.rate);
      if (!Number.isFinite(rate) || rate < 0) {
        window.alert("Enter a valid rate / price.");
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
        category: "Services",
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
      window.alert(wasEdit ? "Demo: service updated. Wire save to your API." : "Demo: service saved. Wire save to your API.");
      return;
    }

    if (!itemForm.itemNo.trim()) {
      window.alert("Item # is required.");
      return;
    }
    if (!itemForm.date.trim()) {
      window.alert("Enter a date.");
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
    const rCat = resolveStandardFieldRule("category", customStd);
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
      window.alert("Item name is required.");
      return;
    }

    if (isBuiltinKind(itemForm.itemTypeKey)) {
      if (!Number.isFinite(piecesNum) || piecesNum < 0) {
        window.alert("Enter a valid pieces count.");
        return;
      }
      if (!Number.isFinite(uomNum) || uomNum < 0) {
        window.alert("Enter a valid UOM.");
        return;
      }
      if (!Number.isFinite(rateNum) || rateNum < 0) {
        window.alert("Enter a valid rate.");
        return;
      }
      effUom = uomNum;
      effPieces = piecesNum;
      effRate = rateNum;
    } else {
      if (rPieces.enabled && (!Number.isFinite(piecesNum) || piecesNum < 0)) {
        window.alert("Enter a valid pieces count.");
        return;
      }
      if (rUom.enabled && (!Number.isFinite(uomNum) || uomNum < 0)) {
        window.alert("Enter a valid UOM.");
        return;
      }
      if (rRate.enabled && (!Number.isFinite(rateNum) || rateNum < 0)) {
        window.alert("Enter a valid rate.");
        return;
      }
    }

    const mode = getInventoryTypeUiMode(itemForm.itemTypeKey, customInventoryTypes);
    if (mode === "cut") {
      if (!itemForm.dimLength.trim() || !itemForm.dimWidth.trim() || !itemForm.dimHeight.trim()) {
        window.alert("Enter length, width, and height / thickness for this item type.");
        return;
      }
    }
    if (mode === "builder") {
      const t = customInventoryTypes.find((x) => x.id === itemForm.itemTypeKey);
      const fields = t?.builderFields ?? [];
      for (const f of fields) {
        if (f.required === false) continue;
        if (!itemForm.customFields[f.id]?.trim()) {
          window.alert(`Enter a value for "${f.label}".`);
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
      category: rCat.enabled ? itemForm.category : "Faceted",
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
    if (editingItemId) {
      setRows((prev) => prev.map((r) => (r.id === editingItemId ? rowPayload : r)));
      forceCloseItemModal();
      window.alert("Demo: item updated. Wire save to your API.");
      return;
    }
    setRows((prev) => [rowPayload, ...prev]);
    setNewItemQrDataUrl(DUMMY_NEW_ITEM_QR_DATA_URL);
    setItemFormBaselineKey(itemFormSnapshot(itemForm));
  }

  const downloadNewItemQr = useCallback(() => {
    if (!newItemQrDataUrl) return;
    const safeNo = itemForm.itemNo.trim().replace(/[^\w.-]+/g, "_") || "item";
    const a = document.createElement("a");
    a.href = newItemQrDataUrl;
    a.download = `${safeNo}-qr.png`;
    a.rel = "noopener";
    a.click();
  }, [newItemQrDataUrl, itemForm.itemNo]);

  const commitAudit = useCallback(
    (mode: "now" | "close") => {
      if (auditFilteredStockRows.length === 0) {
        window.alert("No lines to save.");
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
      setAuditRecords((prev) => {
        const next = [rec, ...prev];
        persistAuditRecords(next);
        return next;
      });
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
        window.alert(
          idsToClose.length === 0
            ? "Audit saved (demo). No lines were marked Verified  nothing was removed from the audit list. Tick Verified for rows to complete, then Save and Close again."
            : `Audit saved (demo). ${idsToClose.length} verified line(s) removed from this audit list. Wire save to your API for production.`,
        );
      } else {
        window.alert("Audit saved (demo). You can keep editing counts. Wire save to your API for production.");
      }
    },
    [auditFilteredStockRows, auditDraft],
  );

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
                  <button
                    type="button"
                    onClick={openSplitParcel}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)]"
                  >
                    <Table className="h-3.5 w-3.5 text-[var(--gs-muted)]" strokeWidth={2} aria-hidden />
                    Split Parcel
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={openNewItemModal}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--gs-accent)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                  {itemCatalogScope === "services" ? "New service" : "New item"}
                </button>
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
          <div className="w-full overflow-x-hidden px-3 pb-5 sm:px-5">
            {itemCatalogScope === "services" ? (
            <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-sm">
              <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)] sm:text-xs">
                <tr>
                  <th className="min-w-[10rem] px-4 py-3">Service name</th>
                  <th className="min-w-[12rem] px-4 py-3">Description</th>
                  <th className="whitespace-nowrap px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="min-w-[10rem] px-4 py-3">Revenue account</th>
                  <th className="w-12 px-2 py-3 text-right" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gs-border)]">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--gs-hover)]/80">
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
                    <td className="px-2 py-2 text-right">
                      <ItemRowActionMenu onEdit={() => openEditItemModal(r)} onDelete={() => deleteItem(r.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            ) : (
            <table className="w-full table-fixed border-collapse text-left text-[11px] sm:text-sm">
              <colgroup>
                {Array.from({ length: 12 }, (_, i) => (
                  <col key={i} style={{ width: `${100 / 12}%` }} />
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
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-left align-middle leading-tight">
                    <span className="line-clamp-2 break-words">Category</span>
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
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-left align-middle leading-tight">
                    <span className="line-clamp-2 break-words">Location</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-left align-middle leading-tight">
                    <span className="line-clamp-2 break-words">Custodian</span>
                  </th>
                  <th className="min-w-0 overflow-hidden px-2 py-2.5 text-center align-middle" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gs-border)]">
                {items.map((r) => {
                  const amt = lineAmount(r, customInventoryTypes);
                  const specText = formatSpecCell(r, customInventoryTypes);
                  return (
                    <tr key={r.id} className="hover:bg-[var(--gs-hover)]/80">
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle font-mono text-[var(--gs-text)]">
                        {r.itemNo}
                      </td>
                      <td className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle text-[var(--gs-muted)]">
                        {r.date}
                      </td>
                      <td
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle font-medium text-[var(--gs-text)]"
                        title={r.itemName}
                      >
                        {r.itemName}
                      </td>
                      <td
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle text-[var(--gs-muted)]"
                        title={r.category}
                      >
                        {r.category}
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
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle text-[var(--gs-muted)]"
                        title={r.location}
                      >
                        {r.location}
                      </td>
                      <td
                        className="min-w-0 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-2.5 align-middle text-[var(--gs-muted)]"
                        title={r.custodian}
                      >
                        {r.custodian}
                      </td>
                      <td className="min-w-0 max-w-0 px-2 py-2.5 text-center align-middle">
                        <div className="flex min-w-0 justify-center overflow-hidden">
                          <ItemRowActionMenu onEdit={() => openEditItemModal(r)} onDelete={() => deleteItem(r.id)} />
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
                  <tbody className="divide-y divide-[var(--gs-border)]">
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

              {splitLiveError || splitError ? (
                <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">
                  {splitLiveError ?? splitError}
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
                onClick={submitSplitParcel}
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
              >
                Split
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
            className="max-h-[min(92vh,44rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
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
              Configure which fields appear on <strong className="text-[var(--gs-text)]">New item</strong>, optional Rough/Cut-style attributes, and extra custom columns. Built-in Rough/Cut types are unchanged.
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
                      onClick={() => setAddTypeDraft((d) => ({ ...d, specMode: id }))}
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
                  Rough/Cut mirror the built-in controls. Custom fields uses the attribute list below (at least one required).
                </p>
              </div>
              <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/60 p-4">
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
              <div>
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
              {addTypeDraft.specMode === "builder" ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Custom attribute fields</p>
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
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-3 py-3 text-sm text-[var(--gs-muted)]">
                  Attribute fields follow <strong className="text-[var(--gs-text)]">Rough</strong> or <strong className="text-[var(--gs-text)]">Cut</strong> layouts. Choose{" "}
                  <strong>Custom fields</strong> to add named columns (text, number, dropdown).
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
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
                onClick={() => {
                  const label = addTypeDraft.label.trim();
                  if (!label) {
                    window.alert("Enter a type name.");
                    return;
                  }
                  if (addTypeDraft.uomTab === "custom" && !addTypeDraft.customUom.trim()) {
                    window.alert("Enter a custom UOM label.");
                    return;
                  }
                  const mergedStd = mergeStandardFields(addTypeDraft.standardFields);
                  if (addTypeDraft.specMode !== "builder") {
                    if (!Object.values(mergedStd).some((r) => r.enabled)) {
                      window.alert("Enable at least one standard field, or switch to Custom fields.");
                      return;
                    }
                  }
                  const cleaned: CustomFieldDef[] =
                    addTypeDraft.specMode === "builder"
                      ? addTypeDraft.builderFields.map((f) => ({
                          id: f.id,
                          label: f.label.trim(),
                          kind: f.kind,
                          options: f.kind === "dropdown" ? (f.options ?? []).filter(Boolean) : undefined,
                          required: f.required !== false,
                          visible: f.visible !== false,
                        }))
                      : [];
                  if (addTypeDraft.specMode === "builder") {
                    if (cleaned.length < 1) {
                      window.alert("Add at least one custom attribute field.");
                      return;
                    }
                    for (const f of cleaned) {
                      if (!f.label) {
                        window.alert("Each field needs a label.");
                        return;
                      }
                      if (f.kind === "dropdown" && (!f.options || f.options.length < 1)) {
                        window.alert(`Add at least one option for dropdown "${f.label || "field"}".`);
                        return;
                      }
                    }
                  }
                  const id = editingInventoryTypeId ?? `ctype-${Date.now()}`;
                  const fieldPreset =
                    addTypeDraft.specMode === "rough"
                      ? KIND_ROUGH
                      : addTypeDraft.specMode === "cut"
                        ? KIND_CUT
                        : undefined;
                  const nextType: CustomInventoryType = {
                    id,
                    label,
                    uomTab: addTypeDraft.uomTab,
                    customUomLabel: addTypeDraft.uomTab === "custom" ? addTypeDraft.customUom.trim() : undefined,
                    fieldPreset,
                    builderFields: cleaned,
                    standardFields: mergedStd,
                  };
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
                  <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Update fields below  demo only until API is wired.</p>
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
                {newItemQrDataUrl ? (
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
                    className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
                  >
                    {editingItemId ? "Save changes" : "Save item"}
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
              {stdRule("category").enabled ? (
                <div>
                  <SearchableFieldPicker
                    id="ni-cat"
                    label={`Category${stdRule("category").required ? " *" : ""}`}
                    value={itemForm.category}
                    onChange={(v) => setItemForm((s) => ({ ...s, category: v }))}
                    options={categoryOptionsMerged}
                    placeholder="Search categories..."
                    emptyLabel="Select category…"
                    canManageOption={canManageCategoryOption}
                    onRenameOption={renameCategoryOption}
                    onDeleteOption={deleteCategoryOption}
                  />
                  <button
                    type="button"
                    onClick={addCustomCategory}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 px-3 py-2 text-xs font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    Add new category
                  </button>
                </div>
              ) : null}
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
                      {newItemQrDataUrl ? (
                        <div className="mt-4 border-t border-[var(--gs-border)] pt-4" aria-live="polite">
                          <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">QR Code</p>
                          <p className="mt-1 text-[11px] text-[var(--gs-muted)]">
                            Item saved  placeholder image until your API returns a real QR.
                          </p>
                          <div className="mt-3 inline-flex rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/90 p-2.5 shadow-sm">
                            <img
                              src={newItemQrDataUrl}
                              alt=""
                              width={112}
                              height={112}
                              className="h-28 w-28 object-contain"
                            />
                          </div>
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={downloadNewItemQr}
                              className="rounded-full border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)]"
                            >
                              Download QR Code
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
                            onClick={addCustomLocation}
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
                            onClick={addCustomCustodian}
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
            { title: "Stock transfer", desc: "Move between locations", href: "/inventory?tab=stock" },
            { title: "Stock adjustment", desc: "Shrinkage / recount", href: "/inventory?tab=stock" },
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
            <h2 className="text-lg font-bold text-[var(--gs-text)]">Inventory reports</h2>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">
              Live aggregates from your current stock lines (same data as Stock / Services → Stock items).
            </p>
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
                      <tbody className="divide-y divide-[var(--gs-border)]">
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
                    <tbody className="divide-y divide-[var(--gs-border)]">
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
                  <tbody className="divide-y divide-[var(--gs-border)]">
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
                                      Stock lines  {name}
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
                                        <tbody className="divide-y divide-[var(--gs-border)]">
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
              </div>
            ) : null}
            {reportSubTab === "typewise" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Lines</th>
                      <th className="px-3 py-2 text-right">UOM qty</th>
                      <th className="px-3 py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gs-border)]">
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
                disabled={auditFilteredStockRows.length === 0}
                onSaveNow={() => commitAudit("now")}
                onSaveAndClose={() => commitAudit("close")}
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
              <tbody className="divide-y divide-[var(--gs-border)]">
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
          {auditRecords.length > 0 ? (
            <div className="border-t border-[var(--gs-border)] p-6">
              <h3 className="text-sm font-bold text-[var(--gs-text)]">Saved audit records</h3>
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
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

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
            className="my-8 w-full max-w-2xl rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="view-types-title" className="text-lg font-bold text-[var(--gs-text)]">
                  Type reference
                </h2>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">Built-in and custom inventory item types and their configurations (UOM, fields, structure).</p>
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
            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Built-in</h3>
                <ul className="mt-2 space-y-3">
                  <li className="rounded-xl border border-[var(--gs-border)] p-4">
                    <p className="font-semibold text-[var(--gs-text)]">Rough</p>
                    <p className="mt-1 text-sm text-[var(--gs-muted)]">
                      Structure: grade (fixed list), UOM quantity, pieces, rate, amount (UOM × rate), category, location, custodian, details. The Rough grade control is not modified by custom types.
                    </p>
                  </li>
                  <li className="rounded-xl border border-[var(--gs-border)] p-4">
                    <p className="font-semibold text-[var(--gs-text)]">Cut</p>
                    <p className="mt-1 text-sm text-[var(--gs-muted)]">
                      Structure: length, width, height/thickness, UOM quantity, pieces, rate, amount, plus common fields.
                    </p>
                  </li>
                </ul>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Other types</h3>
                {customInventoryTypes.length > 0 ? (
                  <ul className="mt-2 space-y-3">
                    {customInventoryTypes.map((t) => (
                      <li key={t.id} className="rounded-xl border border-[var(--gs-border)] p-4">
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
                              onClick={() => deleteInventoryType(t.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--gs-border)] px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-[var(--gs-muted)]">
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
                          <ul className="mt-2 list-inside list-disc text-sm text-[var(--gs-muted)]">
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