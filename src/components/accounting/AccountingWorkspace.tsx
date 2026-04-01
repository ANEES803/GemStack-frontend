"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { formatMoney } from "@/lib/format";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type TabId =
  | "coa"
  | "parties"
  | "products"
  | "currencies"
  | "tax"
  | "purchase"
  | "sales"
  | "payments"
  | "journal";

const TABS: { id: TabId; label: string; group: "setup" | "transactions" }[] = [
  { id: "coa", label: "Chart of accounts", group: "setup" },
  { id: "parties", label: "Customers & vendors", group: "setup" },
  { id: "products", label: "Products", group: "setup" },
  { id: "currencies", label: "Currencies", group: "setup" },
  { id: "tax", label: "Tax setup", group: "setup" },
  { id: "purchase", label: "Purchase bill", group: "transactions" },
  { id: "sales", label: "Sales invoice", group: "transactions" },
  { id: "payments", label: "Payments", group: "transactions" },
  { id: "journal", label: "Journal entry", group: "transactions" },
];

type AccountType = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

type CoaRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
};

const INITIAL_COA: CoaRow[] = [
  { id: "1", code: "1000", name: "Assets", type: "Asset", parentId: null },
  { id: "2", code: "1100", name: "Cash — PKR", type: "Asset", parentId: "1" },
  { id: "3", code: "1200", name: "Accounts receivable", type: "Asset", parentId: "1" },
  { id: "4", code: "1300", name: "Inventory — Grade A", type: "Asset", parentId: "1" },
  { id: "5", code: "2000", name: "Liabilities", type: "Liability", parentId: null },
  { id: "6", code: "2100", name: "Accounts payable", type: "Liability", parentId: "5" },
  { id: "7", code: "2200", name: "FEP commission payable", type: "Liability", parentId: "5" },
  { id: "8", code: "4000", name: "Sales revenue", type: "Revenue", parentId: null },
  { id: "9", code: "5000", name: "Cost of sales", type: "Expense", parentId: null },
  { id: "10", code: "5100", name: "Commission expense", type: "Expense", parentId: null },
];

type PartyRow = {
  id: string;
  name: string;
  kind: "Customer" | "Vendor";
  controlAccount: string;
  email: string;
};

const INITIAL_PARTIES: PartyRow[] = [
  { id: "p1", name: "Gem Traders LLC", kind: "Customer", controlAccount: "1200 — AR", email: "ap@gems.com" },
  { id: "p2", name: "Sapphire Co.", kind: "Vendor", controlAccount: "2100 — AP", email: "sales@sapphire.com" },
];

type ProductKind = "service" | "product" | "raw";
type Tracking = "item" | "weight";
type Costing = "FIFO" | "Avg";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  kind: ProductKind;
  tracking: Tracking;
  costing: Costing;
};

const INITIAL_PRODUCTS: ProductRow[] = [
  { id: "pr1", sku: "S-EM", name: "Emerald parcel", kind: "product", tracking: "weight", costing: "FIFO" },
  { id: "pr2", sku: "S-AP", name: "Appraisal service", kind: "service", tracking: "item", costing: "Avg" },
  { id: "pr3", sku: "R-RO", name: "Rough sapphire lot", kind: "raw", tracking: "weight", costing: "FIFO" },
];

function coaDepth(rows: CoaRow[], id: string): number {
  const row = rows.find((r) => r.id === id);
  if (!row || row.parentId === null) return 0;
  return 1 + coaDepth(rows, row.parentId);
}

function modalShell(children: ReactNode, onClose: () => void, title: string) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/35 p-3 pt-6 sm:items-center sm:p-4 sm:py-8">
      <div className="w-full max-w-lg max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--gs-navy)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type SalesLine = {
  id: string;
  productId: string;
  qtyOrWeight: number;
  rate: number;
};

