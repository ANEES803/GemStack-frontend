"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppDialog } from "@/components/ui/AppDialog";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { formatMoney } from "@/lib/format";
import {
  createGlAccount,
  createJournalEntry,
  createJournalReversalDraft,
  getGlSettings,
  getJournalEntry,
  listGlAccounts,
  listJournalEntries,
  listPostableGlAccounts,
  patchGlSettings,
  postJournalEntry,
  updateGlAccount,
  type GlAccountDto,
  type GlSettingsDto,
  type JournalDetailDto,
  type JournalSummaryDto,
} from "@/lib/glApi";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type TabId = "coa" | "opening" | "journal_list" | "banking";

/** Doc: Accounting → Setup (COA, opening) · Transactions (journals, banking). Tax, currency, parties & items live under Settings / Sales / Inventory. */
const TABS: { id: TabId; label: string; group: "setup" | "transactions" }[] = [
  { id: "coa", label: "Chart of accounts", group: "setup" },
  { id: "opening", label: "Opening balances", group: "setup" },
  { id: "journal_list", label: "Journal entries", group: "transactions" },
  { id: "banking", label: "Banking", group: "transactions" },
];

type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

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
};

function mapDtoToCoaRow(a: GlAccountDto): CoaRow {
  const t = (a.account_type || "Asset") as AccountType;
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
  };
}

function coaDepth(rows: CoaRow[], id: string): number {
  const row = rows.find((r) => r.id === id);
  if (!row || row.parentId === null) return 0;
  return 1 + coaDepth(rows, row.parentId);
}

