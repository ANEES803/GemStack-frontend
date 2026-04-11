"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppDialog } from "@/components/ui/AppDialog";
import { formatMoney } from "@/lib/format";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

type LotLine = {
  id: string;
  itemName: string;
  category: string;
  lotDetails: string;
  type: string;
  weight: string;
  pieces: string;
  rate: string;
};

type PayMethod = "Cash" | "Bank" | "Cheque";

const BANK_ACCOUNTS = [
  "HBL - GemStack Trading (PK12-HABB-0011223344)",
  "UBL - GemStack Operating (PK34-UNIL-5566778899)",
  "MCB - GemStack Collections (PK78-MCBA-1100220033)",
];
const TO_ACCOUNT_OPTIONS = ["Supplier / Vendor", "Accounts Payable", "Expense Clearing"] as const;
const LOT_IDS_STORAGE_KEY = "gemstack:lot-ids";
const SUPPLIERS_STORAGE_KEY = "gemstack:suppliers";
const DEFAULT_SUPPLIERS = ["Sapphire Co.", "Global Gems Ltd", "Ceylon Traders"];

function num(v: string): number {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatPrintDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function CreateLotForm() {
  const router = useRouter();
  const todayIso = useHydratedTodayIso();

  const [lotIdPreview, setLotIdPreview] = useState("LOT-000001");
  const [lotIdError, setLotIdError] = useState<string | null>(null);
  const [savedLotId, setSavedLotId] = useState<string | null>(null);
  const [dateIso, setDateIso] = useState("");
  const [party, setParty] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<string[]>(DEFAULT_SUPPLIERS);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [email, setEmail] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on receipt");
  const [referenceNo, setReferenceNo] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState("Unpaid");
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showCancelMenu, setShowCancelMenu] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("Cash");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("Supplier / Vendor");
  const [payBankAccount, setPayBankAccount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const [lines, setLines] = useState<LotLine[]>([
    { id: crypto.randomUUID(), itemName: "", category: "", lotDetails: "", type: "", weight: "0", pieces: "1", rate: "0" },
  ]);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useEffect(() => {
    if (todayIso) {
      setDateIso((d) => d || todayIso);
      setPayDate((d) => d || todayIso);
    }
  }, [todayIso]);

  useEffect(() => {
    const nextNumber = Date.now().toString().slice(-6);
    setLotIdPreview(`LOT-${nextNumber}`);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SUPPLIERS_STORAGE_KEY);
      if (!raw) {
        setSupplierOptions(DEFAULT_SUPPLIERS);
        setParty(DEFAULT_SUPPLIERS[0] ?? "");
        return;
      }
      const parsed = JSON.parse(raw);
      const options = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string" && Boolean(v.trim())) : [];
      const unique = [...new Set([...DEFAULT_SUPPLIERS, ...options])];
      setSupplierOptions(unique);
      setParty(unique[0] ?? "");
    } catch {
      setSupplierOptions(DEFAULT_SUPPLIERS);
      setParty(DEFAULT_SUPPLIERS[0] ?? "");
    }
  }, []);

  const total = useMemo(() => lines.reduce((sum, l) => sum + num(l.weight) * num(l.rate), 0), [lines]);
  const balance = Math.max(total - paidAmount, 0);
  const selectedSupplierName = party;
  const selectedSupplierEmail = email;

  useEffect(() => {
    if (!payOpen) return;
    setPayAmount(String(balance || total || 0));
    setPayMethod("Cash");
    setPaidFrom("");
    setPaidTo("Supplier / Vendor");
    setPayBankAccount("");
    setPayReference(referenceNo);
    setPayNotes(memo);
  }, [payOpen, balance, total, referenceNo, memo]);

  useEffect(() => {
    if (paidFrom === "Cash") {
      setPayMethod("Cash");
      setPayBankAccount("");
      return;
    }
    if (paidFrom.startsWith("Bank:")) {
      setPayMethod("Bank");
      setPayBankAccount(paidFrom.replace("Bank: ", ""));
    }
  }, [paidFrom]);

  function updateLine(id: string, key: keyof LotLine, value: string) {
    setLines((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function addRow() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), itemName: "", category: "", lotDetails: "", type: "", weight: "0", pieces: "1", rate: "0" }]);
  }

  function removeRow(id: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function getSavedLotIds(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(LOT_IDS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }

  function saveLotIds(ids: string[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LOT_IDS_STORAGE_KEY, JSON.stringify(ids));
  }

  function isDuplicateLotId(id: string): boolean {
    const normalized = id.trim().toUpperCase();
    if (!normalized) return false;
    const currentSaved = savedLotId?.trim().toUpperCase() ?? null;
    const ids = getSavedLotIds();
    return ids.some((storedId) => {
      const value = storedId.trim().toUpperCase();
      if (currentSaved && value === currentSaved) return false;
      return value === normalized;
    });
  }

  function validateLot(): string | null {
    if (!party.trim()) return "Vendor / Supplier is required.";
    if (!lotIdPreview.trim()) {
      setLotIdError("Lot ID is required.");
      return "Lot ID is required.";
    }
    if (isDuplicateLotId(lotIdPreview)) {
      setLotIdError("Lot ID already exists. Please enter a unique Lot ID.");
      return "Lot ID already exists.";
    }
    setLotIdError(null);
    if (!dateIso) return "Date is required.";
    if (total <= 0) return "Total must be greater than 0.";
    return null;
  }

  async function saveLot(action: "save" | "save-close" | "save-pay") {
    if (isSaving) return;
    const msg = validateLot();
    if (msg) {
      setError(msg);
      setSuccess(null);
      return;
    }
    setIsSaving(true);
    setShowSaveMenu(false);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const normalized = lotIdPreview.trim();
    const ids = getSavedLotIds();
    const currentSaved = savedLotId?.trim();
    const nextIds = ids.filter((storedId) => storedId.trim().toUpperCase() !== (currentSaved?.toUpperCase() ?? ""));
    nextIds.push(normalized);
    saveLotIds(nextIds);
    setSavedLotId(normalized);

    setError(null);
    setIsSaved(true);
    if (action === "save-close") {
      setSuccess("Lot saved successfully.");
      setIsSaving(false);
      router.push("/lots");
      return;
    }
    if (action === "save-pay") {
      setSuccess("Lot saved successfully. Opening Pay Now.");
      setPayOpen(true);
      setIsSaving(false);
      return;
    }
    setSuccess("Lot saved successfully.");
    setIsSaving(false);
  }

  function submitPayment() {
    const amount = num(payAmount);
    if (amount <= 0) {
      setError("Payment amount must be greater than 0.");
      setSuccess(null);
      return;
    }
    if (amount > balance) {
      setError(`Payment cannot exceed remaining balance (${formatMoney(balance, "USD")}).`);
      setSuccess(null);
      return;
    }
    if (!paidFrom) {
      setError("Paid From account is required.");
      setSuccess(null);
      return;
    }
    if (!paidTo) {
      setError("Paid To account is required.");
      setSuccess(null);
      return;
    }
    if (payMethod === "Bank" && !payBankAccount) {
      setError("Please select a company bank account.");
      setSuccess(null);
      return;
    }
    if (!payDate) {
      setError("Payment date is required.");
      setSuccess(null);
      return;
    }

    const nextPaid = paidAmount + amount;
    setPaidAmount(nextPaid);
    if (nextPaid >= total && total > 0) {
      setStatus("Paid");
      setSuccess("Payment recorded. Lot marked as Paid.");
    } else {
      setStatus("Partially Paid");
      setSuccess("Payment recorded. Lot marked as Partially Paid.");
    }
    setError(null);
    setPayOpen(false);
  }

  function openPrint() {
    window.print();
  }

  function runCancelAction(): void {
    setShowCancelMenu(false);
    if (hasUnsavedChanges()) {
      setConfirmCancelOpen(true);
      return;
    }
    router.push("/lots");
  }

  function clearLotForm(): void {
    setLines([{ id: crypto.randomUUID(), itemName: "", category: "", lotDetails: "", type: "", weight: "0", pieces: "1", rate: "0" }]);
    setMemo("");
    setReferenceNo("");
    setAttachments([]);
  }

  function hasUnsavedChanges(): boolean {
    const hasCustomLineValues = lines.some((line) =>
      Boolean(
        line.itemName.trim() ||
          line.category.trim() ||
          line.lotDetails.trim() ||
          line.type.trim() ||
          (line.weight || "0") !== "0" ||
          (line.pieces || "1") !== "1" ||
          (line.rate || "0") !== "0",
      ),
    );
    return Boolean(
      party.trim() ||
        attachments.length > 0 ||
        email.trim() ||
        referenceNo.trim() ||
        memo.trim() ||
        hasCustomLineValues,
    );
  }

  function handleSupplierChange(value: string): void {
    const ADD_NEW_SUPPLIER_VALUE = "__add_new_supplier__";
    if (value !== ADD_NEW_SUPPLIER_VALUE) {
      setParty(value);
      return;
    }
    const entered = window.prompt("Enter new supplier name");
    const nextName = entered?.trim() ?? "";
    if (!nextName) return;
    const exists = supplierOptions.some((s) => s.trim().toLowerCase() === nextName.toLowerCase());
    const nextSuppliers = exists ? supplierOptions : [...supplierOptions, nextName];
    setSupplierOptions(nextSuppliers);
    setParty(nextName);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(nextSuppliers));
    }
  }

  return (
    <div className="w-full space-y-2 px-3 pb-16">
      <div className="flex items-start justify-between gap-0">
        <div>
          <h1 className="text-3xl font-bold text-[var(--gs-text)]">Add New LOT</h1>
        </div>
      </div>

      {success ? <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</div> : null}
      {error ? <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-3">
        <div className="grid gap-2 lg:grid-cols-12">
          <div className="grid gap-2 md:grid-cols-4 lg:col-span-9">
            <div>
              <label className="gs-label">Vendor / Supplier</label>
              <select value={party} onChange={(e) => handleSupplierChange(e.target.value)} className="gs-field !mt-1 h-9">
                <option value="">Select supplier...</option>
                {supplierOptions.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
                <option value="__add_new_supplier__">+ Add new supplier</option>
              </select>
            </div>
            <div>
              <label className="gs-label">Email (optional)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="gs-field !mt-1 h-9" />
            </div>
            <div>
              <label className="gs-label">Date</label>
              <input type="date" value={dateIso} onChange={(e) => setDateIso(e.target.value)} className="gs-field !mt-1 h-9" />
            </div>
            <div>
              <label className="gs-label">Payment terms</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="gs-field !mt-1 h-9">
                <option>Due on receipt</option>
                <option>Net 7</option>
                <option>Net 15</option>
                <option>Net 30</option>
              </select>
            </div>
            <div>
              <label className="gs-label">Reference no.</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="gs-field !mt-1 h-9" />
            </div>
            <div>
              <label className="gs-label">Lot ID</label>
              <input
                value={lotIdPreview}
                onChange={(e) => {
                  setLotIdPreview(e.target.value);
                  if (lotIdError) setLotIdError(null);
                }}
                className={`gs-field !mt-1 h-9 ${lotIdError ? "border-red-500 ring-1 ring-red-400/60" : ""}`}
              />
              {lotIdError ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{lotIdError}</p> : null}
            </div>
            <div>
              <label className="gs-label">Attachments</label>
              <input
                type="file"
                multiple
                onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
                className="gs-field !mt-1 h-9"
              />
            </div>
          </div>
          <aside className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-3 lg:col-span-3 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Amount summary</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gs-text)]">{formatMoney(total, "USD")}</p>
            <div className="mt-2 flex items-center gap-1">
              <button type="button" className="h-8 w-1/2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)] px-2 text-xs font-semibold text-[var(--gs-text)]">
                Status: {status}
              </button>
              <button
                type="button"
                disabled={!isSaved || isSaving}
                onClick={() => setPayOpen(true)}
                className="h-8 w-1/2 rounded-lg bg-[var(--gs-accent)] px-2 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Pay Now
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--gs-muted)]">
              Paid: {formatMoney(paidAmount, "USD")} | Balance: {formatMoney(balance, "USD")}
            </p>
          </aside>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-3">
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b border-[var(--gs-border)]">
                <th className="w-[11%] px-2 py-2 text-left font-semibold text-[var(--gs-muted)]">LOT ID</th>
                <th className="w-[11%] px-2 py-2 text-left font-semibold text-[var(--gs-muted)]">Category</th>
                <th className="w-[31%] px-2 py-2 text-left font-semibold text-[var(--gs-muted)]">Lot details</th>
                <th className="w-[9%] px-2 py-2 text-left font-semibold text-[var(--gs-muted)]">Type</th>
                <th className="w-[8%] px-2 py-2 text-right font-semibold text-[var(--gs-muted)]">UOM</th>
                <th className="w-[8%] px-2 py-2 text-right font-semibold text-[var(--gs-muted)]">Pieces</th>
                <th className="w-[7%] px-1 py-2 text-right font-semibold text-[var(--gs-muted)]">Rate</th>
                <th className="w-[7%] px-1 py-2 text-right font-semibold text-[var(--gs-muted)]">Total</th>
                <th className="w-[8%] px-1 py-2 text-right font-semibold text-[var(--gs-muted)]"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const lineTotal = num(l.weight) * num(l.rate);
                return (
                  <tr key={l.id} className="border-b border-[var(--gs-border)]">
                    <td className="px-2 py-1.5"><input value={l.itemName} onChange={(e) => updateLine(l.id, "itemName", e.target.value)} className="gs-field !mt-0 h-8 text-xs" /></td>
                    <td className="px-2 py-1.5"><input value={l.category} onChange={(e) => updateLine(l.id, "category", e.target.value)} className="gs-field !mt-0 h-8 text-xs" /></td>
                    <td className="px-2 py-1.5"><input value={l.lotDetails} onChange={(e) => updateLine(l.id, "lotDetails", e.target.value)} className="gs-field !mt-0 h-8 text-xs" /></td>
                    <td className="px-2 py-1.5"><input value={l.type} onChange={(e) => updateLine(l.id, "type", e.target.value)} className="gs-field !mt-0 h-8 text-xs" /></td>
                    <td className="px-2 py-1.5"><input value={l.weight} onChange={(e) => updateLine(l.id, "weight", e.target.value)} className="gs-field !mt-0 h-8 text-right text-xs" /></td>
                    <td className="px-2 py-1.5"><input value={l.pieces} onChange={(e) => updateLine(l.id, "pieces", e.target.value)} className="gs-field !mt-0 h-8 text-right text-xs" /></td>
                    <td className="px-1 py-1.5"><input value={l.rate} onChange={(e) => updateLine(l.id, "rate", e.target.value)} className="gs-field !mt-0 h-8 text-right text-xs" /></td>
                    <td className="px-1 py-1.5 text-right font-semibold text-[var(--gs-text)]">{formatMoney(lineTotal, "USD")}</td>
                    <td className="px-1 py-1.5 text-right">
                      <button type="button" onClick={() => removeRow(l.id)} className="text-xs font-semibold text-[var(--gs-muted)] hover:text-[var(--gs-text)]">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addRow} className="mt-2 rounded-lg border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
          + Add row
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-3">
        <label className="gs-label">Notes / Memo</label>
        <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} className="gs-field !mt-1" />
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--gs-border)] bg-[var(--gs-card)]/95 backdrop-blur">
        <div className="flex w-full items-center justify-end gap-2 px-3 py-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={openPrint}
              className="rounded-lg border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Preview
            </button>
          </div>
          <div className="relative flex">
            <button
              type="button"
              onClick={runCancelAction}
              className="mr-1.5 rounded-l-lg border border-[var(--gs-border)] px-3 py-1.5 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setShowCancelMenu((v) => !v)}
              className="mr-1.5 rounded-r-lg border border-l-0 border-[var(--gs-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
              aria-label="Open cancel actions"
            >
              ▾
            </button>
            {showCancelMenu ? (
              <div className="absolute bottom-12 left-0 z-40 w-44 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] p-1 shadow-lg">
                <button
                  type="button"
                  onClick={runCancelAction}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelMenu(false);
                    clearLotForm();
                  }}
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  Clear
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => saveLot("save")}
              disabled={isSaving}
              className="rounded-l-lg bg-[var(--gs-accent)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowSaveMenu((v) => !v)}
              disabled={isSaving}
              className="rounded-r-lg border-l border-white/30 bg-[var(--gs-accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Open save actions"
            >
              ▾
            </button>
            {showSaveMenu ? (
              <div className="absolute bottom-12 right-0 z-40 w-48 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] p-1 shadow-lg">
                <button type="button" onClick={() => saveLot("save")} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
                  Save
                </button>
                <button type="button" onClick={() => saveLot("save-close")} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
                  Save and Close
                </button>
                <button type="button" onClick={() => saveLot("save-pay")} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
                  Save and Pay
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AppDialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        titleId="confirm-new-lot-cancel-title"
        title="Cancel without saving?"
        description="You have unsaved changes in this lot."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmCancelOpen(false)}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmCancelOpen(false);
                router.push("/lots");
              }}
              className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
            >
              Yes, cancel
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--gs-muted)]">Your entered data will be discarded.</p>
      </AppDialog>

      <AppDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        titleId="pay-now-title"
        title="Pay Now"
        description="Record supplier payment for this lot."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPayOpen(false)} className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]">
              Cancel
            </button>
            <button type="button" onClick={submitPayment} className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]">
              Submit Payment
            </button>
          </div>
        }
      >
        <div className="grid gap-0 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)] px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Money flow</p>
            <p className="mt-1 text-sm font-semibold text-[var(--gs-text)]">
              {paidFrom || "Select Paid From"} → {paidTo === "Supplier / Vendor" ? `Supplier: ${selectedSupplierName || "-"}` : paidTo}
            </p>
          </div>
          <div>
            <label className="gs-label">Paid From</label>
            <select
              value={paidFrom}
              onChange={(e) => setPaidFrom(e.target.value)}
              className="gs-field md:w-[80%]"
            >
              <option value="">Select account...</option>
              <option value="Cash">Cash</option>
              {BANK_ACCOUNTS.map((account) => (
                <option key={account} value={`Bank: ${account}`}>
                  Bank: {account}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gs-label">Paid To</label>
            <select value={paidTo} onChange={(e) => setPaidTo(e.target.value)} className="gs-field md:w-[80%]">
              {TO_ACCOUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {paidTo === "Supplier / Vendor" ? (
              <p className="mt-1 text-xs text-[var(--gs-muted)]">Supplier: {selectedSupplierName || "-"}</p>
            ) : null}
          </div>
          {paidFrom.startsWith("Bank:") ? (
            <div className="sm:col-span-2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2">
              <p className="text-xs font-semibold text-[var(--gs-muted)]">Bank account details</p>
              <p className="mt-1 text-sm text-[var(--gs-text)]">{paidFrom.replace("Bank: ", "")}</p>
            </div>
          ) : null}
          <div>
            <label className="gs-label">Vendor / Supplier</label>
            <input value={selectedSupplierName} readOnly className="gs-field md:w-[80%]" />
          </div>
          <div>
            <label className="gs-label">Amount</label>
            <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="gs-field md:w-[80%]" />
            <p className="mt-1 text-xs text-[var(--gs-muted)]">Remaining: {formatMoney(balance, "USD")}</p>
          </div>
          <div>
            <label className="gs-label">Payment method</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)} className="gs-field md:w-[80%]">
              <option>Cash</option>
              <option>Bank</option>
              <option>Cheque</option>
            </select>
          </div>
          {payMethod === "Bank" ? (
            <div>
              <label className="gs-label">Company Bank Account</label>
              <select value={payBankAccount} onChange={(e) => setPayBankAccount(e.target.value)} className="gs-field md:w-[80%]">
                <option value="">Select account...</option>
                {BANK_ACCOUNTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="gs-label">Date</label>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="gs-field md:w-[80%]" />
          </div>
          <div>
            <label className="gs-label">Reference No</label>
            <input value={payReference} onChange={(e) => setPayReference(e.target.value)} className="gs-field md:w-[80%]" />
          </div>
          <div className="sm:col-span-2">
            <label className="gs-label">Notes (optional)</label>
            <textarea rows={3} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="gs-field md:w-[80%]" />
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        titleId="lot-preview-title"
        title="Lot Preview"
        description="Preview of printable lot invoice."
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={openPrint}
              className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
            >
              Print
            </button>
          </div>
        }
      >
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-black/20 bg-white p-6 text-black">
          <header className="flex items-start justify-between border-b border-black pb-5">
            <div>
              <h2 className="text-2xl font-bold">GemStack Trading Co.</h2>
              <p className="mt-1 text-sm">Office 12, Trade Tower, Karachi</p>
              <p className="text-sm">+92 300 0000000 | billing@gemstack.com</p>
            </div>
            <div className="h-14 w-14 rounded border border-black text-center text-xs leading-[3.4rem]">LOGO</div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Supplier</p>
              <p>{selectedSupplierName || "-"}</p>
              <p>{selectedSupplierEmail || "-"}</p>
            </div>
            <div className="text-right">
              <p>
                <span className="font-semibold">Lot ID:</span> {lotIdPreview || "-"}
              </p>
              <p>
                <span className="font-semibold">Date:</span> {formatPrintDate(dateIso)}
              </p>
              <p>
                <span className="font-semibold">Reference:</span> {referenceNo || "-"}
              </p>
            </div>
          </section>

          <section className="mt-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-black px-3 py-2 text-left">Item</th>
                  <th className="border border-black px-3 py-2 text-left">Description</th>
                  <th className="border border-black px-3 py-2 text-right">Qty / UOM</th>
                  <th className="border border-black px-3 py-2 text-right">Rate</th>
                  <th className="border border-black px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const lineTotal = num(line.weight) * num(line.rate);
                  return (
                    <tr key={line.id}>
                      <td className="border border-black px-3 py-2">{line.itemName || "-"}</td>
                      <td className="border border-black px-3 py-2">{[line.category, line.lotDetails, line.type].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="border border-black px-3 py-2 text-right">
                        {line.pieces || "0"} / {line.weight || "0"}
                      </td>
                      <td className="border border-black px-3 py-2 text-right">{formatMoney(num(line.rate), "USD")}</td>
                      <td className="border border-black px-3 py-2 text-right">{formatMoney(lineTotal, "USD")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(total, "USD")}</span>
              </div>
              <div className="flex items-center justify-between border-t border-black pt-2 text-lg font-bold">
                <span>Total Amount</span>
                <span>{formatMoney(total, "USD")}</span>
              </div>
            </div>
          </section>

          <footer className="mt-10 border-t border-black pt-4 text-sm">
            <p>
              <span className="font-semibold">Notes:</span> {memo || "-"}
            </p>
            <p className="mt-3 font-semibold">Thank you for your business.</p>
          </footer>
        </div>
      </AppDialog>

      <div id="invoice-print-area" className="hidden bg-white text-black print:block">
        <div className="mx-auto w-full max-w-4xl px-8 py-8">
          <header className="flex items-start justify-between border-b border-black pb-5">
            <div>
              <h2 className="text-2xl font-bold">GemStack Trading Co.</h2>
              <p className="mt-1 text-sm">Office 12, Trade Tower, Karachi</p>
              <p className="text-sm">+92 300 0000000 | billing@gemstack.com</p>
            </div>
            <div className="h-14 w-14 rounded border border-black text-center text-xs leading-[3.4rem]">LOGO</div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Supplier</p>
              <p>{selectedSupplierName || "-"}</p>
              <p>{selectedSupplierEmail || "-"}</p>
            </div>
            <div className="text-right">
              <p>
                <span className="font-semibold">Lot ID:</span> {lotIdPreview || "-"}
              </p>
              <p>
                <span className="font-semibold">Date:</span> {formatPrintDate(dateIso)}
              </p>
              <p>
                <span className="font-semibold">Reference:</span> {referenceNo || "-"}
              </p>
            </div>
          </section>

          <section className="mt-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-black px-3 py-2 text-left">Item</th>
                  <th className="border border-black px-3 py-2 text-left">Description</th>
                  <th className="border border-black px-3 py-2 text-right">Qty / UOM</th>
                  <th className="border border-black px-3 py-2 text-right">Rate</th>
                  <th className="border border-black px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const lineTotal = num(line.weight) * num(line.rate);
                  return (
                    <tr key={line.id}>
                      <td className="border border-black px-3 py-2">{line.itemName || "-"}</td>
                      <td className="border border-black px-3 py-2">{[line.category, line.lotDetails, line.type].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="border border-black px-3 py-2 text-right">
                        {line.pieces || "0"} / {line.weight || "0"}
                      </td>
                      <td className="border border-black px-3 py-2 text-right">{formatMoney(num(line.rate), "USD")}</td>
                      <td className="border border-black px-3 py-2 text-right">{formatMoney(lineTotal, "USD")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(total, "USD")}</span>
              </div>
              <div className="flex items-center justify-between border-t border-black pt-2 text-lg font-bold">
                <span>Total Amount</span>
                <span>{formatMoney(total, "USD")}</span>
              </div>
            </div>
          </section>

          <footer className="mt-10 border-t border-black pt-4 text-sm">
            <p>
              <span className="font-semibold">Notes:</span> {memo || "-"}
            </p>
            <p className="mt-3 font-semibold">Thank you for your business.</p>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible;
          }

          #invoice-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            background: #fff;
            color: #000;
          }
        }
      `}</style>
    </div>
  );
}