export function AccountingWorkspace() {
  const todayIso = useHydratedTodayIso();
  const [tab, setTab] = useState<TabId>("coa");

  const [coaRows, setCoaRows] = useState<CoaRow[]>(INITIAL_COA);
  const [coaModal, setCoaModal] = useState<"add" | { edit: CoaRow } | null>(null);
  const [coaForm, setCoaForm] = useState({
    code: "",
    name: "",
    type: "Asset" as AccountType,
    parentId: "none" as string | "none",
  });

  const [parties, setParties] = useState<PartyRow[]>(INITIAL_PARTIES);
  const [partyModal, setPartyModal] = useState<"add" | { edit: PartyRow } | null>(null);
  const [partyForm, setPartyForm] = useState({
    name: "",
    kind: "Customer" as PartyRow["kind"],
    controlAccount: "1200 — AR",
    email: "",
  });

  const [products, setProducts] = useState<ProductRow[]>(INITIAL_PRODUCTS);
  const [productModal, setProductModal] = useState<"add" | { edit: ProductRow } | null>(null);
  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    kind: "product" as ProductKind,
    tracking: "weight" as Tracking,
    costing: "FIFO" as Costing,
  });

  const [baseCurrency] = useState("PKR");
  const [usdRate, setUsdRate] = useState("279.50");
  const [gstPct, setGstPct] = useState("18");
  const [whtPct, setWhtPct] = useState("0");

  const [purchaseVendor, setPurchaseVendor] = useState("Sapphire Co.");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseRef, setPurchaseRef] = useState("PB-2026-014");
  const [purchaseLines, setPurchaseLines] = useState([
    { id: "l1", desc: "Rough lot allocation", qty: 1, cost: 12500, tax: 2250 },
    { id: "l2", desc: "Shipping & handling", qty: 1, cost: 400, tax: 72 },
  ]);

  const [siCustomer, setSiCustomer] = useState("Gem Traders LLC");
  const [siDate, setSiDate] = useState("");
  const [siRef, setSiRef] = useState("INV-2026-NEW");
  const [salesLines, setSalesLines] = useState<SalesLine[]>([
    { id: "s1", productId: "pr1", qtyOrWeight: 12.5, rate: 4200 },
  ]);

  const [payParty, setPayParty] = useState("Gem Traders LLC");
  const [payMethod, setPayMethod] = useState("Bank");
  const [payAllocations] = useState([
    { inv: "INV-1040", open: 910, apply: 910 },
    { inv: "INV-1038", open: 1200, apply: 0 },
  ]);

  const [jeDate, setJeDate] = useState("");
  const [jeMemo, setJeMemo] = useState("Month-end accrual — demo");
  const [jeLines, setJeLines] = useState([
    { id: "j1", account: "5100 — Commission expense", debit: 450, credit: 0 },
    { id: "j2", account: "2200 — FEP commission payable", debit: 0, credit: 450 },
  ]);

  useEffect(() => {
    if (!todayIso) return;
    setPurchaseDate((p) => p || todayIso);
    setSiDate((p) => p || todayIso);
    setJeDate((p) => p || todayIso);
  }, [todayIso]);

  const coaSorted = useMemo(() => {
    const list = [...coaRows];
    list.sort((a, b) => a.code.localeCompare(b.code));
    return list;
  }, [coaRows]);

  const jeBalanced = useMemo(() => {
    const d = jeLines.reduce((s, l) => s + l.debit, 0);
    const c = jeLines.reduce((s, l) => s + l.credit, 0);
    return { debit: d, credit: c, ok: Math.abs(d - c) < 0.005 };
  }, [jeLines]);

  const purchaseTotal = useMemo(() => purchaseLines.reduce((s, l) => s + l.cost + l.tax, 0), [purchaseLines]);

  const gstNum = parseFloat(gstPct) || 0;
  const whtNum = parseFloat(whtPct) || 0;

  const salesTotals = useMemo(() => {
    let sub = 0;
    for (const line of salesLines) {
      const p = products.find((x) => x.id === line.productId);
      const lineAmt = line.qtyOrWeight * line.rate;
      sub += lineAmt;
    }
    const gst = sub * (gstNum / 100);
    const wht = sub * (whtNum / 100);
    const total = sub + gst - wht;
    return { sub, gst, wht, total };
  }, [salesLines, products, gstNum, whtNum]);

  function openCoaAdd() {
    setCoaForm({ code: "", name: "", type: "Asset", parentId: "none" });
    setCoaModal("add");
  }

  function openCoaEdit(row: CoaRow) {
    setCoaForm({
      code: row.code,
      name: row.name,
      type: row.type,
      parentId: row.parentId ?? "none",
    });
    setCoaModal({ edit: row });
  }

  function saveCoa() {
    if (!coaForm.code.trim() || !coaForm.name.trim()) return;
    const parentId = coaForm.parentId === "none" ? null : coaForm.parentId;
    if (coaModal === "add") {
      const id = `n-${Date.now()}`;
      setCoaRows((prev) => [...prev, { id, code: coaForm.code.trim(), name: coaForm.name.trim(), type: coaForm.type, parentId }]);
    } else if (coaModal && typeof coaModal === "object") {
      const { id } = coaModal.edit;
      setCoaRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, code: coaForm.code.trim(), name: coaForm.name.trim(), type: coaForm.type, parentId } : r)),
      );
    }
    setCoaModal(null);
  }

  function deleteCoa(row: CoaRow) {
    if (!window.confirm(`Remove account ${row.code} from list? (SRS: production uses soft delete.)`)) return;
    setCoaRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function saveParty() {
    if (!partyForm.name.trim()) return;
    if (partyModal === "add") {
      setParties((prev) => [
        ...prev,
        {
          id: `p-${Date.now()}`,
          name: partyForm.name.trim(),
          kind: partyForm.kind,
          controlAccount: partyForm.controlAccount.trim(),
          email: partyForm.email.trim(),
        },
      ]);
    } else if (partyModal && typeof partyModal === "object") {
      const id = partyModal.edit.id;
      setParties((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name: partyForm.name.trim(),
                kind: partyForm.kind,
                controlAccount: partyForm.controlAccount.trim(),
                email: partyForm.email.trim(),
              }
            : p,
        ),
      );
    }
    setPartyModal(null);
  }

  function saveProduct() {
    if (!productForm.sku.trim() || !productForm.name.trim()) return;
    if (productModal === "add") {
      setProducts((prev) => [
        ...prev,
        {
          id: `pr-${Date.now()}`,
          sku: productForm.sku.trim(),
          name: productForm.name.trim(),
          kind: productForm.kind,
          tracking: productForm.tracking,
          costing: productForm.costing,
        },
      ]);
    } else if (productModal && typeof productModal === "object") {
      const id = productModal.edit.id;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                sku: productForm.sku.trim(),
                name: productForm.name.trim(),
                kind: productForm.kind,
                tracking: productForm.tracking,
                costing: productForm.costing,
              }
            : p,
        ),
      );
    }
    setProductModal(null);
  }

  function addJeLine() {
    setJeLines((prev) => [...prev, { id: `j-${Date.now()}`, account: "", debit: 0, credit: 0 }]);
  }

  function updateJeLine(id: string, patch: Partial<(typeof jeLines)[0]>) {
    setJeLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeJeLine(id: string) {
    setJeLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.id !== id)));
  }

  function productLabel(id: string) {
    const p = products.find((x) => x.id === id);
    return p ? `${p.sku} — ${p.name}` : id;
  }

  function qtyLabel(productId: string) {
    const p = products.find((x) => x.id === productId);
    return p?.tracking === "weight" ? "Weight (ct)" : "Qty";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm leading-relaxed text-[var(--gs-muted)]">
          SRS-aligned demo: masters, tax, and transaction shells. Full invoice list lives on{" "}
          <Link href="/sales" className="font-semibold text-[var(--gs-accent)] hover:underline">
            Invoices
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--gs-border)] bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3">
        <div className="flex flex-wrap gap-1">
          <span className="w-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:w-auto">Setup</span>
          {TABS.filter((t) => t.group === "setup").map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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
              onClick={() => setTab(t.id)}
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
              <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Parent/child, type, codes — add, edit, delete (demo).</p>
            </div>
            <button
              type="button"
              onClick={openCoaAdd}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
            >
              Add account
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {coaSorted.map((row) => {
                  const depth = coaDepth(coaRows, row.id);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-mono text-slate-800">{row.code}</td>
                      <td className="px-5 py-3 text-slate-700">
                        <span style={{ paddingLeft: `${depth * 16}px` }} className="inline-block">
                          {depth > 0 ? <span className="mr-2 text-slate-300">└</span> : null}
                          {row.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{row.type}</td>
                      <td className="px-5 py-3 text-right">
                        <button type="button" onClick={() => openCoaEdit(row)} className="mr-2 text-sm font-semibold text-[var(--gs-accent)] hover:underline">
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteCoa(row)} className="text-sm font-semibold text-red-600 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "parties" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-navy)]">Customers & vendors</h2>
              <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Basic profile; auto-link to AR/AP control accounts.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPartyForm({ name: "", kind: "Customer", controlAccount: "1200 — AR", email: "" });
                setPartyModal("add");
              }}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
            >
              Add party
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Control account</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3 text-slate-600">{p.kind}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700">{p.controlAccount}</td>
                    <td className="px-5 py-3 text-slate-600">{p.email || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setPartyForm({
                            name: p.name,
                            kind: p.kind,
                            controlAccount: p.controlAccount,
                            email: p.email,
                          });
                          setPartyModal({ edit: p });
                        }}
                        className="text-sm font-semibold text-[var(--gs-accent)] hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "products" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-navy)]">Products</h2>
              <p className="mt-0.5 text-sm text-[var(--gs-muted)]">Type, tracking (item/weight), costing FIFO / Avg.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProductForm({ sku: "", name: "", kind: "product", tracking: "weight", costing: "FIFO" });
                setProductModal("add");
              }}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
            >
              Add product
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Tracking</th>
                  <th className="px-5 py-3">Costing</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-mono text-slate-800">{p.sku}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{p.kind}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{p.tracking}</td>
                    <td className="px-5 py-3 text-slate-600">{p.costing}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm({
                            sku: p.sku,
                            name: p.name,
                            kind: p.kind,
                            tracking: p.tracking,
                            costing: p.costing,
                          });
                          setProductModal({ edit: p });
                        }}
                        className="text-sm font-semibold text-[var(--gs-accent)] hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "currencies" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Currencies</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">PKR base; USD foreign with exchange rate.</p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Base currency</p>
              <p className="mt-2 text-2xl font-bold text-[var(--gs-navy)]">{baseCurrency}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">USD rate (1 USD = PKR)</label>
              <input
                value={usdRate}
                onChange={(e) => setUsdRate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
              <p className="mt-2 text-xs text-slate-500">
                Example: $1,000 → Rs {(1000 * parseFloat(usdRate || "0")).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </section>
      )}

      {tab === "tax" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Tax setup</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">GST and WHT defaults — used on Sales invoice tab below.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">GST %</label>
              <input
                value={gstPct}
                onChange={(e) => setGstPct(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">WHT %</label>
              <input
                value={whtPct}
                onChange={(e) => setWhtPct(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
          </div>
        </section>
      )}

      {tab === "purchase" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold text-[var(--gs-navy)]">Purchase bill</h2>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">Vendor, lines with cost + tax.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Vendor *</label>
                <input
                  value={purchaseVendor}
                  onChange={(e) => setPurchaseVendor(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date *</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Reference</label>
                <input
                  value={purchaseRef}
                  onChange={(e) => setPurchaseRef(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto p-5 pt-0">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Item / description</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Tax</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseLines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 pr-4">
                      <input
                        value={l.desc}
                        onChange={(e) =>
                          setPurchaseLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, desc: e.target.value } : x)))
                        }
                        className="w-full min-w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        value={l.qty}
                        onChange={(e) =>
                          setPurchaseLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, qty: Number(e.target.value) } : x)))
                        }
                        className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        value={l.cost}
                        onChange={(e) =>
                          setPurchaseLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, cost: Number(e.target.value) } : x)))
                        }
                        className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        value={l.tax}
                        onChange={(e) =>
                          setPurchaseLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, tax: Number(e.target.value) } : x)))
                        }
                        className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => setPurchaseLines((prev) => prev.filter((x) => x.id !== l.id))}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => setPurchaseLines((prev) => [...prev, { id: `l-${Date.now()}`, desc: "", qty: 1, cost: 0, tax: 0 }])}
              className="mt-2 text-sm font-semibold text-[var(--gs-accent)] hover:underline"
            >
              + Add line
            </button>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600">
                Total (incl. tax): <span className="font-bold text-[var(--gs-navy)]">{formatMoney(purchaseTotal, "PKR")}</span>
              </p>
              <button
                type="button"
                onClick={() => window.alert("Demo: Dr Inventory / Cr AP + tax. Connect API.")}
                className="rounded-full bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Save purchase bill
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "sales" && (
        <section className="overflow-hidden rounded-2xl border border-[var(--gs-border)] bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-bold text-[var(--gs-navy)]">Sales invoice (line items)</h2>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">Customer, product, quantity or weight, rate — GST/WHT from Tax setup.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Customer *</label>
                <select
                  value={siCustomer}
                  onChange={(e) => setSiCustomer(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  {parties.filter((x) => x.kind === "Customer").map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Date *</label>
                <input
                  type="date"
                  value={siDate}
                  onChange={(e) => setSiDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Reference</label>
                <input
                  value={siRef}
                  onChange={(e) => setSiRef(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto p-5 pt-0">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Qty / weight</th>
                  <th className="py-2 pr-4">Rate (PKR)</th>
                  <th className="py-2 pr-4 text-right">Line</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesLines.map((line) => {
                  const lineAmt = line.qtyOrWeight * line.rate;
                  return (
                    <tr key={line.id}>
                      <td className="py-3 pr-4">
                        <select
                          value={line.productId}
                          onChange={(e) =>
                            setSalesLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, productId: e.target.value } : x)))
                          }
                          className="w-full min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {productLabel(p.id)}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {products.find((x) => x.id === line.productId)?.tracking === "weight" ? "Weight-tracked" : "Item-tracked"}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <label className="sr-only">{qtyLabel(line.productId)}</label>
                        <input
                          type="number"
                          value={line.qtyOrWeight}
                          onChange={(e) =>
                            setSalesLines((prev) =>
                              prev.map((x) => (x.id === line.id ? { ...x, qtyOrWeight: Number(e.target.value) } : x)),
                            )
                          }
                          className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                        <p className="mt-0.5 text-[10px] text-slate-400">{qtyLabel(line.productId)}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          value={line.rate}
                          onChange={(e) =>
                            setSalesLines((prev) => prev.map((x) => (x.id === line.id ? { ...x, rate: Number(e.target.value) } : x)))
                          }
                          className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-slate-900">{formatMoney(lineAmt, "PKR")}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSalesLines((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== line.id)))}
                          className="text-xs text-red-600 hover:underline"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() =>
                setSalesLines((prev) => [
                  ...prev,
                  { id: `s-${Date.now()}`, productId: products[0]?.id ?? "", qtyOrWeight: 1, rate: 0 },
                ])
              }
              className="mt-2 text-sm font-semibold text-[var(--gs-accent)] hover:underline"
            >
              + Add line
            </button>
            <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{formatMoney(salesTotals.sub, "PKR")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST ({gstPct}%)</span>
                <span className="font-medium text-slate-900">{formatMoney(salesTotals.gst, "PKR")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>WHT ({whtPct}%)</span>
                <span className="font-medium text-red-700">− {formatMoney(salesTotals.wht, "PKR")}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-[var(--gs-navy)]">
                <span>Total</span>
                <span>{formatMoney(salesTotals.total, "PKR")}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.alert("Demo: posts sales + tax per SRS. Connect API.")}
                className="rounded-full bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Save invoice
              </button>
              <Link
                href="/sales"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Open invoice list
              </Link>
            </div>
          </div>
        </section>
      )}

      {tab === "payments" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Payments</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Select party and allocate to open invoices.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Party *</label>
              <select
                value={payParty}
                onChange={(e) => setPayParty(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              >
                <option>Gem Traders LLC</option>
                <option>Retail Jewels</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Method *</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              >
                <option>Bank</option>
                <option>Cash</option>
                <option>PayPal</option>
              </select>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3 text-right">Open balance</th>
                  <th className="px-4 py-3 text-right">Apply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payAllocations.map((a) => (
                  <tr key={a.inv}>
                    <td className="px-4 py-3 font-mono text-slate-800">{a.inv}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoney(a.open, "PKR")}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--gs-navy)]">{formatMoney(a.apply, "PKR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => window.alert("Demo: Dr Cash/Bank · Cr AR. Connect API.")}
            className="mt-4 rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
          >
            Record payment
          </button>
        </section>
      )}

      {tab === "journal" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Journal entry</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Manual debit/credit — debits must equal credits.</p>
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
              <input
                value={jeMemo}
                onChange={(e) => setJeMemo(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Account</th>
                  <th className="py-2 pr-4 text-right">Debit</th>
                  <th className="py-2 pr-4 text-right">Credit</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jeLines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 pr-4">
                      <input
                        value={l.account}
                        onChange={(e) => updateJeLine(l.id, { account: e.target.value })}
                        className="w-full min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Account"
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
                      <button type="button" onClick={() => removeJeLine(l.id)} className="text-xs text-red-600 hover:underline">
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
              Debits: <strong>{formatMoney(jeBalanced.debit, "PKR")}</strong> · Credits:{" "}
              <strong>{formatMoney(jeBalanced.credit, "PKR")}</strong>
            </span>
            <span className={jeBalanced.ok ? "font-semibold text-emerald-800" : "font-semibold text-amber-800"}>
              {jeBalanced.ok ? "Balanced" : "Not balanced"}
            </span>
          </div>
          <button
            type="button"
            disabled={!jeBalanced.ok}
            onClick={() => (jeBalanced.ok ? window.alert("Demo: journal posted. Connect API.") : undefined)}
            className="mt-4 rounded-full bg-[var(--gs-navy)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Post journal
          </button>
        </section>
      )}

      {coaModal
        ? modalShell(
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Code *</label>
                <input
                  value={coaForm.code}
                  onChange={(e) => setCoaForm((f) => ({ ...f, code: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Name *</label>
                <input
                  value={coaForm.name}
                  onChange={(e) => setCoaForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Type *</label>
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
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCoaModal(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={saveCoa} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </div>,
            () => setCoaModal(null),
            coaModal === "add" ? "Add account" : "Edit account",
          )
        : null}

      {partyModal
        ? modalShell(
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Name *</label>
                <input
                  value={partyForm.name}
                  onChange={(e) => setPartyForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Type *</label>
                <select
                  value={partyForm.kind}
                  onChange={(e) => setPartyForm((f) => ({ ...f, kind: e.target.value as PartyRow["kind"] }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option>Customer</option>
                  <option>Vendor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Control account *</label>
                <input
                  value={partyForm.controlAccount}
                  onChange={(e) => setPartyForm((f) => ({ ...f, controlAccount: e.target.value }))}
                  placeholder="e.g. 1200 — AR"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
                <input
                  value={partyForm.email}
                  onChange={(e) => setPartyForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPartyModal(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={saveParty} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </div>,
            () => setPartyModal(null),
            partyModal === "add" ? "Add party" : "Edit party",
          )
        : null}

      {productModal
        ? modalShell(
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">SKU *</label>
                <input
                  value={productForm.sku}
                  onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Name *</label>
                <input
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Product type</label>
                <select
                  value={productForm.kind}
                  onChange={(e) => setProductForm((f) => ({ ...f, kind: e.target.value as ProductKind }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option value="service">Service</option>
                  <option value="product">Product</option>
                  <option value="raw">Raw</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Tracking</label>
                <select
                  value={productForm.tracking}
                  onChange={(e) => setProductForm((f) => ({ ...f, tracking: e.target.value as Tracking }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option value="item">Item</option>
                  <option value="weight">Weight</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Costing</label>
                <select
                  value={productForm.costing}
                  onChange={(e) => setProductForm((f) => ({ ...f, costing: e.target.value as Costing }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
                >
                  <option value="FIFO">FIFO</option>
                  <option value="Avg">Average</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setProductModal(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={saveProduct} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
                  Save
                </button>
              </div>
            </div>,
            () => setProductModal(null),
            productModal === "add" ? "Add product" : "Edit product",
          )
        : null}
    </div>
  );
}
