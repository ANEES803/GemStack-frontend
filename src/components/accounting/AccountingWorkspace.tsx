"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { DEMO_REVENUE_ACCOUNTS, revenueAccountLabel } from "@/lib/demoRevenueAccounts";
import { formatMoney } from "@/lib/format";
import { loadServiceItemsForSelect, type StoredItemRow } from "@/lib/itemCatalogStorage";
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
};

const INITIAL_COA: CoaRow[] = [
  { id: "1", code: "1000", name: "Assets", type: "Asset", parentId: null, balance: 0, status: "Active" },
  { id: "2", code: "1100", name: "Cash — PKR", type: "Asset", parentId: "1", balance: 125000, status: "Active" },
  { id: "3", code: "1200", name: "Accounts receivable", type: "Asset", parentId: "1", balance: 48200, status: "Active" },
  { id: "4", code: "1300", name: "Inventory — Grade A", type: "Asset", parentId: "1", balance: 960000, status: "Active" },
  { id: "5", code: "2000", name: "Liabilities", type: "Liability", parentId: null, balance: 0, status: "Active" },
  { id: "6", code: "2100", name: "Accounts payable", type: "Liability", parentId: "5", balance: 31000, status: "Active" },
  { id: "7", code: "2200", name: "FEP commission payable", type: "Liability", parentId: "5", balance: 4500, status: "Active" },
  { id: "8", code: "4000", name: "Sales revenue", type: "Revenue", parentId: null, balance: 0, status: "Active" },
  { id: "9", code: "5000", name: "Cost of sales", type: "Expense", parentId: null, balance: 0, status: "Active" },
  { id: "10", code: "5100", name: "Commission expense", type: "Expense", parentId: null, balance: 0, status: "Active" },
];

function coaDepth(rows: CoaRow[], id: string): number {
  const row = rows.find((r) => r.id === id);
  if (!row || row.parentId === null) return 0;
  return 1 + coaDepth(rows, row.parentId);
}

function parentLabel(rows: CoaRow[], parentId: string | null): string {
  if (!parentId) return "—";
  const p = rows.find((r) => r.id === parentId);
  return p ? `${p.code} — ${p.name}` : "—";
}

const VALID_TABS = new Set<TabId>(TABS.map((t) => t.id));

