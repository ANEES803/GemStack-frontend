"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppDialog } from "@/components/ui/AppDialog";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { formatMoney } from "@/lib/format";
import {
  createGlAccount,
  createJournalEntry,
  createJournalReversalDraft,
  deleteGlAccount,
  deleteJournalEntry,
  getGlSettings,
  getJournalEntry,
  listGlAccounts,
  listJournalEntries,
  listPostableGlAccounts,
  patchGlSettings,
  postJournalEntry,
  restoreJournalEntry,
  updateJournalEntry,
  updateGlAccount,
  type GlAccountDto,
  type GlSettingsDto,
  type JournalDetailDto,
  type JournalSummaryDto,
} from "@/lib/glApi";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

type TabId = "coa" | "gl_posting" | "opening" | "journal_list" | "banking";

/** Doc: Accounting → Setup (COA, GL defaults, opening) · Transactions (journals, banking). */
const TABS: { id: TabId; label: string; group: "setup" | "transactions" }[] = [
  { id: "coa", label: "Chart of accounts", group: "setup" },
  { id: "gl_posting", label: "GL posting defaults", group: "setup" },
  { id: "opening", label: "Opening balances", group: "setup" },
  { id: "journal_list", label: "Journal entries", group: "transactions" },
  { id: "banking", label: "Banking", group: "transactions" },
];

const COA_TYPE_ORDER: AccountType[] = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

/** Group (structural) rows: row tint + encircled name — full strings for Tailwind JIT. */
const COA_GROUP_ROW: Record<AccountType, string> = {
  Asset:
    "!bg-sky-500/14 shadow-[inset_4px_0_0_0] shadow-sky-500 hover:!bg-sky-500/22 dark:!bg-sky-400/18 dark:shadow-sky-400 dark:hover:!bg-sky-400/26",
  Liability:
    "!bg-amber-500/14 shadow-[inset_4px_0_0_0] shadow-amber-500 hover:!bg-amber-500/22 dark:!bg-amber-400/18 dark:shadow-amber-400 dark:hover:!bg-amber-400/26",
  Equity:
    "!bg-violet-500/14 shadow-[inset_4px_0_0_0] shadow-violet-500 hover:!bg-violet-500/22 dark:!bg-violet-400/18 dark:shadow-violet-400 dark:hover:!bg-violet-400/26",
  Revenue:
    "!bg-emerald-500/14 shadow-[inset_4px_0_0_0] shadow-emerald-500 hover:!bg-emerald-500/22 dark:!bg-emerald-400/18 dark:shadow-emerald-400 dark:hover:!bg-emerald-400/26",
  Expense:
    "!bg-rose-500/14 shadow-[inset_4px_0_0_0] shadow-rose-500 hover:!bg-rose-500/22 dark:!bg-rose-400/18 dark:shadow-rose-400 dark:hover:!bg-rose-400/26",
};

const COA_GROUP_NAME_PILL: Record<AccountType, string> = {
  Asset:
    "rounded-full bg-sky-500/35 px-3 py-1 text-sm font-semibold text-sky-950 ring-2 ring-sky-600/50 dark:bg-sky-400/25 dark:text-sky-50 dark:ring-sky-300/45",
  Liability:
    "rounded-full bg-amber-500/35 px-3 py-1 text-sm font-semibold text-amber-950 ring-2 ring-amber-600/50 dark:bg-amber-400/25 dark:text-amber-50 dark:ring-amber-300/45",
  Equity:
    "rounded-full bg-violet-500/35 px-3 py-1 text-sm font-semibold text-violet-950 ring-2 ring-violet-600/50 dark:bg-violet-400/25 dark:text-violet-50 dark:ring-violet-300/45",
  Revenue:
    "rounded-full bg-emerald-500/35 px-3 py-1 text-sm font-semibold text-emerald-950 ring-2 ring-emerald-600/50 dark:bg-emerald-400/25 dark:text-emerald-50 dark:ring-emerald-300/45",
  Expense:
    "rounded-full bg-rose-500/35 px-3 py-1 text-sm font-semibold text-rose-950 ring-2 ring-rose-600/50 dark:bg-rose-400/25 dark:text-rose-50 dark:ring-rose-300/45",
};

type CoaRibbonChip = { type: AccountType | "All"; label: string; ring: string; bg: string; activeBg: string };

/** Keep in sync with GemStack-Backend `gl_service._MAX_DEPTH`. */
const COA_MAX_HIERARCHY_DEPTH = 8;

const COA_EXPANDED_STORAGE_KEY = "gemstack-coa-expanded-ids";

const COA_CATEGORY_RIBBON: CoaRibbonChip[] = [
  { type: "All", label: "All", ring: "ring-zinc-400/40", bg: "bg-[var(--gs-hover)]", activeBg: "bg-[var(--gs-navy)] text-white dark:bg-zinc-100 dark:text-zinc-900" },
  { type: "Asset", label: "Assets", ring: "ring-sky-500/50", bg: "bg-sky-500/10 dark:bg-sky-950/50", activeBg: "bg-sky-600 text-white dark:bg-sky-500" },
  { type: "Liability", label: "Liabilities", ring: "ring-amber-500/50", bg: "bg-amber-500/10 dark:bg-amber-950/40", activeBg: "bg-amber-600 text-white dark:bg-amber-500" },
  { type: "Equity", label: "Equity", ring: "ring-violet-500/50", bg: "bg-violet-500/10 dark:bg-violet-950/40", activeBg: "bg-violet-600 text-white dark:bg-violet-500" },
  { type: "Revenue", label: "Revenue", ring: "ring-emerald-500/50", bg: "bg-emerald-500/10 dark:bg-emerald-950/40", activeBg: "bg-emerald-600 text-white dark:bg-emerald-500" },
  { type: "Expense", label: "Expenses", ring: "ring-rose-500/50", bg: "bg-rose-500/10 dark:bg-rose-950/40", activeBg: "bg-rose-600 text-white dark:bg-rose-500" },
];

type CoaRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  balance: number;
  status: "Active" | "Inactive";
  isGroup: boolean;
  allowPosting: boolean;
  accountSubtype: string | null;
};

function mapDtoToCoaRow(a: GlAccountDto): CoaRow {
  const raw = (a.account_type || "asset").trim().toLowerCase();
  const t: AccountType =
    raw === "liability"
      ? "Liability"
      : raw === "equity"
        ? "Equity"
        : raw === "revenue"
          ? "Revenue"
          : raw === "expense"
            ? "Expense"
            : "Asset";
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    type: t,
    parentId: a.parent_id,
    balance: Number.parseFloat(a.balance) || 0,
    status: a.is_active ? "Active" : "Inactive",
    isGroup: a.is_group,
    allowPosting: a.allow_posting,
    accountSubtype: a.account_subtype,
  };
}

function parentLabel(rows: CoaRow[], parentId: string | null): string {
  if (!parentId) return "";
  const p = rows.find((r) => r.id === parentId);
  return p ? `${p.code}  ${p.name}` : "";
}

function parentBreadcrumb(rows: CoaRow[], parentId: string | null): string {
  const parts: string[] = [];
  let walk: string | null = parentId;
  const guard = new Set<string>();
  while (walk) {
    if (guard.has(walk)) break;
    guard.add(walk);
    const p = rows.find((r) => r.id === walk);
    if (!p) break;
    parts.unshift(`${p.code} ${p.name}`);
    walk = p.parentId;
  }
  return parts.join(" → ");
}

function coaChildrenByParent(rows: CoaRow[]): Map<string, CoaRow[]> {
  const m = new Map<string, CoaRow[]>();
  for (const r of rows) {
    const key = r.parentId ?? "";
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(r);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.code.localeCompare(b.code));
  return m;
}

function coaRootsForSection(rows: CoaRow[], sectionType: AccountType): CoaRow[] {
  const idSet = new Set(rows.map((r) => r.id));
  return rows
    .filter((r) => r.type === sectionType && (r.parentId === null || !idSet.has(r.parentId)))
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));
}

function coaFlattenVisible(
  roots: CoaRow[],
  childrenByParent: Map<string, CoaRow[]>,
  expanded: Set<string>,
): { row: CoaRow; treeDepth: number }[] {
  const out: { row: CoaRow; treeDepth: number }[] = [];
  function walk(node: CoaRow, depth: number) {
    out.push({ row: node, treeDepth: depth });
    if (!node.isGroup || !expanded.has(node.id)) return;
    for (const ch of childrenByParent.get(node.id) ?? []) walk(ch, depth + 1);
  }
  for (const r of roots) walk(r, 0);
  return out;
}

function coaAccountPathLabel(rows: CoaRow[], id: string): string {
  const chain: CoaRow[] = [];
  let walk: string | null = id;
  const guard = new Set<string>();
  while (walk) {
    if (guard.has(walk)) break;
    guard.add(walk);
    const p = rows.find((r) => r.id === walk);
    if (!p) break;
    chain.unshift(p);
    walk = p.parentId;
  }
  return chain.map((p) => `${p.code} ${p.name}`).join(" → ");
}

/** Group parents for `<select>`: indented tree when search is empty; flat path labels when filtering. */
function coaParentGroupDropdownOptions(
  rows: CoaRow[],
  type: AccountType,
  editingId: string | null,
  parentSearch: string,
): { id: string; label: string }[] {
  const groups = rows.filter((r) => r.isGroup && r.type === type && r.id !== editingId);
  const q = parentSearch.trim().toLowerCase();
  if (q) {
    return groups
      .filter((g) => `${g.code} ${g.name}`.toLowerCase().includes(q))
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((g) => ({ id: g.id, label: coaAccountPathLabel(rows, g.id) }));
  }
  const idSet = new Set(groups.map((g) => g.id));
  const cmap = new Map<string, CoaRow[]>();
  for (const g of groups) {
    const pk = g.parentId ?? "";
    if (!cmap.has(pk)) cmap.set(pk, []);
    cmap.get(pk)!.push(g);
  }
  for (const arr of cmap.values()) arr.sort((a, b) => a.code.localeCompare(b.code));
  const roots = groups
    .filter((g) => g.parentId === null || !idSet.has(g.parentId))
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));
  const out: { id: string; label: string }[] = [];
  function walk(g: CoaRow, depth: number) {
    const pad = "\u00a0\u00a0".repeat(depth);
    out.push({ id: g.id, label: `${pad}${g.code} — ${g.name}` });
    for (const ch of cmap.get(g.id) ?? []) walk(ch, depth + 1);
  }
  for (const r of roots) walk(r, 0);
  return out;
}

function formatCoaSaveError(message: string): string {
  if (/hierarchy too deep|too deep/i.test(message)) {
    return `${message} (Maximum ${COA_MAX_HIERARCHY_DEPTH} levels from the chart root to the parent you chose.)`;
  }
  return message;
}

function friendlyApiMessage(message: string): string {
  const m = message.trim();
  if (/session expired|not authenticated/i.test(m)) return "Your session ended. Please sign in again.";
  if (/invalid token/i.test(m)) return "Your session is no longer valid. Please sign in again.";
  return m;
}

function mapJournalSummaries(list: JournalSummaryDto[]) {
  return list.map((j) => ({
    id: j.id,
    date: j.entry_date,
    ref: j.reference,
    desc: j.memo || "—",
    amount: Number.parseFloat(j.total_debit) || 0,
    creditAmount: Number.parseFloat(j.total_credit) || 0,
    status: j.status,
    tag: (j.tag || "").trim(),
    sourceType: j.source_type,
    sourceId: j.source_id,
    vendorName: j.vendor_name,
    lotCode: j.lot_code,
    sourceKind: j.source_kind,
    sourceLabel: journalSourceLabel(j.source_kind, j.source_type, j.tag, j.vendor_name),
  }));
}