function parentLabel(rows: CoaRow[], parentId: string | null): string {
  if (!parentId) return "";
  const p = rows.find((r) => r.id === parentId);
  return p ? `${p.code}  ${p.name}` : "";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("coa");
  const [journalEditorOpen, setJournalEditorOpen] = useState(false);
  const [functionalCurrency, setFunctionalCurrency] = useState("USD");
  const [coaRows, setCoaRows] = useState<CoaRow[]>([]);
  const [coaLoading, setCoaLoading] = useState(false);
  const [coaError, setCoaError] = useState<string | null>(null);
  const [coaModal, setCoaModal] = useState<"add" | { edit: CoaRow } | null>(null);
  const [coaDetail, setCoaDetail] = useState<CoaRow | null>(null);
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
  });

  const [coaDetailTab, setCoaDetailTab] = useState<"overview" | "transactions">("overview");

  const [openingSub, setOpeningSub] = useState<null | "trial" | "customer" | "vendor" | "inventory">(null);

  const [jeDate, setJeDate] = useState("");
  const [jeRef, setJeRef] = useState("");
  const [jeMemo, setJeMemo] = useState("");
  const [jeSaving, setJeSaving] = useState(false);
  const [jeError, setJeError] = useState<string | null>(null);
  const [postableAccounts, setPostableAccounts] = useState<GlAccountDto[]>([]);
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

  async function refreshCoa() {
    setCoaLoading(true);
    setCoaError(null);
    try {
      const iso = todayIso || new Date().toISOString().slice(0, 10);
      const rows = await listGlAccounts(iso);
      setCoaRows(rows.map(mapDtoToCoaRow));
    } catch (e) {
      setCoaError(e instanceof Error ? e.message : "Could not load chart of accounts");
    } finally {
      setCoaLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "coa") return;
    void refreshCoa();
  }, [tab, todayIso]);

  useEffect(() => {
    if (tab !== "journal_list") return;
    let cancelled = false;
    (async () => {
      setJournalsLoading(true);
      try {
        const list = await listJournalEntries();
        if (cancelled) return;
        setJournalRows(mapJournalSummaries(list));
      } catch {
        if (!cancelled) setJournalRows([]);
      } finally {
        if (!cancelled) setJournalsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, journalEditorOpen]);

  useEffect(() => {
    if (!journalEditorOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await listPostableGlAccounts();
        if (!cancelled) setPostableAccounts(p);
      } catch {
        if (!cancelled) setPostableAccounts([]);
      }
    })();
    return () => {
      cancelled = true;
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
    if (tab !== "coa") return;
    let cancelled = false;
    (async () => {
      setGlPostingLoad(true);
      setGlPostingErr(null);
      try {
        const [s, acc] = await Promise.all([getGlSettings(), listPostableGlAccounts()]);
        if (!cancelled) {
          setGlPostingSettings(s);
          setGlPostingAccounts(acc);
        }
      } catch (e) {
        if (!cancelled) setGlPostingErr(e instanceof Error ? e.message : "Could not load GL settings");
      } finally {
        if (!cancelled) setGlPostingLoad(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

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

  const jeBalanced = useMemo(() => {
    const d = jeLines.reduce((s, l) => s + l.debit, 0);
    const c = jeLines.reduce((s, l) => s + l.credit, 0);
    return { debit: d, credit: c, ok: Math.abs(d - c) < 0.005 };
  }, [jeLines]);

  function openCoaAdd() {
    const suggest = `9${Date.now().toString().slice(-4)}`;
    setCoaForm({
      code: suggest,
      name: "",
      type: "Asset",
      parentId: "none",
      isGroup: false,
      allowTransactions: true,
      status: "Active",
    });
    setCoaModal("add");
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
    });
    setCoaModal({ edit: row });
  }

  async function saveCoa(andNew?: boolean) {
    if (!coaForm.code.trim() || !coaForm.name.trim()) return;
    const parentId = coaForm.parentId === "none" ? null : coaForm.parentId;
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
        });
      } else if (coaModal && typeof coaModal === "object") {
        await updateGlAccount(coaModal.edit.id, {
          name: coaForm.name.trim(),
          parent_id: parentId,
          is_group: coaForm.isGroup,
          allow_posting: coaForm.allowTransactions,
          is_active: coaForm.status === "Active",
        });
      }
      await refreshCoa();
      if (andNew) {
        openCoaAdd();
      } else {
        setCoaModal(null);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function deactivateCoa(row: CoaRow) {
    if (!window.confirm(`Deactivate account ${row.code}? It will be hidden from new postings.`)) return;
    try {
      await updateGlAccount(row.id, { is_active: false });
      await refreshCoa();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed");
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

  function openNewJournal() {
    setJeError(null);
    setJeRef(`JE-${Date.now().toString().slice(-8)}`);
    setJeMemo("");
    setJeLines([
      { id: `j-${Date.now()}-a`, accountId: "", lineDesc: "", debit: 0, credit: 0 },
      { id: `j-${Date.now()}-b`, accountId: "", lineDesc: "", debit: 0, credit: 0 },
    ]);
    setJournalEditorOpen(true);
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
      await createJournalEntry({
        entry_date: jeDate,
        reference: jeRef.trim(),
        memo: jeMemo,
        tag: "",
        lines,
      });
      setJournalEditorOpen(false);
      if (tab === "journal_list") {
        const list = await listJournalEntries();
        setJournalRows(mapJournalSummaries(list));
      }
    } catch (e) {
      setJeError(e instanceof Error ? e.message : "Could not save journal");
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
      const draft = await createJournalEntry({
        entry_date: jeDate,
        reference: jeRef.trim(),
        memo: jeMemo,
        tag: "",
        lines,
      });
      await postJournalEntry(draft.id);
      setJournalEditorOpen(false);
      const list = await listJournalEntries();
      setJournalRows(mapJournalSummaries(list));
    } catch (e) {
      setJeError(e instanceof Error ? e.message : "Could not post journal");
    } finally {
      setJeSaving(false);
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
      setJournalViewerError(e instanceof Error ? e.message : "Could not load journal");
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
        purchase_receipt_mode: glPostingSettings.purchase_receipt_mode,
        auto_post_purchase_lots: glPostingSettings.auto_post_purchase_lots,
      });
      setGlPostingSettings(updated);
      setFunctionalCurrency(updated.functional_currency || "USD");
    } catch (e) {
      setGlPostingErr(e instanceof Error ? e.message : "Could not save GL settings");
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
      setJournalViewerOpen(false);
      setJournalViewerDetail(null);
      if (tab === "journal_list") {
        const list = await listJournalEntries();
        setJournalRows(mapJournalSummaries(list));
      }
    } catch (e) {
      setJournalViewerError(e instanceof Error ? e.message : "Could not create reversal draft");
    } finally {
      setJournalReversalBusy(false);
    }
  }

  const selectedBank = bankCards.find((b) => b.id === bankDetailId) ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <div className="flex flex-wrap gap-1">
          <span className="w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)] sm:w-auto">Setup</span>
          {TABS.filter((t) => t.group === "setup").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pushTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                tab === t.id ? "bg-[var(--gs-accent)] text-white" : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 border-t border-[var(--gs-border)] pt-2 sm:border-t-0 sm:pt-0">
          <span className="w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)] sm:w-auto">Transactions</span>
          {TABS.filter((t) => t.group === "transactions").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pushTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                tab === t.id ? "bg-[var(--gs-accent)] text-white" : "text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "coa" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Chart of accounts</h2>
              <p className="mt-0.5 text-sm text-[var(--gs-muted)]">
                Balances are running totals from <strong>posted</strong> journals (as of today). Group accounts are for structure only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                title="Coming later"
                className="cursor-not-allowed rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-muted)] opacity-50"
              >
                Import
              </button>
              <button
                type="button"
                disabled
                title="Coming later"
                className="cursor-not-allowed rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-muted)] opacity-50"
              >
                Export
              </button>
              <button
                type="button"
                onClick={openCoaAdd}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
              >
                + New account
              </button>
            </div>
          </div>
          {coaError ? (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950">{coaError}</div>
          ) : null}
          {coaLoading ? (
            <div className="border-b border-[var(--gs-border)]">
              <LoadingBlock label="Loading chart of accounts…" className="py-10" />
            </div>
          ) : null}
          <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[180px] flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Search</label>
              <input
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder="Code or name"
                className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account type</label>
              <select
                value={coaTypeFilter}
                onChange={(e) => setCoaTypeFilter(e.target.value as AccountType | "All")}
                className="mt-1 rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              >
                <option value="All">All</option>
                <option>Asset</option>
                <option>Liability</option>
                <option>Equity</option>
                <option>Revenue</option>
                <option>Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Status</label>
              <select
                value={coaStatusFilter}
                onChange={(e) => setCoaStatusFilter(e.target.value as typeof coaStatusFilter)}
                className="mt-1 rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
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
          <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-5 py-3">Account code</th>
                  <th className="px-5 py-3">Account name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Parent</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gs-border)]">
                {coaFiltered.map((row) => {
                  const depth = coaDepth(coaRows, row.id);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-[var(--gs-hover)]/80"
                      onClick={() => {
                        setCoaDetailTab("overview");
                        setCoaDetail(row);
                      }}
                    >
                      <td className="px-5 py-3 font-mono text-[var(--gs-text)]">{row.code}</td>
                      <td className="px-5 py-3 text-[var(--gs-text)]">
                        <span style={{ paddingLeft: `${depth * 16}px` }} className="inline-block">
                          {depth > 0 ? <span className="mr-2 text-[var(--gs-muted)]">└</span> : null}
                          {row.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[var(--gs-muted)]">{row.type}</td>
                      <td className="px-5 py-3 text-[var(--gs-muted)]">{parentLabel(coaRows, row.parentId)}</td>
                      <td className="px-5 py-3 text-right font-mono text-[var(--gs-text)]">{formatMoney(row.balance, functionalCurrency)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                            row.status === "Active"
                              ? "bg-emerald-50 text-[var(--gs-text)] ring-emerald-100"
                              : "bg-[var(--gs-hover)] text-[var(--gs-muted)] ring-[var(--gs-border)]"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <RowActionsMenu
                            actions={[
                              { label: "View / edit", onSelect: () => openCoaEdit(row), tone: "accent" },
                              { label: "Deactivate", onSelect: () => deactivateCoa(row), tone: "danger" },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[var(--gs-border)] p-5">
            <h3 className="text-base font-bold text-[var(--gs-text)]">Purchase lot posting (GL)</h3>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">
              Map system roles to chart accounts. Receipts and payments post automatically when enabled.
            </p>
            {glPostingErr ? <p className="mt-2 text-sm text-red-700">{glPostingErr}</p> : null}
            {glPostingLoad || !glPostingSettings ? (
              <p className="mt-3 text-sm text-[var(--gs-muted)]">Loading settings…</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Functional currency</span>
                  <input
                    value={glPostingSettings.functional_currency}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, functional_currency: e.target.value.toUpperCase().slice(0, 3) } : p))
                    }
                    maxLength={3}
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Receipt mode</span>
                  <select
                    value={glPostingSettings.purchase_receipt_mode}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, purchase_receipt_mode: e.target.value } : p))
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
                  >
                    <option value="inventory">Debit inventory</option>
                    <option value="expense">Debit purchases (expense)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-3">
                  <input
                    type="checkbox"
                    checked={glPostingSettings.auto_post_purchase_lots}
                    onChange={(e) =>
                      setGlPostingSettings((p) => (p ? { ...p, auto_post_purchase_lots: e.target.checked } : p))
                    }
                  />
                  Auto-post purchase receipts and payments to the general ledger
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
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
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
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
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
                    className="mt-1 w-full rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
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
                    className="mt-1 w-full max-w-md rounded-xl border border-[var(--gs-border)] px-3 py-2 text-sm"
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
                <div className="sm:col-span-2 lg:col-span-3">
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
            <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-100">
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
              if (window.confirm("Are you sure? This action cannot be undone (demo).")) window.alert("Opening locked (demo).");
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
            <button
              type="button"
              onClick={() => openNewJournal()}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm"
            >
              + New journal entry
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm">
            {journalsLoading ? (
              <LoadingBlock label="Loading journal entries…" className="py-12" />
            ) : (
              <div className="overflow-x-auto">
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
                      <th className="px-4 py-3 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gs-border)]">
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
                            <button
                              type="button"
                              onClick={() => void openJournalViewer(j.id)}
                              className="rounded-lg border border-[var(--gs-border)] px-3 py-1 text-xs font-semibold text-[var(--gs-accent)] hover:bg-[var(--gs-hover)]"
                            >
                              View lines
                            </button>
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
          <div className="my-4 min-h-[min(100dvh-2rem,900px)] w-full max-w-5xl rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--gs-text)]">New journal entry</h2>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">
                  Choose a posting account per line. Each line is either a debit or a credit — totals must match before you post.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJournalEditorOpen(false)}
                className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
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
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  <tr>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Line description</th>
                    <th className="py-2 pr-4 text-right">Debit</th>
                    <th className="py-2 pr-4 text-right">Credit</th>
                    <th className="py-2 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gs-border)]">
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
                jeBalanced.ok ? "border-emerald-200 bg-emerald-50/80" : "border-amber-200 bg-amber-50/80"
              }`}
            >
              <span>
                Total debit: <strong>{formatMoney(jeBalanced.debit, functionalCurrency)}</strong> · Total credit:{" "}
                <strong>{formatMoney(jeBalanced.credit, functionalCurrency)}</strong>
                {!jeBalanced.ok ? (
                  <span className="ml-2 text-amber-800">
                    · Difference {formatMoney(Math.abs(jeBalanced.debit - jeBalanced.credit), functionalCurrency)}
                  </span>
                ) : null}
              </span>
              <span className={jeBalanced.ok ? "font-semibold text-[var(--gs-text)]" : "font-semibold text-amber-800"}>
                {jeBalanced.ok ? "Balanced" : "Not balanced"}
              </span>
            </div>
            <p className="mt-6 border-t border-[var(--gs-border)] pt-4 text-xs text-[var(--gs-muted)]">
              Drafts must still be <strong>balanced</strong>. Attachments and approval workflows are not enabled in this build.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={jeSaving || !jeBalanced.ok}
                onClick={() => void saveJournalDraft()}
                className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {jeSaving ? "Saving…" : "Save balanced draft"}
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
                onClick={() => setJournalEditorOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {coaDetail ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--gs-text)]">{coaDetail.name}</h3>
                <p className="mt-1 font-mono text-sm text-[var(--gs-muted)]">{coaDetail.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setCoaDetail(null)}
                className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]"
                aria-label="Close drawer"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between border-b border-[var(--gs-border)] py-2">
                <span className="text-[var(--gs-muted)]">Type</span>
                <span className="font-semibold text-[var(--gs-text)]">{coaDetail.type}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--gs-border)] py-2">
                <span className="text-[var(--gs-muted)]">Parent</span>
                <span className="font-semibold text-[var(--gs-text)]">{parentLabel(coaRows, coaDetail.parentId)}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--gs-border)] py-2">
                <span className="text-[var(--gs-muted)]">Balance</span>
                <span className="font-mono font-semibold text-[var(--gs-text)]">{formatMoney(coaDetail.balance, functionalCurrency)}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--gs-border)] py-2">
                <span className="text-[var(--gs-muted)]">Status</span>
                <span className="font-semibold text-[var(--gs-text)]">{coaDetail.status}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-2 border-b border-[var(--gs-border)] pb-4">
              <button
                type="button"
                onClick={() => setCoaDetailTab("overview")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  coaDetailTab === "overview" ? "border border-[var(--gs-border)] bg-[var(--gs-hover)] text-[var(--gs-text)]" : "text-[var(--gs-muted)]"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setCoaDetailTab("transactions")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  coaDetailTab === "transactions" ? "border border-[var(--gs-border)] bg-[var(--gs-hover)] text-[var(--gs-text)]" : "text-[var(--gs-muted)]"
                }`}
              >
                Transactions
              </button>
            </div>
            {coaDetailTab === "overview" ? (
              <button
                type="button"
                onClick={() => {
                  openCoaEdit(coaDetail);
                  setCoaDetail(null);
                }}
                className="mt-6 w-full rounded-full bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Edit account
              </button>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4 text-sm text-[var(--gs-muted)]">
                Account activity by voucher will appear here in a future update. Use <strong>Journal entries</strong> for posted
                detail today.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {coaModal ? (
        <div className="fixed inset-0 z-[55] flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--gs-border)] bg-[var(--gs-card)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--gs-border)] p-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--gs-text)]">{coaModal === "add" ? "New account" : "Edit account"}</h3>
                <p className="mt-1 text-xs text-[var(--gs-muted)]">Right drawer  doc layout</p>
              </div>
              <button type="button" onClick={() => setCoaModal(null)} className="rounded-full p-2 text-[var(--gs-muted)] hover:bg-[var(--gs-hover)]" aria-label="Close">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 space-y-4 p-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account name *</label>
                <input
                  value={coaForm.name}
                  onChange={(e) => setCoaForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account code (auto, editable)</label>
                <input
                  value={coaForm.code}
                  readOnly={coaModal !== "add"}
                  onChange={(e) => setCoaForm((f) => ({ ...f, code: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 font-mono text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2 read-only:bg-[var(--gs-hover)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Account type *</label>
                <select
                  value={coaForm.type}
                  onChange={(e) => setCoaForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option>Asset</option>
                  <option>Liability</option>
                  <option>Equity</option>
                  <option>Revenue</option>
                  <option>Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Parent account</label>
                <select
                  value={coaForm.parentId}
                  onChange={(e) => setCoaForm((f) => ({ ...f, parentId: e.target.value as string | "none" }))}
                  className="mt-2 w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm text-[var(--gs-text)] outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option value="none"> None (top level) </option>
                  {coaRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}  {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/80 p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--gs-text)]">
                  <input
                    type="checkbox"
                    checked={coaForm.isGroup}
                    onChange={(e) => setCoaForm((f) => ({ ...f, isGroup: e.target.checked }))}
                    className="rounded border-[var(--gs-border-strong)]"
                  />
                  Is group account
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--gs-text)]">
                  <input
                    type="checkbox"
                    checked={coaForm.allowTransactions}
                    onChange={(e) => setCoaForm((f) => ({ ...f, allowTransactions: e.target.checked }))}
                    className="rounded border-[var(--gs-border-strong)]"
                  />
                  Allow transactions
                </label>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Status</span>
                  <select
                    value={coaForm.status}
                    onChange={(e) => setCoaForm((f) => ({ ...f, status: e.target.value as "Active" | "Inactive" }))}
                    className="mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <p className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-hover)]/60 px-4 py-3 text-xs text-[var(--gs-muted)]">
                Opening balances are recorded with <strong>journal entries</strong>, not on this form. Balances in the list update
                when you post.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--gs-border)] p-6">
              <button type="button" onClick={() => setCoaModal(null)} className="rounded-full border border-[var(--gs-border)] px-4 py-2.5 text-sm font-semibold text-[var(--gs-text)]">
                Cancel
              </button>
              <button type="button" onClick={() => saveCoa(false)} className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white">
                Save
              </button>
              <button
                type="button"
                onClick={() => saveCoa(true)}
                className="rounded-full border border-orange-200 bg-[var(--gs-accent-soft)] px-5 py-2.5 text-sm font-semibold text-orange-900"
              >
                Save &amp; new
              </button>
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
              <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gs-border)]">
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
              <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Invoice ref</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
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
              <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Bill ref</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
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
                <div className="overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
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
                  <thead className="text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gs-border)]">
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
                  window.alert("Demo: bank saved");
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
              <button type="button" onClick={() => window.alert("Demo: preview rows")} className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
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
                  window.alert("Demo: transfer recorded");
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
                <thead>
                  <tr className="text-xs text-[var(--gs-muted)]">
                    <th className="py-1" aria-label="Select" />
                    <th>Date</th>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
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
                <thead>
                  <tr className="text-xs text-[var(--gs-muted)]">
                    <th className="py-1" aria-label="Select" />
                    <th>Date</th>
                    <th>Reference</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
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
              onClick={() => {
                setJournalViewerOpen(false);
                setJournalViewerDetail(null);
                setJournalViewerError(null);
              }}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
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
            <div className="overflow-x-auto rounded-lg border border-[var(--gs-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                  <tr>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gs-border)]">
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