export function AccountingWorkspace() {
  const todayIso = useHydratedTodayIso();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>("coa");
  const [journalEditorOpen, setJournalEditorOpen] = useState(false);
  const [jeListView, setJeListView] = useState<"list" | "recurring" | "approval">("list");

  const [coaRows, setCoaRows] = useState<CoaRow[]>(INITIAL_COA);
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
    openingBalance: "",
    openingDate: "",
    status: "Active" as "Active" | "Inactive",
  });

  const [coaDetailTab, setCoaDetailTab] = useState<"overview" | "transactions">("overview");

  const [openingSub, setOpeningSub] = useState<null | "trial" | "customer" | "vendor" | "inventory">(null);

  const [jeDate, setJeDate] = useState("");
  const [jeRef, setJeRef] = useState("JE-015");
  const [jeMemo, setJeMemo] = useState("Month-end accrual — demo");
  const [jeTag, setJeTag] = useState("");
  const [jeLines, setJeLines] = useState([
    { id: "j1", account: "5100 — Commission expense", lineDesc: "", debit: 450, credit: 0 },
    { id: "j2", account: "2200 — FEP commission payable", lineDesc: "", debit: 0, credit: 450 },
  ]);
  const [journalServiceCatalog, setJournalServiceCatalog] = useState<StoredItemRow[]>([]);
  const [jeServiceSelectSeq, setJeServiceSelectSeq] = useState(0);

  const [journalRows] = useState([
    { id: "JE-2026-014", date: "2026-03-28", ref: "JE-014", desc: "Month-end accrual", amount: 450, status: "Posted" as const, by: "A. Khan" },
    { id: "JE-2026-013", date: "2026-03-20", ref: "JE-013", desc: "Bank charges", amount: 120, status: "Draft" as const, by: "S. Noor" },
  ]);

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
    { key: "trial" as const, title: "Opening trial balance", status: "Pending" as const, updated: "—" },
    { key: "customer" as const, title: "Customer opening", status: "Done" as const, updated: "2026-03-01" },
    { key: "vendor" as const, title: "Vendor opening", status: "Pending" as const, updated: "—" },
    { key: "inventory" as const, title: "Inventory opening", status: "Pending" as const, updated: "—" },
  ];

  useEffect(() => {
    if (!todayIso) return;
    setJeDate((p) => p || todayIso);
    setCoaForm((f) => ({ ...f, openingDate: f.openingDate || todayIso }));
  }, [todayIso]);

  useEffect(() => {
    if (!journalEditorOpen) return;
    setJournalServiceCatalog(loadServiceItemsForSelect());
  }, [journalEditorOpen]);

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
      openingBalance: "",
      openingDate: todayIso || "",
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
      isGroup: false,
      allowTransactions: true,
      openingBalance: String(row.balance),
      openingDate: todayIso || "",
      status: row.status,
    });
    setCoaModal({ edit: row });
  }

  function saveCoa(andNew?: boolean) {
    if (!coaForm.code.trim() || !coaForm.name.trim()) return;
    const parentId = coaForm.parentId === "none" ? null : coaForm.parentId;
    const ob = parseFloat(coaForm.openingBalance) || 0;
    if (coaModal === "add") {
      const id = `n-${Date.now()}`;
      setCoaRows((prev) => [
        ...prev,
        {
          id,
          code: coaForm.code.trim(),
          name: coaForm.name.trim(),
          type: coaForm.type,
          parentId,
          balance: ob,
          status: coaForm.status,
        },
      ]);
    } else if (coaModal && typeof coaModal === "object") {
      const { id } = coaModal.edit;
      setCoaRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                code: coaForm.code.trim(),
                name: coaForm.name.trim(),
                type: coaForm.type,
                parentId,
                balance: ob,
                status: coaForm.status,
              }
            : r,
        ),
      );
    }
    if (andNew) {
      openCoaAdd();
    } else {
      setCoaModal(null);
    }
  }

  function deleteCoa(row: CoaRow) {
    if (!window.confirm(`Remove account ${row.code} from list? (SRS: production uses soft delete.)`)) return;
    setCoaRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function addJeLine() {
    setJeLines((prev) => [...prev, { id: `j-${Date.now()}`, account: "", lineDesc: "", debit: 0, credit: 0 }]);
  }

  function updateJeLine(id: string, patch: Partial<(typeof jeLines)[0]>) {
    setJeLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeJeLine(id: string) {
    setJeLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.id !== id)));
  }

  const selectedBank = bankCards.find((b) => b.id === bankDetailId) ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gs-border)] bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <div className="flex flex-wrap gap-1">
          <span className="w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:w-auto">Setup</span>
          {TABS.filter((t) => t.group === "setup").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pushTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                tab === t.id ? "bg-[var(--gs-navy)] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
          <span className="w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:w-auto">Transactions</span>
          {TABS.filter((t) => t.group === "transactions").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pushTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                tab === t.id ? "bg-[var(--gs-accent)] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "coa" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-navy)]">Chart of accounts</h2>
              <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Account code, parent, balance, status — row opens detail drawer.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.alert("Demo: import COA")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Import
              </button>
              <button
                type="button"
                onClick={() => window.alert("Demo: export COA")}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[180px] flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Search</label>
              <input
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder="Code or name"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Account type</label>
              <select
                value={coaTypeFilter}
                onChange={(e) => setCoaTypeFilter(e.target.value as AccountType | "All")}
                className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
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
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</label>
              <select
                value={coaStatusFilter}
                onChange={(e) => setCoaStatusFilter(e.target.value as typeof coaStatusFilter)}
                className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
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
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:mb-0.5"
            >
              Reset filters
            </button>
          </div>
          <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
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
              <tbody className="divide-y divide-slate-100">
                {coaFiltered.map((row) => {
                  const depth = coaDepth(coaRows, row.id);
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() => {
                        setCoaDetailTab("overview");
                        setCoaDetail(row);
                      }}
                    >
                      <td className="px-5 py-3 font-mono text-slate-800">{row.code}</td>
                      <td className="px-5 py-3 text-slate-700">
                        <span style={{ paddingLeft: `${depth * 16}px` }} className="inline-block">
                          {depth > 0 ? <span className="mr-2 text-slate-300">â””</span> : null}
                          {row.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{row.type}</td>
                      <td className="px-5 py-3 text-slate-600">{parentLabel(coaRows, row.parentId)}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-800">{formatMoney(row.balance, "PKR")}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                            row.status === "Active"
                              ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                              : "bg-slate-100 text-slate-600 ring-slate-200"
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
                              { label: "Delete account", onSelect: () => deleteCoa(row), tone: "danger" },
                              { label: "View ledger" },
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
        </section>
      )}

      {tab === "opening" && (
        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-navy)]">Opening balances</h2>
              <p className="text-sm text-[var(--gs-muted)]">Complete each section, then finalize — front-end demo only.</p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-100">
              {openingStatus}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {openingCards.map((c) => (
              <div key={c.key} className="rounded-2xl border border-[var(--gs-border)] bg-white p-4 shadow-sm">
                <p className="font-bold text-[var(--gs-navy)]">{c.title}</p>
                <p className="mt-2 text-xs text-[var(--gs-muted)]">
                  Status: <span className="font-semibold text-slate-700">{c.status}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Last updated: {c.updated}</p>
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
            className="rounded-full bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white opacity-50"
            disabled
          >
            Finalize &amp; lock opening
          </button>
        </section>
      )}


      {tab === "journal_list" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-navy)]">Journal entries</h2>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">List, recurring templates, and approval queue — full entry opens full-screen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setJournalEditorOpen(true)}
                className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm"
              >
                + New journal entry
              </button>
              <button
                type="button"
                onClick={() => setJeListView("list")}
                className={`rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${
                  jeListView === "list" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Journal list
              </button>
              <button
                type="button"
                onClick={() => setJeListView("recurring")}
                className={`rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${
                  jeListView === "recurring" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Recurring journals
              </button>
              <button
                type="button"
                onClick={() => setJeListView("approval")}
                className={`rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${
                  jeListView === "approval" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Approval queue
              </button>
            </div>
          </div>

          {jeListView === "list" && (
            <div className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
              <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
                <input
                  placeholder="Search ref / description"
                  className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
                <input type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option>All statuses</option>
                  <option>Draft</option>
                  <option>Posted</option>
                  <option>Approved</option>
                </select>
                <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" aria-label="Created by">
                  <option>Created by (all)</option>
                  <option>A. Khan</option>
                  <option>S. Noor</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created by</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalRows.map((j) => (
                      <tr key={j.id} className="cursor-pointer hover:bg-slate-50/80" onClick={() => window.alert(`Demo: open ${j.ref}`)}>
                        <td className="px-4 py-3 text-slate-700">{j.date}</td>
                        <td className="px-4 py-3 font-mono text-slate-900">{j.ref}</td>
                        <td className="px-4 py-3 text-slate-700">{j.desc}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatMoney(j.amount, "PKR")}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
                            {j.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{j.by}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowActionsMenu actions={[{ label: "View", tone: "accent" }, { label: "Edit" }]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {jeListView === "recurring" && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-700">
              <p className="font-bold text-[var(--gs-navy)]">Recurring journal templates</p>
              <p className="mt-2 text-[var(--gs-muted)]">Rent, salaries, depreciation — same line layout as manual journals.</p>
              <button type="button" className="mt-4 text-sm font-semibold text-[var(--gs-accent)] hover:underline">
                + Create template (demo)
              </button>
            </div>
          )}

          {jeListView === "approval" && (
            <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-6 shadow-sm">
              <h3 className="font-bold text-[var(--gs-navy)]">Approval queue</h3>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">Drafts awaiting manager sign-off.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Ref</th>
                      <th className="py-2 pr-4 text-right">Amount</th>
                      <th className="py-2 pr-4">Created by</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 text-slate-700">2026-03-20</td>
                      <td className="py-3 font-mono">JE-013</td>
                      <td className="py-3 text-right">{formatMoney(120, "PKR")}</td>
                      <td className="py-3 text-slate-600">S. Noor</td>
                      <td className="py-3">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
                          Draft
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button type="button" className="mr-2 text-xs font-semibold text-emerald-700 hover:underline">
                          Approve
                        </button>
                        <button type="button" className="text-xs font-semibold text-slate-600 hover:underline">
                          Reject
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "banking" && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-navy)]">Banking</h2>
              <p className="text-sm text-[var(--gs-muted)]">Bank cards, statements, reconciliation, transfers.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setBankAddOpen(true)} className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white">
                + Add bank account
              </button>
              <button type="button" onClick={() => setBankImportOpen(true)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
                Import statement
              </button>
              <button type="button" onClick={() => setBankTransferOpen(true)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
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
                className="rounded-2xl border border-[var(--gs-border)] bg-white p-5 text-left shadow-sm transition hover:border-[var(--gs-accent)]"
              >
                <p className="text-lg font-bold text-[var(--gs-navy)]">{b.bank}</p>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">Account ·••• {b.last4}</p>
                <p className="mt-4 text-2xl font-black text-slate-900">{formatMoney(b.balance, "PKR")}</p>
                <p className="mt-2 text-xs text-slate-500">Last reconciled: {b.recon}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {journalEditorOpen ? (
        <div className="fixed inset-0 z-[60] flex min-h-[100dvh] items-start justify-center overflow-y-auto bg-slate-900/45 p-4">
          <div className="my-4 min-h-[min(100dvh-2rem,900px)] w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--gs-navy)]">New journal entry</h2>
                <p className="mt-1 text-sm text-[var(--gs-muted)]">Full-page editor — debits must equal credits before post.</p>
              </div>
              <button
                type="button"
                onClick={() => setJournalEditorOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date *</label>
                <input
                  type="date"
                  value={jeDate}
                  onChange={(e) => setJeDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Reference no *</label>
                <input
                  value={jeRef}
                  onChange={(e) => setJeRef(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
                <input
                  value={jeMemo}
                  onChange={(e) => setJeMemo(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
            </div>
            {journalServiceCatalog.length > 0 ? (
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Revenue — quick add from service catalog
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Adds a credit line to the service&apos;s income account (Inventory → Service catalog). Balance with a debit (e.g. cash or AR).
                </p>
                <select
                  key={jeServiceSelectSeq}
                  defaultValue=""
                  className="mt-2 w-full max-w-xl rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) return;
                    const s = journalServiceCatalog.find((x) => x.id === id);
                    if (!s) return;
                    const acc =
                      DEMO_REVENUE_ACCOUNTS.find((a) => a.id === s.revenueAccountId) ?? DEMO_REVENUE_ACCOUNTS[0];
                    setJeServiceSelectSeq((n) => n + 1);
                    setJeLines((prev) => [
                      ...prev,
                      {
                        id: `j-${Date.now()}`,
                        account: `${acc.code} — ${acc.name}`,
                        lineDesc: s.itemName,
                        debit: 0,
                        credit: s.rate,
                      },
                    ]);
                  }}
                >
                  <option value="">Select service to add credit line…</option>
                  {journalServiceCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.itemName} — {formatMoney(s.rate, "PKR")} (→ {revenueAccountLabel(s.revenueAccountId)})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Line description</th>
                    <th className="py-2 pr-4 text-right">Debit</th>
                    <th className="py-2 pr-4 text-right">Credit</th>
                    <th className="py-2 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jeLines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 pr-4">
                        <input
                          value={l.account}
                          onChange={(e) => updateJeLine(l.id, { account: e.target.value })}
                          className="w-full min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Account"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          value={l.lineDesc}
                          onChange={(e) => updateJeLine(l.id, { lineDesc: e.target.value })}
                          className="w-full min-w-[140px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Optional"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          value={l.debit || ""}
                          onChange={(e) => updateJeLine(l.id, { debit: Number(e.target.value), credit: 0 })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-right"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          value={l.credit || ""}
                          onChange={(e) => updateJeLine(l.id, { credit: Number(e.target.value), debit: 0 })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-right"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeJeLine(l.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"
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
                Total debit: <strong>{formatMoney(jeBalanced.debit, "PKR")}</strong> · Total credit:{" "}
                <strong>{formatMoney(jeBalanced.credit, "PKR")}</strong>
                {!jeBalanced.ok ? (
                  <span className="ml-2 text-amber-800">
                    · Difference {formatMoney(Math.abs(jeBalanced.debit - jeBalanced.credit), "PKR")}
                  </span>
                ) : null}
              </span>
              <span className={jeBalanced.ok ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
                {jeBalanced.ok ? "Balanced" : "Not balanced"}
              </span>
            </div>
            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Attachments</label>
                <button
                  type="button"
                  onClick={() => window.alert("Demo: upload supporting document")}
                  className="mt-2 w-full rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm font-semibold text-slate-600 hover:border-[var(--gs-accent)] hover:text-[var(--gs-accent)]"
                >
                  Upload file (invoice, proof)
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Tag (optional)</label>
                <input
                  value={jeTag}
                  onChange={(e) => setJeTag(e.target.value)}
                  placeholder="e.g. Adjustment, Salary"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
                Save as draft
              </button>
              <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
                Submit for approval
              </button>
              <button
                type="button"
                disabled={!jeBalanced.ok}
                onClick={() => (jeBalanced.ok ? window.alert("Demo: journal posted.") : undefined)}
                className="rounded-full bg-[var(--gs-navy)] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Post directly
              </button>
              <button type="button" onClick={() => setJournalEditorOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {coaDetail ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--gs-navy)]">{coaDetail.name}</h3>
                <p className="mt-1 font-mono text-sm text-slate-600">{coaDetail.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setCoaDetail(null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close drawer"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold text-slate-900">{coaDetail.type}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">Parent</span>
                <span className="font-semibold text-slate-900">{parentLabel(coaRows, coaDetail.parentId)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">Balance</span>
                <span className="font-mono font-semibold text-slate-900">{formatMoney(coaDetail.balance, "PKR")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-900">{coaDetail.status}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-2 border-b border-slate-100 pb-4">
              <button
                type="button"
                onClick={() => setCoaDetailTab("overview")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  coaDetailTab === "overview" ? "border border-slate-200 bg-slate-50 text-slate-900" : "text-slate-500"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setCoaDetailTab("transactions")}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  coaDetailTab === "transactions" ? "border border-slate-200 bg-slate-50 text-slate-900" : "text-slate-500"
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
              <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-[var(--gs-muted)]">
                No posted lines yet — connect ledger API for activity by account.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {coaModal ? (
        <div className="fixed inset-0 z-[55] flex justify-end bg-slate-900/35">
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--gs-navy)]">{coaModal === "add" ? "New account" : "Edit account"}</h3>
                <p className="mt-1 text-xs text-[var(--gs-muted)]">Right drawer — doc layout</p>
              </div>
              <button type="button" onClick={() => setCoaModal(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 space-y-4 p-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Account name *</label>
                <input
                  value={coaForm.name}
                  onChange={(e) => setCoaForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Account code (auto, editable)</label>
                <input
                  value={coaForm.code}
                  onChange={(e) => setCoaForm((f) => ({ ...f, code: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Account type *</label>
                <select
                  value={coaForm.type}
                  onChange={(e) => setCoaForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option>Asset</option>
                  <option>Liability</option>
                  <option>Equity</option>
                  <option>Revenue</option>
                  <option>Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Parent account</label>
                <select
                  value={coaForm.parentId}
                  onChange={(e) => setCoaForm((f) => ({ ...f, parentId: e.target.value as string | "none" }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option value="none">— None (top level) —</option>
                  {coaRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={coaForm.isGroup}
                    onChange={(e) => setCoaForm((f) => ({ ...f, isGroup: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  Is group account
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={coaForm.allowTransactions}
                    onChange={(e) => setCoaForm((f) => ({ ...f, allowTransactions: e.target.checked }))}
                    className="rounded border-slate-300"
                  />
                  Allow transactions
                </label>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</span>
                  <select
                    value={coaForm.status}
                    onChange={(e) => setCoaForm((f) => ({ ...f, status: e.target.value as "Active" | "Inactive" }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Opening balance</label>
                  <input
                    type="number"
                    value={coaForm.openingBalance}
                    onChange={(e) => setCoaForm((f) => ({ ...f, openingBalance: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">As of date</label>
                  <input
                    type="date"
                    value={coaForm.openingDate}
                    onChange={(e) => setCoaForm((f) => ({ ...f, openingDate: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-6">
              <button type="button" onClick={() => setCoaModal(null)} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
                Cancel
              </button>
              <button type="button" onClick={() => saveCoa(false)} className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white">
                Save
              </button>
              <button
                type="button"
                onClick={() => saveCoa(true)}
                className="rounded-full border border-orange-200 bg-orange-50 px-5 py-2.5 text-sm font-semibold text-orange-900"
              >
                Save &amp; new
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {openingSub ? (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-white">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--gs-navy)]">
                  {openingSub === "trial" && "Opening trial balance"}
                  {openingSub === "customer" && "Customer opening balance"}
                  {openingSub === "vendor" && "Vendor opening balance"}
                  {openingSub === "inventory" && "Inventory opening"}
                </h2>
                {openingSub === "trial" ? (
                  <p className="mt-2 text-sm text-amber-800">Total debit must equal total credit.</p>
                ) : null}
              </div>
              <button type="button" onClick={() => setOpeningSub(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Close
              </button>
            </div>
            {openingSub === "trial" ? (
              <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3">1100 — Cash</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(50000, "PKR")}</td>
                      <td className="px-4 py-3 text-right">—</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">4000 — Sales revenue</td>
                      <td className="px-4 py-3 text-right">—</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(50000, "PKR")}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                  <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
                    Save draft
                  </button>
                  <button type="button" className="rounded-full bg-[var(--gs-navy)] px-4 py-2 text-sm font-semibold text-white">
                    Validate
                  </button>
                </div>
              </div>
            ) : null}
            {openingSub === "customer" ? (
              <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--gs-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-slate-600">
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
                <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                  <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
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
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-slate-600">
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
                <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                  <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
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
                    <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-slate-600">
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
                <p className="text-right text-sm font-semibold text-slate-800">Total inventory value: {formatMoney(147000, "PKR")}</p>
                <div className="flex justify-end gap-2">
                  <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
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
        <div className="fixed inset-0 z-[65] flex justify-end bg-slate-900/35">
          <div className="flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-6">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--gs-navy)]">{selectedBank.bank}</h3>
                  <p className="mt-1 text-sm text-[var(--gs-muted)]">Balance {formatMoney(selectedBank.balance, "PKR")}</p>
                  <p className="text-xs text-slate-500">Last reconciled: {selectedBank.recon}</p>
                </div>
                <button type="button" onClick={() => setBankDetailId(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
                  ×
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
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
                      bankDetailTab === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
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
                  <thead className="text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2">2026-03-14</td>
                      <td className="py-2">Wire in</td>
                      <td className="py-2 text-right font-medium text-emerald-700">+ {formatMoney(2000, "PKR")}</td>
                    </tr>
                    <tr>
                      <td className="py-2">2026-03-12</td>
                      <td className="py-2">Bank fee</td>
                      <td className="py-2 text-right font-medium text-red-700">− {formatMoney(25, "PKR")}</td>
                    </tr>
                  </tbody>
                </table>
              ) : bankDetailTab === "details" ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">IBAN</dt>
                    <dd className="font-mono">PK00HBL000000{selectedBank.last4}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Currency</dt>
                    <dd>PKR</dd>
                  </div>
                </dl>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--gs-muted)]">Match bank lines to system entries.</p>
                  <button
                    type="button"
                    onClick={() => setReconOpen(true)}
                    className="rounded-full bg-[var(--gs-navy)] px-4 py-2 text-sm font-semibold text-white"
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
        <div className="fixed inset-0 z-[66] flex justify-end bg-slate-900/35">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex justify-between">
              <h3 className="text-lg font-bold text-[var(--gs-navy)]">Add bank account</h3>
              <button type="button" onClick={() => setBankAddOpen(false)} className="text-slate-500">
                ×
              </button>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <label className="font-bold text-slate-500">Bank name</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="e.g. HBL" />
              </div>
              <div>
                <label className="font-bold text-slate-500">Account title</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-slate-500">Account number</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-slate-500">Opening balance</label>
                <input type="number" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-slate-500">Currency</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                  <option>PKR</option>
                  <option>USD</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex gap-2">
              <button type="button" onClick={() => setBankAddOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
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
        <div className="fixed inset-0 z-[66] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[var(--gs-navy)]">Import bank statement</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="font-bold text-slate-500">Bank account</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                  {bankCards.map((b) => (
                    <option key={b.id}>{b.bank} ·••• {b.last4}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-500">CSV / Excel file</label>
                <input type="file" className="mt-1 w-full text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setBankImportOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
                Cancel
              </button>
              <button type="button" onClick={() => window.alert("Demo: preview rows")} className="rounded-full bg-[var(--gs-navy)] px-4 py-2 text-sm font-semibold text-white">
                Upload &amp; preview
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bankTransferOpen ? (
        <div className="fixed inset-0 z-[66] flex justify-end bg-slate-900/35">
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex justify-between">
              <h3 className="text-lg font-bold text-[var(--gs-navy)]">Transfer money</h3>
              <button type="button" onClick={() => setBankTransferOpen(false)} className="text-slate-500">
                ×
              </button>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <label className="font-bold text-slate-500">From</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                  {bankCards.map((b) => (
                    <option key={b.id}>{b.bank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-500">To</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                  {bankCards.map((b) => (
                    <option key={b.id}>{b.bank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-500">Amount</label>
                <input type="number" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="font-bold text-slate-500">Date</label>
                <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
            </div>
            <div className="mt-8 flex gap-2">
              <button type="button" onClick={() => setBankTransferOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
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
        <div className="fixed inset-0 z-[80] flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg font-bold text-[var(--gs-navy)]">Bank reconciliation</h2>
            <button type="button" onClick={() => setReconOpen(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700">
              Close
            </button>
          </div>
          <div className="grid flex-1 gap-0 md:grid-cols-2">
            <div className="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
              <p className="text-xs font-bold uppercase text-slate-500">Bank statement</p>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="py-1">✓</th>
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
              <p className="text-xs font-bold uppercase text-slate-500">System records</p>
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="py-1">✓</th>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
            <p className="text-sm text-slate-600">
              Matched {formatMoney(500, "PKR")} · Unmatched {formatMoney(0, "PKR")}
            </p>
            <div className="flex gap-2">
              <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
                Save progress
              </button>
              <button type="button" className="rounded-full bg-[var(--gs-navy)] px-4 py-2 text-sm font-semibold text-white">
                Complete reconciliation
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