function journalSourceLabel(
  sourceKind: string | null,
  sourceType: string | null,
  tag: string,
  vendorName?: string | null,
): string {
  const v = (vendorName || "").trim();
  if (sourceKind === "purchase_receipt") return v ? `Purchase receipt · ${v}` : "Purchase receipt";
  if (sourceKind === "vendor_payment") return v ? `Vendor payment · ${v}` : "Vendor payment";
  const t = (sourceType || "").toLowerCase();
  if (t === "purchase_lot_receipt") return v ? `Purchase receipt · ${v}` : "Lot receipt";
  if (t === "lot_payment") return v ? `Vendor payment · ${v}` : "Lot payment";
  if (t === "manual" || !t) return tag ? tag : "Manual / other";
  return sourceType || tag || "—";
}

const VALID_TABS = new Set<TabId>(TABS.map((t) => t.id));

export function AccountingWorkspace() {
  const todayIso = useHydratedTodayIso();
  const { pushToast: appToast, confirm } = useAppNotifications();
  const pushToast = useCallback(
    (message: string, variant: "success" | "error" | "info" = "info") => {
      appToast(variant === "error" ? friendlyApiMessage(message) : message, variant);
    },
    [appToast],
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("coa");
  const [journalEditorOpen, setJournalEditorOpen] = useState(false);
  const [functionalCurrency, setFunctionalCurrency] = useState("USD");
  const [coaRows, setCoaRows] = useState<CoaRow[]>([]);
  const [coaLoading, setCoaLoading] = useState(false);
  const [coaError, setCoaError] = useState<string | null>(null);
  const [coaModal, setCoaModal] = useState<"add" | { edit: CoaRow } | null>(null);
  const [coaSaving, setCoaSaving] = useState(false);
  const [coaDetailModal, setCoaDetailModal] = useState<CoaRow | null>(null);
  const [coaDetailTab, setCoaDetailTab] = useState<"overview" | "transactions">("overview");
  const [coaExpandedIds, setCoaExpandedIds] = useState<Set<string>>(() => new Set());
  const coaExpandInitRef = useRef(false);
  const [coaParentSearch, setCoaParentSearch] = useState("");
  const [coaSearch, setCoaSearch] = useState("");
  const [coaTypeFilter, setCoaTypeFilter] = useState<AccountType | "All">("All");
  const [coaStatusFilter, setCoaStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [coaForm, setCoaForm] = useState({
    code: "",
    name: "",
    type: "Asset" as AccountType,
    parentId: "none" as string | "none",
    isGroup: false,
    allowTransactions: true,
    status: "Active" as "Active" | "Inactive",
    accountSubtype: "",
    openingBalance: "",
    openingBalanceOffsetId: "none" as string | "none",
    openingBalanceEntryDate: "",
  });

  const [openingSub, setOpeningSub] = useState<null | "trial" | "customer" | "vendor" | "inventory">(null);

  const [jeDate, setJeDate] = useState("");
  const [jeRef, setJeRef] = useState("");
  const [jeMemo, setJeMemo] = useState("");
  const [jeSaving, setJeSaving] = useState(false);
  const [jeError, setJeError] = useState<string | null>(null);
  const [jeAccountsError, setJeAccountsError] = useState<string | null>(null);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [postableAccounts, setPostableAccounts] = useState<GlAccountDto[]>([]);
  const [journalDeleteBusyId, setJournalDeleteBusyId] = useState<string | null>(null);
  const [journalShowDeleted, setJournalShowDeleted] = useState(false);
  const [jeLines, setJeLines] = useState<{ id: string; accountId: string; lineDesc: string; debit: number; credit: number }[]>([
    { id: "j1", accountId: "", lineDesc: "", debit: 0, credit: 0 },
    { id: "j2", accountId: "", lineDesc: "", debit: 0, credit: 0 },
  ]);
  const [journalRows, setJournalRows] = useState<
    {
      id: string;
      date: string;
      ref: string;
      desc: string;
      amount: number;
      creditAmount: number;
      status: string;
      tag: string;
      sourceType: string | null;
      sourceId: string | null;
      vendorName: string | null | undefined;
      lotCode: string | null | undefined;
      sourceKind: string | null | undefined;
      sourceLabel: string;
    }[]
  >([]);
  const [journalsLoading, setJournalsLoading] = useState(false);
  const [journalViewerOpen, setJournalViewerOpen] = useState(false);
  const [journalViewerLoading, setJournalViewerLoading] = useState(false);
  const [journalViewerError, setJournalViewerError] = useState<string | null>(null);
  const [journalViewerDetail, setJournalViewerDetail] = useState<JournalDetailDto | null>(null);
  const [journalReversalBusy, setJournalReversalBusy] = useState(false);

  const [glPostingSettings, setGlPostingSettings] = useState<GlSettingsDto | null>(null);
  const [glPostingAccounts, setGlPostingAccounts] = useState<GlAccountDto[]>([]);
  const [glPostingLoad, setGlPostingLoad] = useState(false);
  const [glPostingSave, setGlPostingSave] = useState(false);
  const [glPostingSaveFlash, setGlPostingSaveFlash] = useState<string | null>(null);
  const [glPostingErr, setGlPostingErr] = useState<string | null>(null);

  const [bankCards] = useState([
    { id: "b1", bank: "HBL", last4: "9012", balance: 125000, recon: "2026-03-15" },
    { id: "b2", bank: "Meezan", last4: "4421", balance: 48200, recon: "2026-03-10" },
  ]);

  const [bankDetailId, setBankDetailId] = useState<string | null>(null);
  const [bankDetailTab, setBankDetailTab] = useState<"transactions" | "reconciliation" | "details">("transactions");
  const [bankAddOpen, setBankAddOpen] = useState(false);
  const [bankImportOpen, setBankImportOpen] = useState(false);
  const [bankTransferOpen, setBankTransferOpen] = useState(false);
  const [reconOpen, setReconOpen] = useState(false);

  const [openingStatus] = useState<"In Progress" | "Not Started" | "Completed">("In Progress");
  const openingCards = [
    { key: "trial" as const, title: "Opening trial balance", status: "Pending" as const, updated: "" },
    { key: "customer" as const, title: "Customer opening", status: "Done" as const, updated: "2026-03-01" },
    { key: "vendor" as const, title: "Vendor opening", status: "Pending" as const, updated: "" },
    { key: "inventory" as const, title: "Inventory opening", status: "Pending" as const, updated: "" },
  ];

  useEffect(() => {
    if (!todayIso) return;
    setJeDate((p) => p || todayIso);
  }, [todayIso]);

  async function refreshCoa(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!silent) {
      setCoaLoading(true);
      setCoaError(null);
    }
    try {
      const iso = todayIso || new Date().toISOString().slice(0, 10);
      const rows = await listGlAccounts(iso);
      setCoaRows(rows.map(mapDtoToCoaRow));
      if (!silent) setCoaError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load chart of accounts";
      if (silent) pushToast(msg, "error");
      else setCoaError(msg);
    } finally {
      if (!silent) setCoaLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "coa") return;
    void refreshCoa();
  }, [tab, todayIso, pushToast]);

  const toggleCoaExpanded = useCallback((id: string) => {
    setCoaExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        sessionStorage.setItem(COA_EXPANDED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (coaRows.length === 0 || coaExpandInitRef.current) return;
    try {
      const raw = sessionStorage.getItem(COA_EXPANDED_STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        setCoaExpandedIds(new Set(ids));
        coaExpandInitRef.current = true;
        return;
      }
    } catch {
      /* ignore */
    }
    setCoaExpandedIds(new Set(coaRows.filter((r) => r.isGroup).map((r) => r.id)));
    coaExpandInitRef.current = true;
  }, [coaRows]);

  useEffect(() => {
    if (tab !== "journal_list") return;
    let cancelled = false;
    (async () => {
      setJournalsLoading(true);
      try {
        const list = await listJournalEntries(journalShowDeleted ? "deleted" : undefined);
        if (cancelled) return;
        setJournalRows(mapJournalSummaries(list));
      } catch (e) {
        if (!cancelled) {
          setJournalRows([]);
          pushToast(e instanceof Error ? e.message : "Could not load journal entries.", "error");
        }
      } finally {
        if (!cancelled) setJournalsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, journalEditorOpen, pushToast, journalShowDeleted]);

  useEffect(() => {
    if (!journalEditorOpen) return;
    const ac = new AbortController();
    let cancelled = false;
    setJeAccountsError(null);
    (async () => {
      try {
        const p = await listPostableGlAccounts(ac.signal);
        if (cancelled) return;
        setPostableAccounts(p);
        if (p.length === 0) {
          setJeAccountsError(
            "No posting accounts found. Add a detail account under a group with “Allow posting” turned on, or activate an existing posting account.",
          );
        }
      } catch (e) {
        if (cancelled) return;
        setPostableAccounts([]);
        if (e instanceof Error && e.name === "AbortError") return;
        setJeAccountsError(e instanceof Error ? friendlyApiMessage(e.message) : "Could not load accounts for journal lines.");
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [journalEditorOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getGlSettings();
        if (!cancelled) setFunctionalCurrency(s.functional_currency || "USD");
      } catch {
        if (!cancelled) setFunctionalCurrency("USD");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "gl_posting") return;
    let cancelled = false;
    (async () => {
      setGlPostingLoad(true);
      setGlPostingErr(null);
      try {
        const [s, acc] = await Promise.all([getGlSettings(), listPostableGlAccounts()]);
        if (!cancelled) {
          setGlPostingSettings({
            ...s,
            auto_post_sales_invoices: s.auto_post_sales_invoices ?? true,
            account_ar_id: s.account_ar_id ?? null,
            account_sales_revenue_id: s.account_sales_revenue_id ?? null,
            account_cogs_id: s.account_cogs_id ?? null,
          });
          setGlPostingAccounts(acc);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Could not load GL settings";
          setGlPostingErr(msg);
          pushToast(msg, "error");
        }
      } finally {
        if (!cancelled) setGlPostingLoad(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, pushToast]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && VALID_TABS.has(t as TabId)) {
      setTab(t as TabId);
    }
  }, [searchParams]);

  function pushTab(next: TabId) {
    setTab(next);
    router.replace(`/accounting?tab=${next}`, { scroll: false });
  }

  useEffect(() => {
    if (!searchParams.get("tab")) {
      router.replace("/accounting?tab=coa", { scroll: false });
    }
  }, [router, searchParams]);

  const coaSorted = useMemo(() => {
    const list = [...coaRows];
    list.sort((a, b) => a.code.localeCompare(b.code));
    return list;
  }, [coaRows]);

  const coaFiltered = useMemo(() => {
    const q = coaSearch.trim().toLowerCase();
    return coaSorted.filter((row) => {
      if (coaTypeFilter !== "All" && row.type !== coaTypeFilter) return false;
      if (coaStatusFilter !== "All" && row.status !== coaStatusFilter) return false;
      if (q && !`${row.code} ${row.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [coaSorted, coaSearch, coaTypeFilter, coaStatusFilter]);

  const coaCountsByType = useMemo(() => {
    const q = coaSearch.trim().toLowerCase();
    const counts: Record<AccountType, number> = {
      Asset: 0,
      Liability: 0,
      Equity: 0,
      Revenue: 0,
      Expense: 0,
    };
    for (const row of coaSorted) {
      if (coaStatusFilter !== "All" && row.status !== coaStatusFilter) continue;
      if (q && !`${row.code} ${row.name}`.toLowerCase().includes(q)) continue;
      counts[row.type] += 1;
    }
    return counts;
  }, [coaSorted, coaSearch, coaStatusFilter]);

  const coaChildrenByParentFiltered = useMemo(() => coaChildrenByParent(coaFiltered), [coaFiltered]);

  const coaGroupedSections = useMemo(() => {
    const types: readonly AccountType[] = coaTypeFilter === "All" ? COA_TYPE_ORDER : [coaTypeFilter];
    return types
      .map((type) => {
        const roots = coaRootsForSection(coaFiltered, type);
        const items = coaFlattenVisible(roots, coaChildrenByParentFiltered, coaExpandedIds);
        return { type, items };
      })
      .filter((s) => s.items.length > 0);
  }, [coaFiltered, coaTypeFilter, coaExpandedIds, coaChildrenByParentFiltered]);

  const jeBalanced = useMemo(() => {
    const d = jeLines.reduce((s, l) => s + l.debit, 0);
    const c = jeLines.reduce((s, l) => s + l.credit, 0);
    return { debit: d, credit: c, ok: Math.abs(d - c) < 0.005 };
  }, [jeLines]);

  const editingAccountId = coaModal && typeof coaModal === "object" ? coaModal.edit.id : null;
  const coaHasParentGroupsForType = useMemo(
    () => coaRows.some((r) => r.isGroup && r.type === coaForm.type && r.id !== editingAccountId),
    [coaRows, coaForm.type, editingAccountId],
  );
  const coaParentDropdownOptions = useMemo(() => {
    const opts = coaParentGroupDropdownOptions(coaRows, coaForm.type, editingAccountId, coaParentSearch);
    if (coaForm.parentId !== "none" && !opts.some((o) => o.id === coaForm.parentId)) {
      const row = coaRows.find((r) => r.id === coaForm.parentId && r.isGroup);
      if (row) return [{ id: row.id, label: coaAccountPathLabel(coaRows, row.id) }, ...opts];
    }
    return opts;
  }, [coaRows, coaForm.type, editingAccountId, coaParentSearch, coaForm.parentId]);

  /** Posting accounts that can appear on the other side of an optional opening-balance journal. */
  const coaOpeningOffsetOptions = useMemo(
    () =>
      coaRows
        .filter((r) => r.status === "Active" && !r.isGroup && r.allowPosting)
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((r) => ({ id: r.id, label: `${r.code} — ${r.name}` })),
    [coaRows],
  );

  useEffect(() => {
    if (!coaModal) return;
    if (coaForm.parentId === "none") return;
    if (!coaParentDropdownOptions.some((o) => o.id === coaForm.parentId)) {
      setCoaForm((f) => ({ ...f, parentId: "none" }));
    }
  }, [coaModal, coaParentDropdownOptions, coaForm.parentId]);

  useEffect(() => {
    if (!coaModal) setCoaParentSearch("");
  }, [coaModal]);

  function openCoaAdd(opts?: { defaultParentId?: string }) {
    const suggest = `9${Date.now().toString().slice(-4)}`;
    let nextType: AccountType = "Asset";
    let parentId: string | "none" = "none";
    if (opts?.defaultParentId) {
      const p = coaRows.find((r) => r.id === opts.defaultParentId);
      if (p?.isGroup) {
        nextType = p.type;
        parentId = p.id;
      }
    }
    setCoaForm({
      code: suggest,
      name: "",
      type: nextType,
      parentId,
      isGroup: false,
      allowTransactions: true,
      status: "Active",
      accountSubtype: "",
      openingBalance: "",
      openingBalanceOffsetId: "none",
      openingBalanceEntryDate: todayIso || "",
    });
    setCoaParentSearch("");
    setCoaModal("add");
    if (opts?.defaultParentId) {
      setCoaExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(opts.defaultParentId!);
        let walk: string | null = opts.defaultParentId!;
        const guard = new Set<string>();
        while (walk) {
          if (guard.has(walk)) break;
          guard.add(walk);
          const p = coaRows.find((r) => r.id === walk);
          if (!p?.parentId) break;
          next.add(p.parentId);
          walk = p.parentId;
        }
        try {
          sessionStorage.setItem(COA_EXPANDED_STORAGE_KEY, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    }
  }

  function openCoaEdit(row: CoaRow) {
    setCoaForm({
      code: row.code,
      name: row.name,
      type: row.type,
      parentId: row.parentId ?? "none",
      isGroup: row.isGroup,
      allowTransactions: row.allowPosting,
      status: row.status,
      accountSubtype: row.accountSubtype ?? "",
      openingBalance: "",
      openingBalanceOffsetId: "none",
      openingBalanceEntryDate: todayIso || "",
    });
    setCoaParentSearch("");
    setCoaModal({ edit: row });
  }

  /** Subaccounts may only roll up under a group. Posting accounts must be converted to a group first. */
  async function handleAddSubaccount(row: CoaRow) {
    if (row.isGroup) {
      openCoaAdd({ defaultParentId: row.id });
      return;
    }
    const ok = await confirm({
      title: "Convert to group account?",
      message:
        `"${row.code} ${row.name}" is a posting account. Only a group (folder) can have subaccounts.\n\n` +
        `Convert this account to a group? You will not be able to post new journals directly to this code anymore—` +
        `use a child posting account instead. If GL posting defaults (e.g. inventory) still point to this account, update them after you add the child.`,
      confirmLabel: "Convert and continue",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await updateGlAccount(row.id, { is_group: true, allow_posting: false });
      await refreshCoa({ silent: true });
      pushToast("Account converted to a group. Add a posting subaccount under it.", "success");
      openCoaAdd({ defaultParentId: row.id });
    } catch (e) {
      pushToast(formatCoaSaveError(e instanceof Error ? e.message : "Could not convert account"), "error");
    }
  }

  async function saveCoa(andNew?: boolean) {
    if (!coaForm.code.trim() || !coaForm.name.trim()) return;
    const parentId = coaForm.parentId === "none" ? null : coaForm.parentId;
    const subtypeTrim = coaForm.accountSubtype.trim();
    const account_subtype = subtypeTrim ? subtypeTrim : null;

    let openingExtra: {
      opening_balance: number;
      opening_balance_offset_account_id: string;
      opening_balance_entry_date: string;
    } | null = null;
    if (coaModal === "add" && !coaForm.isGroup && coaForm.allowTransactions) {
      const rawOb = coaForm.openingBalance.trim().replace(/,/g, "");
      if (rawOb !== "") {
        const n = Number.parseFloat(rawOb);
        if (!Number.isFinite(n) || n < 0) {
          pushToast("Opening balance must be a valid zero or positive number.", "error");
          return;
        }
        if (n > 0) {
          if (coaForm.openingBalanceOffsetId === "none") {
            pushToast("Select an offset account for the opening balance, or leave the amount empty.", "error");
            return;
          }
          const entryDate = coaForm.openingBalanceEntryDate.trim();
          if (!entryDate) {
            pushToast("Choose an effective date for the opening balance.", "error");
            return;
          }
          openingExtra = {
            opening_balance: n,
            opening_balance_offset_account_id: coaForm.openingBalanceOffsetId,
            opening_balance_entry_date: entryDate,
          };
        }
      }
    }

    setCoaSaving(true);
    try {
      if (coaModal === "add") {
        await createGlAccount({
          code: coaForm.code.trim(),
          name: coaForm.name.trim(),
          account_type: coaForm.type,
          parent_id: parentId,
          is_group: coaForm.isGroup,
          allow_posting: coaForm.allowTransactions,
          is_active: coaForm.status === "Active",
          account_subtype,
          ...(openingExtra ? openingExtra : {}),
        });
      } else if (coaModal && typeof coaModal === "object") {
        await updateGlAccount(coaModal.edit.id, {
          name: coaForm.name.trim(),
          parent_id: parentId,
          is_group: coaForm.isGroup,
          allow_posting: coaForm.allowTransactions,
          is_active: coaForm.status === "Active",
          account_subtype,
        });
      }
      await refreshCoa({ silent: true });
      pushToast(
        coaModal === "add"
          ? openingExtra
            ? "Account created with posted opening balance."
            : "Account created."
          : "Account updated.",
        "success",
      );
      if (andNew) {
        openCoaAdd();
      } else {
        setCoaModal(null);
      }
    } catch (e) {
      pushToast(formatCoaSaveError(e instanceof Error ? e.message : "Save failed"), "error");
    } finally {
      setCoaSaving(false);
    }
  }

  async function deactivateCoa(row: CoaRow) {
    const ok = await confirm({
      title: "Deactivate account",
      message: `Deactivate account ${row.code}? It will be hidden from new postings.`,
      confirmLabel: "Deactivate",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await updateGlAccount(row.id, { is_active: false });
      await refreshCoa({ silent: true });
      pushToast("Account deactivated.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  async function activateCoa(row: CoaRow) {
    const ok = await confirm({
      title: "Activate account",
      message: `Activate account ${row.code}? It can be used on new journal lines again.`,
      confirmLabel: "Activate",
    });
    if (!ok) return;
    try {
      await updateGlAccount(row.id, { is_active: true });
      await refreshCoa({ silent: true });
      pushToast("Account activated.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }

  async function deleteCoa(row: CoaRow) {
    const ok = await confirm({
      title: "Delete account?",
      message: `Permanently delete account ${row.code} — ${row.name}?\n\nThis only works if the account has no balance, no journal lines, and no subaccounts.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteGlAccount(row.id);
      if (coaDetailModal?.id === row.id) setCoaDetailModal(null);
      await refreshCoa({ silent: true });
      pushToast("Account deleted.", "success");
    } catch (e) {
      pushToast(formatCoaSaveError(e instanceof Error ? e.message : "Delete failed"), "error");
    }
  }

  function addJeLine() {
    setJeLines((prev) => [...prev, { id: `j-${Date.now()}`, accountId: "", lineDesc: "", debit: 0, credit: 0 }]);
  }

  function updateJeLine(id: string, patch: Partial<(typeof jeLines)[0]>) {
    setJeLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeJeLine(id: string) {
    setJeLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.id !== id)));
  }

  const openNewJournal = useCallback(() => {
    setJeError(null);
    setJeAccountsError(null);
    setEditingJournalId(null);
    setJeRef(`JE-${Date.now().toString().slice(-8)}`);
    setJeMemo("");
    setJeLines([
      { id: `j-${Date.now()}-a`, accountId: "", lineDesc: "", debit: 0, credit: 0 },
      { id: `j-${Date.now()}-b`, accountId: "", lineDesc: "", debit: 0, credit: 0 },
    ]);
    setJournalEditorOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const t = searchParams.get("tab");
    if (t !== "journal_list") {
      router.replace("/accounting?tab=journal_list&new=1", { scroll: false });
      return;
    }
    openNewJournal();
    router.replace("/accounting?tab=journal_list", { scroll: false });
  }, [openNewJournal, router, searchParams]);

  async function openEditDraftJournal(journalId: string) {
    setJeError(null);
    setJeAccountsError(null);
    setJeSaving(true);
    try {
      const d = await getJournalEntry(journalId);
      if (d.status === "deleted") {
        pushToast("Restore this journal first, then edit it.", "info");
        return;
      }
      setEditingJournalId(d.id);
      setJeDate(d.entry_date);
      setJeRef(d.reference || "");
      setJeMemo(d.memo || "");
      const nextLines = d.lines.map((ln, idx) => ({
        id: `edit-${d.id}-${idx}`,
        accountId: ln.account_id,
        lineDesc: ln.description || "",
        debit: Number.parseFloat(String(ln.debit)) || 0,
        credit: Number.parseFloat(String(ln.credit)) || 0,
      }));
      setJeLines(
        nextLines.length >= 2
          ? nextLines
          : [
              ...nextLines,
              { id: `edit-${d.id}-x`, accountId: "", lineDesc: "", debit: 0, credit: 0 },
              { id: `edit-${d.id}-y`, accountId: "", lineDesc: "", debit: 0, credit: 0 },
            ].slice(0, 2),
      );
      setJournalEditorOpen(true);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not load journal for editing", "error");
    } finally {
      setJeSaving(false);
    }
  }

  async function saveJournalDraft() {
    setJeError(null);
    if (!jeRef.trim() || !jeDate) {
      setJeError("Date and reference are required.");
      return;
    }
    const lines = jeLines
      .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
      .map((l) => ({
        account_id: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.lineDesc,
      }));
    if (lines.length < 2) {
      setJeError("Add at least two lines with an account and an amount.");
      return;
    }
    setJeSaving(true);
    try {
      const payload = {
        entry_date: jeDate,
        reference: jeRef.trim(),
        memo: jeMemo,
        tag: "",
        lines,
      };
      if (editingJournalId) {
        await updateJournalEntry(editingJournalId, payload);
      } else {
        await createJournalEntry(payload);
      }
      const list = await listJournalEntries(journalShowDeleted ? "deleted" : undefined);
      setJournalRows(mapJournalSummaries(list));
      setJournalEditorOpen(false);
      setEditingJournalId(null);
      pushToast(editingJournalId ? "Journal updated." : "Journal saved as draft.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save journal";
      setJeError(msg);
      pushToast(msg, "error");
    } finally {
      setJeSaving(false);
    }
  }

  async function saveAndPostJournal() {
    setJeError(null);
    if (!jeBalanced.ok) {
      setJeError("Debits and credits must match before posting.");
      return;
    }
    if (!jeRef.trim() || !jeDate) {
      setJeError("Date and reference are required.");
      return;
    }
    const lines = jeLines
      .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
      .map((l) => ({
        account_id: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.lineDesc,
      }));
    if (lines.length < 2) {
      setJeError("Add at least two lines with an account and an amount.");
      return;
    }
    setJeSaving(true);
    try {
      const payload = {
        entry_date: jeDate,
        reference: jeRef.trim(),
        memo: jeMemo,
        tag: "",
        lines,
      };
      const targetId = editingJournalId
        ? (await updateJournalEntry(editingJournalId, payload)).id
        : (await createJournalEntry(payload)).id;
      await postJournalEntry(targetId);
      const list = await listJournalEntries(journalShowDeleted ? "deleted" : undefined);
      setJournalRows(mapJournalSummaries(list));
      setJournalEditorOpen(false);
      setEditingJournalId(null);
      pushToast("Journal posted.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not post journal";
      setJeError(msg);
      pushToast(msg, "error");
    } finally {
      setJeSaving(false);
    }
  }

  async function deleteDraftJournalRow(j: { id: string; ref: string }) {
    const ok = await confirm({
      title: "Delete journal?",
      message: `Soft-delete journal ${j.ref}? You can recover it later.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setJournalDeleteBusyId(j.id);
    try {
      await deleteJournalEntry(j.id);
      const list = await listJournalEntries(journalShowDeleted ? "deleted" : undefined);
      setJournalRows(mapJournalSummaries(list));
      pushToast("Journal deleted (soft).", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not delete journal", "error");
    } finally {
      setJournalDeleteBusyId(null);
    }
  }

  async function restoreDeletedJournalRow(j: { id: string; ref: string }) {
    setJournalDeleteBusyId(j.id);
    try {
      await restoreJournalEntry(j.id);
      const list = await listJournalEntries(journalShowDeleted ? "deleted" : undefined);
      setJournalRows(mapJournalSummaries(list));
      pushToast("Journal restored.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Could not restore journal", "error");
    } finally {
      setJournalDeleteBusyId(null);
    }
  }

  async function openJournalViewer(journalId: string) {
    setJournalViewerOpen(true);
    setJournalViewerLoading(true);
    setJournalViewerError(null);
    setJournalViewerDetail(null);
    try {
      const d = await getJournalEntry(journalId);
      setJournalViewerDetail(d);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load journal";
      setJournalViewerError(msg);
      pushToast(msg, "error");
    } finally {
      setJournalViewerLoading(false);
    }
  }

  async function saveGlPostingSettings() {
    if (!glPostingSettings) return;
    setGlPostingSave(true);
    setGlPostingErr(null);
    try {
      const fc = (glPostingSettings.functional_currency || "USD").trim().toUpperCase().slice(0, 3);
      const updated = await patchGlSettings({
        functional_currency: fc || "USD",
        account_inventory_id: glPostingSettings.account_inventory_id,
        account_purchases_id: glPostingSettings.account_purchases_id,
        account_ap_id: glPostingSettings.account_ap_id,
        account_default_bank_id: glPostingSettings.account_default_bank_id,
        account_ar_id: glPostingSettings.account_ar_id,
        account_sales_revenue_id: glPostingSettings.account_sales_revenue_id,
        account_cogs_id: glPostingSettings.account_cogs_id,
        purchase_receipt_mode: glPostingSettings.purchase_receipt_mode,
        auto_post_purchase_lots: glPostingSettings.auto_post_purchase_lots,
        auto_post_sales_invoices: glPostingSettings.auto_post_sales_invoices,
      });
      setGlPostingSettings(updated);
      setFunctionalCurrency(updated.functional_currency || "USD");
      setGlPostingSaveFlash("Saved");
      window.setTimeout(() => setGlPostingSaveFlash(null), 2500);
      pushToast("GL posting settings saved.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save GL settings";
      setGlPostingErr(msg);
      pushToast(msg, "error");
    } finally {
      setGlPostingSave(false);
    }
  }

  async function createReversalFromViewer() {
    if (!journalViewerDetail || journalViewerDetail.status !== "posted") return;
    setJournalReversalBusy(true);
    setJournalViewerError(null);
    try {
      await createJournalReversalDraft(journalViewerDetail.id);
      const list = await listJournalEntries(journalShowDeleted ? "deleted" : undefined);
      setJournalRows(mapJournalSummaries(list));
      setJournalViewerOpen(false);
      setJournalViewerDetail(null);
      pushToast("Reversal draft created. Open Journal entries to review and post it.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create reversal draft";
      setJournalViewerError(msg);
      pushToast(msg, "error");
    } finally {
      setJournalReversalBusy(false);
    }
  }

  const selectedBank = bankCards.find((b) => b.id === bankDetailId) ?? null;

  const coaRibbonTotal = COA_TYPE_ORDER.reduce((sum, t) => sum + coaCountsByType[t], 0);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-5 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4 shadow-sm sm:flex-row sm:items-stretch sm:gap-0 sm:p-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:pr-6">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[var(--gs-pill-active-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gs-pill-active-text)] ring-1 ring-[var(--gs-border)]">
              Setup
            </span>
          </div>
          <p className="text-xs leading-snug text-[var(--gs-muted)]">Chart of accounts, GL posting defaults for purchases, and opening balances.</p>
          <div className="flex flex-wrap gap-2">
            {TABS.filter((t) => t.group === "setup").map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pushTab(t.id)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  tab === t.id ? "bg-[var(--gs-accent)] text-white shadow-sm" : "text-[var(--gs-text)] ring-1 ring-[var(--gs-border)] hover:bg-[var(--gs-hover)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden w-px shrink-0 bg-[var(--gs-border)] sm:block" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-2 border-t border-[var(--gs-border)] pt-5 sm:border-t-0 sm:pl-6 sm:pt-0">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[var(--gs-hover)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]">
              Transactions
            </span>
          </div>
          <p className="text-xs leading-snug text-[var(--gs-muted)]">Journal vouchers and bank-style activity (demo banking).</p>
          <div className="flex flex-wrap gap-2">
            {TABS.filter((t) => t.group === "transactions").map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pushTab(t.id)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  tab === t.id ? "bg-[var(--gs-accent)] text-white shadow-sm" : "text-[var(--gs-text)] ring-1 ring-[var(--gs-border)] hover:bg-[var(--gs-hover)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === "coa" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Chart of accounts</h2>
              <p className="mt-0.5 text-sm text-[var(--gs-muted)]">
                Balances are running totals from <strong>posted</strong> journals (as of today). Group rows are folders—click the row or arrow to expand
                subaccounts (your last expand state is remembered in this browser).
              </p>
              <p className="mt-2 text-xs text-[var(--gs-muted)]">
                Category chips filter counts; nesting cannot exceed <strong>{COA_MAX_HIERARCHY_DEPTH}</strong> levels from the chart root (including the parent you pick when saving). To add rows under a posting account, use{" "}
                <strong>Actions → Add subaccount</strong>—the app will offer to turn that row into a <strong>group (folder)</strong> first.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                title="Coming soon — not wired yet"
                className="coa-chart-soon-btn cursor-not-allowed rounded-full border-2 border-[var(--gs-border-strong)] bg-[var(--gs-hover)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm ring-1 ring-[var(--gs-border)]/60 dark:ring-white/10"
              >
                Import
              </button>
              <button
                type="button"
                disabled
                title="Coming soon — not wired yet"
                className="coa-chart-soon-btn cursor-not-allowed rounded-full border-2 border-[var(--gs-border-strong)] bg-[var(--gs-hover)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] shadow-sm ring-1 ring-[var(--gs-border)]/60 dark:ring-white/10"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => openCoaAdd()}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
              >
                + New account
              </button>
            </div>
          </div>
          {coaError ? (
            <div className="border-b border-[var(--gs-border-strong)] bg-[var(--gs-accent-soft)] px-5 py-3 text-sm text-[var(--gs-text)]">
              {coaError}
            </div>
          ) : null}
          {coaLoading ? (
            <div className="border-b border-[var(--gs-border)]">
              <LoadingBlock label="Loading chart of accounts…" className="py-10" />
            </div>
          ) : null}
          <div className="border-b border-[var(--gs-border)] px-4 py-3 sm:px-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Categories</p>
            <div className="flex flex-wrap gap-2">
              {COA_CATEGORY_RIBBON.map((chip) => {
                const count = chip.type === "All" ? coaRibbonTotal : coaCountsByType[chip.type];
                const active = coaTypeFilter === chip.type;
                return (
                  <button
                    key={chip.type === "All" ? "all" : chip.type}
                    type="button"
                    onClick={() => setCoaTypeFilter(chip.type)}
                    className={`flex min-w-[5.5rem] flex-col rounded-xl border px-3 py-2 text-left text-xs font-semibold ring-1 transition sm:min-w-[6.5rem] sm:px-4 sm:text-sm ${
                      active ? `${chip.activeBg} border-transparent ring-transparent` : `${chip.bg} border-[var(--gs-border)] text-[var(--gs-text)] ${chip.ring} hover:opacity-95`
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`mt-0.5 font-mono text-[10px] font-normal ${
                        active ? "text-white/90 dark:text-zinc-900/80" : "text-[var(--gs-muted)]"
                      }`}
                    >
                      {count} {count === 1 ? "account" : "accounts"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[180px] flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Search</label>
              <input
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder="Code or name"
                className="gs-field"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Status</label>
              <select
                value={coaStatusFilter}
                onChange={(e) => setCoaStatusFilter(e.target.value as typeof coaStatusFilter)}
                className="gs-field"
              >
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setCoaSearch("");
                setCoaTypeFilter("All");
                setCoaStatusFilter("All");
              }}
              className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:mb-0.5"
            >
              Reset filters
            </button>
          </div>
          <div className="gs-table-scroll overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[960px] text-left text-sm lg:min-w-full">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-5 py-3">Account code</th>
                  <th className="min-w-[200px] px-5 py-3">Account name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="min-w-[140px] px-5 py-3">Parent</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              {!coaLoading && coaGroupedSections.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-[var(--gs-muted)]">
                      No accounts match your filters.
                    </td>
                  </tr>
                </tbody>
              ) : (
                coaGroupedSections.map(({ type: sectionType, items }, sectionIdx) => (
                  <tbody
                    key={sectionType}
                    className={`gs-striped-rows divide-y divide-[var(--gs-border)]${sectionIdx > 0 ? " border-t-2 border-[var(--gs-border)]" : ""}`}
                  >
                    {items.map(({ row, treeDepth }) => {
                        const treePad = treeDepth * 16;
                        const isHeader = row.isGroup;
                        const expanded = coaExpandedIds.has(row.id);
                        return (
                          <tr
                            key={row.id}
                            className={`cursor-pointer ${isHeader ? `coa-chart-group ${COA_GROUP_ROW[row.type]}` : "hover:bg-[var(--gs-hover)]/80"}`}
                            onClick={() => {
                              if (row.isGroup) {
                                toggleCoaExpanded(row.id);
                                return;
                              }
                              setCoaDetailTab("overview");
                              setCoaDetailModal(row);
                            }}
                          >
                            <td className="px-2 py-3 font-mono text-[var(--gs-text)]">
                              <div className="flex items-center gap-0.5" style={{ paddingLeft: `${8 + treePad}px` }}>
                                {row.isGroup ? (
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--gs-muted)] hover:bg-black/5 dark:hover:bg-white/10"
                                    aria-expanded={expanded}
                                    aria-label={expanded ? "Collapse subaccounts" : "Expand subaccounts"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCoaExpanded(row.id);
                                    }}
                                  >
                                    <svg
                                      className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      aria-hidden
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                ) : (
                                  <span className="inline-block w-8 shrink-0" aria-hidden />
                                )}
                                <span>{row.code}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-[var(--gs-text)]">
                              <span style={{ paddingLeft: `${treePad}px` }} className="inline-flex flex-wrap items-center gap-2">
                                {treeDepth > 0 ? <span className="shrink-0 text-[var(--gs-muted)]">└</span> : null}
                                {isHeader ? (
                                  <span className={COA_GROUP_NAME_PILL[row.type]}>{row.name}</span>
                                ) : (
                                  row.name
                                )}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-[var(--gs-muted)]">{row.type}</td>
                            <td className="px-5 py-3 text-[var(--gs-muted)]">{parentLabel(coaRows, row.parentId)}</td>
                            <td className="px-5 py-3 text-right font-mono text-[var(--gs-text)]">
                              {formatMoney(row.balance, functionalCurrency)}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                                  row.status === "Active"
                                    ? "bg-emerald-100 text-emerald-950 ring-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-100 dark:ring-emerald-700"
                                    : "bg-zinc-200 text-zinc-800 ring-zinc-300 dark:bg-zinc-700 dark:text-zinc-100 dark:ring-zinc-500"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <RowActionsMenu
                                  actions={[
                                    { label: "Add subaccount", onSelect: () => void handleAddSubaccount(row), tone: "accent" },
                                    ...(!row.isGroup
                                      ? [
                                          {
                                            label: "View details",
                                            onSelect: () => {
                                              setCoaDetailTab("overview");
                                              setCoaDetailModal(row);
                                            },
                                            tone: "accent" as const,
                                          },
                                        ]
                                      : []),
                                    { label: "Edit", onSelect: () => openCoaEdit(row), tone: "default" as const },
                                    ...(row.status === "Active"
                                      ? [
                                          {
                                            label: "Deactivate",
                                            onSelect: () => void deactivateCoa(row),
                                            tone: "danger" as const,
                                          },
                                        ]
                                      : [
                                          {
                                            label: "Activate",
                                            onSelect: () => void activateCoa(row),
                                            tone: "accent" as const,
                                          },
                                        ]),
                                    {
                                      label: "Delete account",
                                      onSelect: () => void deleteCoa(row),
                                      tone: "danger" as const,
                                    },
                                  ]}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                ))
              )}
            </table>
          </div>
        </section>
      )}

      {tab === "gl_posting" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
          <div className="border-b border-[var(--gs-border)] p-5">
            <h2 className="text-lg font-bold text-[var(--gs-text)]">GL posting defaults</h2>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">
              Choose which chart accounts receive <strong>inventory</strong>, <strong>purchases</strong>, <strong>accounts payable</strong>, and{" "}
              <strong>bank / cash</strong> postings when purchase receipts and vendor payments are recorded. When auto-post is on, those
              vouchers create journal entries against these accounts.
            </p>
          </div>
          {glPostingErr ? <div className="gs-strip-danger px-5 py-3">{glPostingErr}</div> : null}
          <div className="p-5">
            {glPostingLoad || !glPostingSettings ? (
              <LoadingBlock label="Loading GL settings…" className="py-10" />
            ) : (
              <div className="relative">
                {glPostingSave ? (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-[var(--gs-card)]/85 backdrop-blur-[1px]"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span
                      className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--gs-border)] border-t-[var(--gs-accent)]"
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-[var(--gs-text)]">Saving settings…</p>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Functional currency</span>
                  <input
                    value={glPostingSettings.functional_currency}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, functional_currency: e.target.value.toUpperCase().slice(0, 3) } : p))
                    }
                    maxLength={3}
                    className="gs-field font-mono"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Purchase receipt mode</span>
                  <select
                    value={glPostingSettings.purchase_receipt_mode}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, purchase_receipt_mode: e.target.value } : p))
                    }
                    className="gs-field"
                  >
                    <option value="inventory">Debit inventory (asset)</option>
                    <option value="expense">Debit purchases (expense)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--gs-text)] sm:col-span-3">
                  <input
                    type="checkbox"
                    checked={glPostingSettings.auto_post_purchase_lots}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, auto_post_purchase_lots: e.target.checked } : p))
                    }
                  />
                  Auto-post purchase receipts and vendor payments to the general ledger
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--gs-text)] sm:col-span-3">
                  <input
                    type="checkbox"
                    checked={glPostingSettings.auto_post_sales_invoices}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, auto_post_sales_invoices: e.target.checked } : p))
                    }
                  />
                  Auto-post sales invoices and customer payments to the general ledger
                </label>
                <p className="text-xs text-[var(--gs-muted)] sm:col-span-3">
                  Sales posting requires Accounts receivable, Sales revenue, COGS, and Inventory below (for Save &amp; post on invoices).
                </p>
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Accounts receivable (asset)</span>
                  <select
                    value={glPostingSettings.account_ar_id ?? ""}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, account_ar_id: e.target.value || null } : p))
                    }
                    className="gs-field"
                  >
                    <option value="">— None —</option>
                    {glPostingAccounts
                      .filter((a) => a.account_type.toLowerCase() === "asset")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Sales revenue</span>
                  <select
                    value={glPostingSettings.account_sales_revenue_id ?? ""}
                    onChange={(e) =>
                      setGlPostingSettings((p) =>
                        p ? { ...p, account_sales_revenue_id: e.target.value || null } : p,
                      )
                    }
                    className="gs-field"
                  >
                    <option value="">— None —</option>
                    {glPostingAccounts
                      .filter((a) => a.account_type.toLowerCase() === "revenue")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Cost of goods sold (expense)</span>
                  <select
                    value={glPostingSettings.account_cogs_id ?? ""}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, account_cogs_id: e.target.value || null } : p))
                    }
                    className="gs-field"
                  >
                    <option value="">— None —</option>
                    {glPostingAccounts
                      .filter((a) => a.account_type.toLowerCase() === "expense")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Inventory (asset)</span>
                  <select
                    value={glPostingSettings.account_inventory_id ?? ""}
                    onChange={(e) =>
                      setGlPostingSettings((p) =>
                        p ? { ...p, account_inventory_id: e.target.value || null } : p,
                      )
                    }
                    className="gs-field"
                  >
                    <option value="">— None —</option>
                    {glPostingAccounts
                      .filter((a) => a.account_type.toLowerCase() === "asset")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Purchases (expense)</span>
                  <select
                    value={glPostingSettings.account_purchases_id ?? ""}
                    onChange={(e) =>
                      setGlPostingSettings((p) =>
                        p ? { ...p, account_purchases_id: e.target.value || null } : p,
                      )
                    }
                    className="gs-field"
                  >
                    <option value="">— None —</option>
                    {glPostingAccounts
                      .filter((a) => a.account_type.toLowerCase() === "expense")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Accounts payable</span>
                  <select
                    value={glPostingSettings.account_ap_id ?? ""}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, account_ap_id: e.target.value || null } : p))
                    }
                    className="gs-field"
                  >
                    <option value="">— None —</option>
                    {glPostingAccounts
                      .filter((a) => a.account_type.toLowerCase() === "liability")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2 lg:col-span-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Default bank / cash (asset)</span>
                  <select
                    value={glPostingSettings.account_default_bank_id ?? ""}
                    onChange={(e) =>
                      setGlPostingSettings((p) =>
                        p ? { ...p, account_default_bank_id: e.target.value || null } : p,
                      )
                    }
                    className="gs-field max-w-md"
                  >
                    <option value="">— None —</option>
                    {glPostingAccounts
                      .filter((a) => a.account_type.toLowerCase() === "asset")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} {a.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
                  {glPostingSaveFlash ? (
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{glPostingSaveFlash}</span>
                  ) : null}
                  <button
                    type="button"
                    disabled={glPostingSave}
                    onClick={() => void saveGlPostingSettings()}
                    className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {glPostingSave ? "Saving…" : "Save GL posting settings"}
                  </button>
                </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "opening" && (
        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Opening balances</h2>
              <p className="text-sm text-[var(--gs-muted)]">Complete each section, then finalize  front-end demo only.</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-[var(--gs-accent-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--gs-text)] ring-1 ring-[var(--gs-border-strong)]">
              {openingStatus}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {openingCards.map((c) => (
              <div key={c.key} className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-4 shadow-sm">
                <p className="font-bold text-[var(--gs-text)]">{c.title}</p>
                <p className="mt-2 text-xs text-[var(--gs-muted)]">
                  Status: <span className="font-semibold text-[var(--gs-text)]">{c.status}</span>
                </p>
                <p className="mt-1 text-xs text-[var(--gs-muted)]">Last updated: {c.updated}</p>
                <button
                  type="button"
                  onClick={() => setOpeningSub(c.key)}
                  className="mt-4 text-xs font-semibold text-[var(--gs-accent)] hover:underline"
                >
                  Open →
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const ok = await confirm({
                  title: "Finalize opening?",
                  message: "Are you sure? This action cannot be undone (demo).",
                  confirmLabel: "Finalize",
                  variant: "danger",
                });
                if (ok) pushToast("Opening locked (demo).", "success");
              })();
            }}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white opacity-50"
            disabled
          >
            Finalize &amp; lock opening
          </button>
        </section>
      )}


      {tab === "journal_list" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Journal entries</h2>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">
                Manual vouchers: pick accounts from your chart, keep debits equal to credits, then post. Saving a purchase lot posts a
                receipt entry (inventory or purchases vs AP); recording a payment posts AP vs bank. Use <strong>View lines</strong>{" "}
                to see full history for each voucher.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setJournalShowDeleted((v) => !v)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
              >
                {journalShowDeleted ? "Show active journals" : "Show deleted journals"}
              </button>
              <button
                type="button"
                onClick={() => openNewJournal()}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm"
              >
                + New journal entry
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
            {journalsLoading ? (
              <LoadingBlock label="Loading journal entries…" className="py-12" />
            ) : (
              <div className="gs-table-scroll overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Total debit</th>
                      <th className="px-4 py-3 text-right">Total credit</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                    {journalRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-[var(--gs-muted)]">
                          No journal entries yet.
                        </td>
                      </tr>
                    ) : (
                      journalRows.map((j) => (
                        <tr key={j.id} className="hover:bg-[var(--gs-hover)]/80">
                          <td className="px-4 py-3 text-[var(--gs-text)]">{j.date}</td>
                          <td className="px-4 py-3 font-mono text-[var(--gs-text)]">{j.ref}</td>
                          <td className="max-w-[14rem] truncate px-4 py-3 text-[var(--gs-text)]" title={j.desc}>
                            {j.desc}
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--gs-muted)]">
                            <span className="text-[var(--gs-text)]">{j.sourceLabel}</span>
                            {j.lotCode ? (
                              <span className="mt-0.5 block font-mono text-[10px] text-[var(--gs-text)]/70">Lot {j.lotCode}</span>
                            ) : null}
                            {j.sourceId ? (
                              <span className="mt-0.5 block font-mono text-[10px] text-[var(--gs-text)]/70">{j.sourceId}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatMoney(j.amount, functionalCurrency)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatMoney(j.creditAmount, functionalCurrency)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                                j.status === "posted"
                                  ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                                  : "bg-[var(--gs-hover)] text-[var(--gs-text)] ring-[var(--gs-border)]"
                              }`}
                            >
                              {j.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <RowActionsMenu
                              actions={
                                j.status === "deleted"
                                  ? [
                                      { label: "View lines", onSelect: () => void openJournalViewer(j.id), tone: "accent" },
                                      {
                                        label: journalDeleteBusyId === j.id ? "Restoring..." : "Restore",
                                        onSelect: () => void restoreDeletedJournalRow({ id: j.id, ref: j.ref }),
                                        tone: "success",
                                      },
                                    ]
                                  : [
                                      { label: "View lines", onSelect: () => void openJournalViewer(j.id), tone: "accent" },
                                      { label: "Edit", onSelect: () => void openEditDraftJournal(j.id), tone: "default" },
                                      {
                                        label: journalDeleteBusyId === j.id ? "Deleting..." : "Delete",
                                        onSelect: () => void deleteDraftJournalRow({ id: j.id, ref: j.ref }),
                                        tone: "danger",
                                      },
                                    ]
                              }
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "banking" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Banking</h2>
              <p className="text-sm text-[var(--gs-muted)]">Bank cards, statements, reconciliation, transfers.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setBankAddOpen(true)} className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                + Add bank account
              </button>
              <button type="button" onClick={() => setBankImportOpen(true)} className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)]">
                Import statement
              </button>
              <button type="button" onClick={() => setBankTransferOpen(true)} className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)]">
                Transfer money
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {bankCards.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBankDetailId(b.id);
                  setBankDetailTab("transactions");
                }}
                className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 text-left shadow-sm transition hover:border-[var(--gs-accent)]"
              >
                <p className="text-lg font-bold text-[var(--gs-text)]">{b.bank}</p>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">Account ···· {b.last4}</p>
                <p className="mt-4 text-2xl font-black text-[var(--gs-text)]">{formatMoney(b.balance, "PKR")}</p>
                <p className="mt-2 text-xs text-[var(--gs-muted)]">Last reconciled: {b.recon}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {journalEditorOpen ? (
        <div className="fixed inset-0 z-[60] flex min-h-[100dvh] items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="relative my-4 min-h-[min(100dvh-2rem,900px)] w-full max-w-5xl rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl">
            {jeSaving ? (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--gs-card)]/90 backdrop-blur-[2px]"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <span
                  className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--gs-border)] border-t-[var(--gs-accent)]"
                  aria-hidden
                />
                <p className="text-sm font-medium text-[var(--gs-text)]">Saving journal…</p>
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--gs-text)]">
                  {editingJournalId ? "Edit journal entry" : "New journal entry"}
                </h2>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">
                  Choose a posting account per line. Each line is either a debit or a credit — totals must match before you post.
                </p>
              </div>
              <button
                type="button"
                disabled={jeSaving}
                onClick={() => {
                  setJournalEditorOpen(false);
                  setEditingJournalId(null);
                }}
                className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Date *</label>
                <input
                  type="date"
                  value={jeDate}
                  onChange={(e) => setJeDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Reference no *</label>
                <input
                  value={jeRef}
                  onChange={(e) => setJeRef(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 font-mono text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Description</label>
                <input
                  value={jeMemo}
                  onChange={(e) => setJeMemo(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
            </div>
            {jeError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{jeError}</div> : null}
            {jeAccountsError ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                {jeAccountsError}
              </div>
            ) : null}
            <div className="gs-table-scroll mt-6 overflow-x-auto rounded-xl border border-[var(--gs-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  <tr>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Line description</th>
                    <th className="py-2 pr-4 text-right">Debit</th>
                    <th className="py-2 pr-4 text-right">Credit</th>
                    <th className="py-2 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                  {jeLines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 pr-4">
                        <select
                          value={l.accountId}
                          onChange={(e) => updateJeLine(l.id, { accountId: e.target.value })}
                          className="w-full min-w-[220px] rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm"
                        >
                          <option value="">Select account…</option>
                          {postableAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          value={l.lineDesc}
                          onChange={(e) => updateJeLine(l.id, { lineDesc: e.target.value })}
                          className="w-full min-w-[140px] rounded-lg border border-[var(--gs-border)] px-3 py-2 text-sm"
                          placeholder="Optional"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          value={l.debit || ""}
                          onChange={(e) => updateJeLine(l.id, { debit: Number(e.target.value), credit: 0 })}
                          className="w-full rounded-lg border border-[var(--gs-border)] px-3 py-2 text-sm text-right"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          value={l.credit || ""}
                          onChange={(e) => updateJeLine(l.id, { credit: Number(e.target.value), debit: 0 })}
                          className="w-full rounded-lg border border-[var(--gs-border)] px-3 py-2 text-sm text-right"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeJeLine(l.id)}
                          className="rounded-lg p-2 text-[var(--gs-muted)] hover:bg-red-50 hover:text-red-700"
                          aria-label="Remove line"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addJeLine} className="mt-2 text-sm font-semibold text-[var(--gs-accent)] hover:underline">
              + Add line
            </button>
            <div
              className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                jeBalanced.ok
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              }`}
            >
              <span>
                Total debit: <strong>{formatMoney(jeBalanced.debit, functionalCurrency)}</strong> · Total credit:{" "}
                <strong>{formatMoney(jeBalanced.credit, functionalCurrency)}</strong>
                {!jeBalanced.ok ? (
                  <span className="ml-2 text-amber-900 dark:text-amber-200">
                    · Difference {formatMoney(Math.abs(jeBalanced.debit - jeBalanced.credit), functionalCurrency)}
                  </span>
                ) : null}
              </span>
              <span className={jeBalanced.ok ? "font-semibold text-emerald-900 dark:text-emerald-100" : "font-semibold text-amber-900 dark:text-amber-100"}>
                {jeBalanced.ok ? "Balanced" : "Not balanced"}
              </span>
            </div>
            <p className="mt-6 border-t border-[var(--gs-border)] pt-4 text-xs text-[var(--gs-muted)]">
              Journal entries must stay <strong>balanced</strong>. Attachments and approval workflows are not enabled in this build.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={jeSaving || !jeBalanced.ok}
                onClick={() => void saveJournalDraft()}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {jeSaving ? "Saving…" : editingJournalId ? "Save changes" : "Save balanced draft"}
              </button>
              <button
                type="button"
                disabled={jeSaving || !jeBalanced.ok}
                onClick={() => void saveAndPostJournal()}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {jeSaving ? "Posting…" : "Post journal"}
              </button>
              <button
                type="button"
                disabled={jeSaving}
                onClick={() => {
                  setJournalEditorOpen(false);
                  setEditingJournalId(null);
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {coaDetailModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setCoaDetailModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coa-detail-modal-title"
            className="max-h-[min(88vh,36rem)] w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--gs-border)] p-5">
              <div className="min-w-0">
                <h3 id="coa-detail-modal-title" className="truncate text-lg font-bold text-[var(--gs-text)]">
                  {coaDetailModal.name}
                </h3>
                <p className="mt-1 font-mono text-sm text-[var(--gs-muted)]">{coaDetailModal.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setCoaDetailModal(null)}
                className="shrink-0 rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex gap-2 border-b border-[var(--gs-border)] px-5 pt-2">
              <button
                type="button"
                onClick={() => setCoaDetailTab("overview")}
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${
                  coaDetailTab === "overview" ? "bg-[var(--gs-hover)] text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]" : "text-[var(--gs-muted)]"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setCoaDetailTab("transactions")}
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${
                  coaDetailTab === "transactions" ? "bg-[var(--gs-hover)] text-[var(--gs-text)] ring-1 ring-[var(--gs-border)]" : "text-[var(--gs-muted)]"
                }`}
              >
                Transactions
              </button>
            </div>
            <div className="max-h-[min(52vh,22rem)] overflow-y-auto p-5 text-sm">
              {coaDetailTab === "overview" ? (
                <div className="space-y-3">
                  <div className="flex justify-between gap-4 border-b border-[var(--gs-border)] py-2">
                    <span className="text-[var(--gs-muted)]">Type</span>
                    <span className="text-right font-semibold text-[var(--gs-text)]">{coaDetailModal.type}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--gs-border)] py-2">
                    <span className="shrink-0 text-[var(--gs-muted)]">Parent</span>
                    <span className="text-right font-semibold text-[var(--gs-text)]">
                      {coaDetailModal.parentId ? parentBreadcrumb(coaRows, coaDetailModal.parentId) : "— Top level"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--gs-border)] py-2">
                    <span className="text-[var(--gs-muted)]">Subtype</span>
                    <span className="font-mono text-[var(--gs-text)]">{coaDetailModal.accountSubtype?.trim() || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--gs-border)] py-2">
                    <span className="text-[var(--gs-muted)]">Group account</span>
                    <span className="font-semibold text-[var(--gs-text)]">{coaDetailModal.isGroup ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--gs-border)] py-2">
                    <span className="text-[var(--gs-muted)]">Allows posting</span>
                    <span className="font-semibold text-[var(--gs-text)]">{coaDetailModal.allowPosting ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--gs-border)] py-2">
                    <span className="text-[var(--gs-muted)]">Balance</span>
                    <span className="font-mono font-semibold text-[var(--gs-text)]">
                      {formatMoney(coaDetailModal.balance, functionalCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--gs-border)] py-2">
                    <span className="text-[var(--gs-muted)]">Status</span>
                    <span className="font-semibold text-[var(--gs-text)]">{coaDetailModal.status}</span>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 text-[var(--gs-muted)]">
                  Account activity by voucher will appear here in a future update. Use <strong>Journal entries</strong> for posted detail
                  today.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--gs-border)] p-5">
              <button
                type="button"
                onClick={() => {
                  openCoaEdit(coaDetailModal);
                  setCoaDetailModal(null);
                }}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Edit account
              </button>
              {coaDetailModal.status === "Active" ? (
                <button
                  type="button"
                  onClick={() => void deactivateCoa(coaDetailModal)}
                  className="rounded-full border border-red-300/80 px-4 py-2.5 text-sm font-semibold text-red-800 dark:border-red-800 dark:text-red-200"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void activateCoa(coaDetailModal)}
                  className="rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)]"
                >
                  Activate
                </button>
              )}
              <button
                type="button"
                onClick={() => void deleteCoa(coaDetailModal)}
                className="rounded-full border border-red-300/80 px-4 py-2.5 text-sm font-semibold text-red-800 dark:border-red-800 dark:text-red-200"
              >
                Delete account
              </button>
              <button
                type="button"
                onClick={() => setCoaDetailModal(null)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {coaModal ? (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => {
            if (!coaSaving) setCoaModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coa-modal-title"
            className="relative flex max-h-[min(92vh,46rem)] w-full min-w-0 max-w-[min(100%,56rem)] flex-col rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {coaSaving ? (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[var(--gs-card)]/88 backdrop-blur-[2px]"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <span
                  className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--gs-border)] border-t-[var(--gs-accent)]"
                  aria-hidden
                />
                <p className="text-sm font-medium text-[var(--gs-text)]">Saving account…</p>
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--gs-border)] p-6">
              <div>
                <h3 id="coa-modal-title" className="text-lg font-bold text-[var(--gs-text)]">
                  {coaModal === "add" ? "New account" : "Edit account"}
                </h3>
                <p className="mt-1 text-xs text-[var(--gs-muted)]">
                  {coaModal === "add"
                    ? "Subaccounts must sit under a group of the same type. Chart depth is limited to nested levels (see error text if save fails)."
                    : "Code and account type cannot be changed after creation."}
                </p>
              </div>
              <button
                type="button"
                disabled={coaSaving}
                onClick={() => setCoaModal(null)}
                className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account name *</label>
                  <input
                    value={coaForm.name}
                    disabled={coaSaving}
                    onChange={(e) => setCoaForm((f) => ({ ...f, name: e.target.value }))}
                    className="gs-field disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Code *</label>
                  <input
                    value={coaForm.code}
                    readOnly={coaModal !== "add"}
                    disabled={coaSaving}
                    onChange={(e) => setCoaForm((f) => ({ ...f, code: e.target.value }))}
                    className="gs-field font-mono read-only:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Type *</label>
                  <select
                    value={coaForm.type}
                    disabled={coaModal !== "add" || coaSaving}
                    onChange={(e) => {
                      const nextType = e.target.value as AccountType;
                      setCoaForm((f) => {
                        let parentId = f.parentId;
                        if (parentId !== "none") {
                          const still = coaRows.some((r) => r.id === parentId && r.isGroup && r.type === nextType);
                          if (!still) parentId = "none";
                        }
                        return { ...f, type: nextType, parentId };
                      });
                    }}
                    className="gs-field disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option>Asset</option>
                    <option>Liability</option>
                    <option>Equity</option>
                    <option>Revenue</option>
                    <option>Expense</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                    Subtype <span className="font-normal normal-case text-[var(--gs-muted)]">(optional)</span>
                  </label>
                  <input
                    list="coa-subtype-presets"
                    value={coaForm.accountSubtype}
                    disabled={coaSaving}
                    onChange={(e) => setCoaForm((f) => ({ ...f, accountSubtype: e.target.value }))}
                    placeholder="e.g. bank, inventory, payable"
                    className="gs-field disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <datalist id="coa-subtype-presets">
                    <option value="bank" />
                    <option value="inventory" />
                    <option value="payable" />
                    <option value="receivable" />
                  </datalist>
                </div>
                <div className="min-w-0 sm:col-span-2 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Parent in chart</span>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--gs-text)]">
                      <input
                        type="radio"
                        name="coa-parent-mode"
                        className="shrink-0"
                        checked={coaForm.parentId === "none"}
                        disabled={coaSaving}
                        onChange={() => setCoaForm((f) => ({ ...f, parentId: "none" }))}
                      />
                      <span>
                        <span className="font-semibold">Top-level</span>{" "}
                        <span className="text-[var(--gs-muted)]">under {coaForm.type}</span>
                      </span>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-2 text-sm text-[var(--gs-text)] ${
                        !coaHasParentGroupsForType ? "cursor-not-allowed opacity-55" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="coa-parent-mode"
                        className="shrink-0"
                        checked={coaForm.parentId !== "none"}
                        disabled={coaSaving || !coaHasParentGroupsForType}
                        onChange={() => {
                          const first = coaParentGroupDropdownOptions(coaRows, coaForm.type, editingAccountId, "")[0];
                          setCoaForm((f) => ({ ...f, parentId: first ? first.id : "none" }));
                        }}
                      />
                      <span className="font-semibold">Under a group</span>
                    </label>
                  </div>
                  {coaForm.parentId !== "none" ? (
                    <div className="mt-3 space-y-2 border-t border-[var(--gs-border)] pt-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Filter groups</label>
                      <input
                        value={coaParentSearch}
                        disabled={coaSaving}
                        onChange={(e) => setCoaParentSearch(e.target.value)}
                        placeholder="Search code or name…"
                        className="gs-field text-sm"
                      />
                      <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Parent group</label>
                      <div
                        role="radiogroup"
                        aria-label="Parent group"
                        className="coa-parent-radiogroup mt-1 max-h-[min(50vh,16rem)] w-full min-w-0 overflow-y-auto overscroll-contain rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-1"
                      >
                        {coaParentDropdownOptions.map((o) => {
                          const label = o.label.replace(/\u00a0/g, " ");
                          const selected = coaForm.parentId === o.id;
                          return (
                            <label
                              key={o.id}
                              className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm ${
                                selected ? "bg-[var(--gs-accent-soft)] ring-1 ring-[var(--gs-accent)]" : "hover:bg-[var(--gs-hover)]"
                              } ${coaSaving ? "pointer-events-none opacity-50" : ""}`}
                            >
                              <input
                                type="radio"
                                name="coa-parent-pick"
                                value={o.id}
                                checked={selected}
                                disabled={coaSaving}
                                onChange={() => setCoaForm((f) => ({ ...f, parentId: o.id }))}
                                className="mt-1 shrink-0"
                              />
                              <span className="min-w-0 flex-1 break-words font-mono leading-snug text-[var(--gs-text)]">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {!coaHasParentGroupsForType ? (
                    <p className="mt-2 text-xs text-[var(--gs-muted)]">
                      No <strong>{coaForm.type}</strong> group accounts yet. Create a top-level group first, or keep this account top-level.
                    </p>
                  ) : coaForm.parentId !== "none" && coaParentDropdownOptions.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">No groups match the filter — clear search to see the full list.</p>
                  ) : null}
                </div>
                <div className="flex flex-col justify-center gap-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--gs-text)]">
                    <input
                      type="checkbox"
                      checked={coaForm.isGroup}
                      disabled={coaSaving}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setCoaForm((f) => ({
                          ...f,
                          isGroup: checked,
                          allowTransactions: checked ? false : true,
                          ...(checked
                            ? { openingBalance: "", openingBalanceOffsetId: "none" as const }
                            : {}),
                        }));
                      }}
                      className="rounded border-[var(--gs-border-strong)] disabled:cursor-not-allowed"
                    />
                    Group (folder)
                  </label>
                  <label className={`flex items-center gap-2 text-sm font-medium ${coaForm.isGroup ? "text-[var(--gs-muted)]" : "text-[var(--gs-text)]"}`}>
                    <input
                      type="checkbox"
                      checked={coaForm.allowTransactions}
                      disabled={coaForm.isGroup || coaSaving}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setCoaForm((f) => ({
                          ...f,
                          allowTransactions: v,
                          ...(!v ? { openingBalance: "", openingBalanceOffsetId: "none" as const } : {}),
                        }));
                      }}
                      className="rounded border-[var(--gs-border-strong)] disabled:cursor-not-allowed"
                    />
                    Allow posting
                  </label>
                  <div className="min-w-[10rem] sm:ml-auto">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Status</span>
                    <select
                      value={coaForm.status}
                      disabled={coaSaving}
                      onChange={(e) => setCoaForm((f) => ({ ...f, status: e.target.value as "Active" | "Inactive" }))}
                      className="gs-field mt-1 bg-[var(--gs-card)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {coaModal === "add" && !coaForm.isGroup && coaForm.allowTransactions ? (
                  <div className="space-y-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 p-4 sm:col-span-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Opening balance</span>
                      <span className="ml-2 text-xs font-normal normal-case text-[var(--gs-muted)]">(optional)</span>
                      <p className="mt-1 text-xs text-[var(--gs-muted)]">
                        If you enter an amount, GemStack posts a balanced journal: this account on its normal side (debit for assets and
                        expenses, credit for liabilities, equity, and revenue) and the offset account on the other side. Leave the amount blank
                        to skip.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Amount</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={coaForm.openingBalance}
                          disabled={coaSaving}
                          onChange={(e) => setCoaForm((f) => ({ ...f, openingBalance: e.target.value }))}
                          placeholder="0 — leave empty to skip"
                          className="gs-field mt-1 font-mono disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Effective date</label>
                        <input
                          type="date"
                          value={coaForm.openingBalanceEntryDate}
                          disabled={coaSaving}
                          onChange={(e) => setCoaForm((f) => ({ ...f, openingBalanceEntryDate: e.target.value }))}
                          className="gs-field mt-1 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                          Offset account <span className="font-normal normal-case">(other side of the entry)</span>
                        </label>
                        <select
                          value={coaForm.openingBalanceOffsetId}
                          disabled={coaSaving}
                          onChange={(e) => setCoaForm((f) => ({ ...f, openingBalanceOffsetId: e.target.value }))}
                          className="gs-field mt-1 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="none">Select if using an opening amount…</option>
                          {coaOpeningOffsetOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {coaOpeningOffsetOptions.length === 0 ? (
                          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                            You need at least one other active posting account in the chart to use as the offset.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/50 px-3 py-2 text-xs text-[var(--gs-muted)] sm:col-span-2">
                    {coaModal === "add"
                      ? "Optional opening balance is available when the account is not a group and allows posting."
                      : "Opening balances are posted via journal entries. Edit the account here; use Journal entries to change balances."}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--gs-border)] bg-[var(--gs-card)] p-4 sm:p-6">
              <button
                type="button"
                disabled={coaSaving}
                onClick={() => setCoaModal(null)}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={coaSaving}
                onClick={() => void saveCoa(false)}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {coaSaving ? "Saving…" : "Save"}
              </button>
              {coaModal === "add" ? (
                <button
                  type="button"
                  disabled={coaSaving}
                  onClick={() => void saveCoa(true)}
                  className="rounded-full border border-orange-200 bg-[var(--gs-accent-soft)] px-5 py-2.5 text-sm font-semibold text-orange-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-orange-100"
                >
                  {coaSaving ? "Saving…" : "Save & new"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {openingSub ? (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-[var(--gs-card)]">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--gs-text)]">
                  {openingSub === "trial" && "Opening trial balance"}
                  {openingSub === "customer" && "Customer opening balance"}
                  {openingSub === "vendor" && "Vendor opening balance"}
                  {openingSub === "inventory" && "Inventory opening"}
                </h2>
                {openingSub === "trial" ? (
                  <p className="mt-2 text-sm text-amber-800">Total debit must equal total credit.</p>
                ) : null}
              </div>
              <button type="button" onClick={() => setOpeningSub(null)} className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)]">
                Close
              </button>
            </div>
            {openingSub === "trial" ? (
              <div className="gs-table-scroll mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                    <tr>
                      <td className="px-4 py-3">1100  Cash</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(50000, "PKR")}</td>
                      <td className="px-4 py-3 text-right"></td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">4000  Sales revenue</td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(50000, "PKR")}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-end gap-2 border-t border-[var(--gs-border)] p-4">
                  <button type="button" className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                    Save draft
                  </button>
                  <button type="button" className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                    Validate
                  </button>
                </div>
              </div>
            ) : null}
            {openingSub === "customer" ? (
              <div className="gs-table-scroll mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Invoice ref</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                    <tr>
                      <td className="px-4 py-3">Gem Traders LLC</td>
                      <td className="px-4 py-3 font-mono text-xs">INV-OPEN-1</td>
                      <td className="px-4 py-3">2026-03-01</td>
                      <td className="px-4 py-3 text-right">{formatMoney(12000, "PKR")}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-end gap-2 border-t border-[var(--gs-border)] p-4">
                  <button type="button" className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                    Save draft
                  </button>
                  <button type="button" className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                    Confirm
                  </button>
                </div>
              </div>
            ) : null}
            {openingSub === "vendor" ? (
              <div className="gs-table-scroll mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Bill ref</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                    <tr>
                      <td className="px-4 py-3">Sapphire Co.</td>
                      <td className="px-4 py-3 font-mono text-xs">BILL-OPEN-1</td>
                      <td className="px-4 py-3">2026-03-01</td>
                      <td className="px-4 py-3 text-right">{formatMoney(8000, "PKR")}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-end gap-2 border-t border-[var(--gs-border)] p-4">
                  <button type="button" className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                    Save draft
                  </button>
                  <button type="button" className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                    Confirm
                  </button>
                </div>
              </div>
            ) : null}
            {openingSub === "inventory" ? (
              <div className="mt-8 space-y-4">
                <div className="gs-table-scroll overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                      <tr>
                        <td className="px-4 py-3">Emerald parcel</td>
                        <td className="px-4 py-3 text-right">42</td>
                        <td className="px-4 py-3 text-right">{formatMoney(3500, "PKR")}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(147000, "PKR")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-right text-sm font-semibold text-[var(--gs-text)]">Total inventory value: {formatMoney(147000, "PKR")}</p>
                <div className="flex justify-end gap-2">
                  <button type="button" className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                    Save draft
                  </button>
                  <button type="button" className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                    Confirm
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {bankDetailId && selectedBank ? (
        <div className="fixed inset-0 z-[65] flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl">
            <div className="border-b border-[var(--gs-border)] p-6">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--gs-text)]">{selectedBank.bank}</h3>
                  <p className="mt-1 text-sm text-[var(--gs-muted)]">Balance {formatMoney(selectedBank.balance, "PKR")}</p>
                  <p className="text-xs text-[var(--gs-muted)]">Last reconciled: {selectedBank.recon}</p>
                </div>
                <button type="button" onClick={() => setBankDetailId(null)} className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]" aria-label="Close">
                  ×
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-b border-[var(--gs-border)] pb-4">
                {(
                  [
                    ["transactions", "Transactions"],
                    ["reconciliation", "Reconciliation"],
                    ["details", "Details"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBankDetailTab(id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      bankDetailTab === id ? "bg-[var(--gs-accent)] text-white" : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 p-6">
              {bankDetailTab === "transactions" ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                    <tr>
                      <td className="py-2">2026-03-14</td>
                      <td className="py-2">Wire in</td>
                      <td className="py-2 text-right font-medium text-emerald-700">+ {formatMoney(2000, "PKR")}</td>
                    </tr>
                    <tr>
                      <td className="py-2">2026-03-12</td>
                      <td className="py-2">Bank fee</td>
                      <td className="py-2 text-right font-medium text-red-700">→ {formatMoney(25, "PKR")}</td>
                    </tr>
                  </tbody>
                </table>
              ) : bankDetailTab === "details" ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--gs-muted)]">IBAN</dt>
                    <dd className="font-mono">PK00HBL000000{selectedBank.last4}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--gs-muted)]">Currency</dt>
                    <dd>PKR</dd>
                  </div>
                </dl>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--gs-muted)]">Match bank lines to system entries.</p>
                  <button
                    type="button"
                    onClick={() => setReconOpen(true)}
                    className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Open reconciliation workspace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {bankAddOpen ? (
        <div className="fixed inset-0 z-[66] flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl">
            <div className="flex justify-between">
              <h3 className="text-lg font-bold text-[var(--gs-text)]">Add bank account</h3>
              <button type="button" onClick={() => setBankAddOpen(false)} className="text-[var(--gs-muted)]">
                ×
              </button>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Bank name</label>
                <input className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2" placeholder="e.g. HBL" />
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Account title</label>
                <input className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Account number</label>
                <input className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Opening balance</label>
                <input type="number" className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Currency</label>
                <select className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2">
                  <option>PKR</option>
                  <option>USD</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex gap-2">
              <button type="button" onClick={() => setBankAddOpen(false)} className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  pushToast("Demo: bank saved.", "success");
                  setBankAddOpen(false);
                }}
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bankImportOpen ? (
        <div className="fixed inset-0 z-[66] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--gs-text)]">Import bank statement</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Bank account</label>
                <select className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2">
                  {bankCards.map((b) => (
                    <option key={b.id}>{b.bank} ···· {b.last4}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">CSV / Excel file</label>
                <input type="file" className="mt-1 w-full text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setBankImportOpen(false)} className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button type="button" onClick={() => pushToast("Demo: preview rows.", "success")} className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                Upload &amp; preview
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bankTransferOpen ? (
        <div className="fixed inset-0 z-[66] flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl">
            <div className="flex justify-between">
              <h3 className="text-lg font-bold text-[var(--gs-text)]">Transfer money</h3>
              <button type="button" onClick={() => setBankTransferOpen(false)} className="text-[var(--gs-muted)]">
                ×
              </button>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <label className="font-bold text-[var(--gs-muted)]">From</label>
                <select className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2">
                  {bankCards.map((b) => (
                    <option key={b.id}>{b.bank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">To</label>
                <select className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2">
                  {bankCards.map((b) => (
                    <option key={b.id}>{b.bank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Amount</label>
                <input type="number" className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-[var(--gs-muted)]">Date</label>
                <input type="date" className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2" />
              </div>
            </div>
            <div className="mt-8 flex gap-2">
              <button type="button" onClick={() => setBankTransferOpen(false)} className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  pushToast("Demo: transfer recorded.", "success");
                  setBankTransferOpen(false);
                }}
                className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reconOpen ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--gs-card)]">
          <div className="flex items-center justify-between border-b border-[var(--gs-border)] px-4 py-3">
            <h2 className="text-lg font-bold text-[var(--gs-text)]">Bank reconciliation</h2>
            <button type="button" onClick={() => setReconOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--gs-text)]">
              Close
            </button>
          </div>
          <div className="grid flex-1 gap-0 md:grid-cols-2">
            <div className="border-b border-[var(--gs-border)] p-4 md:border-b-0 md:border-r">
              <p className="text-xs font-bold uppercase text-[var(--gs-muted)]">Bank statement</p>
              <table className="mt-3 w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)]">
                  <tr className="text-xs text-[var(--gs-muted)]">
                    <th className="py-1" aria-label="Select" />
                    <th>Date</th>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                  <tr>
                    <td>
                      <input type="checkbox" />
                    </td>
                    <td>2026-03-10</td>
                    <td>Deposit</td>
                    <td className="text-right text-emerald-700">{formatMoney(500, "PKR")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <p className="text-xs font-bold uppercase text-[var(--gs-muted)]">System records</p>
              <table className="mt-3 w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)]">
                  <tr className="text-xs text-[var(--gs-muted)]">
                    <th className="py-1" aria-label="Select" />
                    <th>Date</th>
                    <th>Reference</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                  <tr>
                    <td>
                      <input type="checkbox" />
                    </td>
                    <td>2026-03-10</td>
                    <td>RCPT-104</td>
                    <td className="text-right">{formatMoney(500, "PKR")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--gs-border)] p-4">
            <p className="text-sm text-[var(--gs-muted)]">
              Matched {formatMoney(500, "PKR")} · Unmatched {formatMoney(0, "PKR")}
            </p>
            <div className="flex gap-2">
              <button type="button" className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold">
                Save progress
              </button>
              <button type="button" className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                Complete reconciliation
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AppDialog
        open={journalViewerOpen}
        onClose={() => {
          if (journalReversalBusy) return;
          setJournalViewerOpen(false);
          setJournalViewerDetail(null);
          setJournalViewerError(null);
        }}
        titleId="journal-viewer-title"
        title="Journal entry"
        description={journalViewerDetail ? `${journalViewerDetail.reference} · ${journalViewerDetail.entry_date}` : undefined}
        size="lg"
        footer={
          <div className="flex flex-wrap items-center gap-2">
            {journalViewerDetail?.status === "posted" ? (
              <button
                type="button"
                disabled={journalReversalBusy}
                onClick={() => void createReversalFromViewer()}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {journalReversalBusy ? "Creating…" : "Create reversal draft"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={journalReversalBusy}
              onClick={() => {
                setJournalViewerOpen(false);
                setJournalViewerDetail(null);
                setJournalViewerError(null);
              }}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
          </div>
        }
      >
        {journalViewerLoading ? <p className="text-sm text-[var(--gs-muted)]">Loading lines…</p> : null}
        {journalViewerError ? (
          <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-100">
            {journalViewerError}
          </p>
        ) : null}
        {journalViewerDetail && !journalViewerLoading ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/50 px-3 py-2 text-sm">
              <p>
                <span className="font-semibold text-[var(--gs-text)]">Memo:</span>{" "}
                <span className="text-[var(--gs-muted)]">{journalViewerDetail.memo || "—"}</span>
              </p>
              <p className="mt-1 text-xs text-[var(--gs-muted)]">
                Source:{" "}
                {journalSourceLabel(
                  journalViewerDetail.source_kind,
                  journalViewerDetail.source_type,
                  journalViewerDetail.tag,
                  journalViewerDetail.vendor_name,
                )}
                {journalViewerDetail.lot_code ? (
                  <>
                    {" "}
                    · Lot <span className="font-mono">{journalViewerDetail.lot_code}</span>
                  </>
                ) : null}
                {journalViewerDetail.source_id ? (
                  <>
                    {" "}
                    · ID <span className="font-mono">{journalViewerDetail.source_id}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-[var(--gs-muted)]">
                Status: <span className="font-semibold text-[var(--gs-text)]">{journalViewerDetail.status}</span>
              </p>
            </div>
            <div className="gs-table-scroll overflow-x-auto rounded-lg border border-[var(--gs-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  <tr>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                  {journalViewerDetail.lines.map((ln) => (
                    <tr key={ln.id}>
                      <td className="px-3 py-2 font-mono text-[var(--gs-text)]">
                        {ln.account_code} {ln.account_name}
                      </td>
                      <td className="px-3 py-2 text-[var(--gs-muted)]">{ln.description || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {Number(ln.debit) > 0 ? formatMoney(Number(ln.debit), functionalCurrency) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {Number(ln.credit) > 0 ? formatMoney(Number(ln.credit), functionalCurrency) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </AppDialog>

    </div>
  );
}