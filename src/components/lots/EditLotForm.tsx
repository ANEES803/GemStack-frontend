"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppDialog } from "@/components/ui/AppDialog";
import {
  loadLots,
  lotRowFromForm,
  saveLots,
  updateLotInList,
  type LotListRow,
} from "@/lib/lotsListStorage";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const FIELD_LABEL = "block text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]";
const FIELD_INPUT =
  "mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-sm text-[var(--gs-text)] outline-none transition focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20";

type Props = {
  lotCode: string;
};

export function EditLotForm({ lotCode }: Props) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<LotListRow | null | undefined>(undefined);
  const [lotCodeInput, setLotCodeInput] = useState("");
  const [lotCodeError, setLotCodeError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [carats, setCarats] = useState("");
  const [cost, setCost] = useState("");
  const [rate, setRate] = useState("");
  const [dateIso, setDateIso] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "save-new">("save");

  useEffect(() => {
    const rows = loadLots();
    const row = rows.find((r) => r.code === lotCode) ?? null;
    setLoaded(row);
    if (row) {
      setLotCodeInput(row.code);
      setSupplier(row.supplier);
      setCarats(String(row.carats));
      setCost(String(row.cost));
      setRate(row.carats > 0 ? String(row.cost / row.carats) : "0");
      setDateIso(row.dateIso);
    }
  }, [lotCode]);

  function isDuplicateLotCode(nextCode: string): boolean {
    if (!loaded) return false;
    const normalized = nextCode.trim().toUpperCase();
    if (!normalized) return false;
    const original = loaded.code.trim().toUpperCase();
    const rows = loadLots();
    return rows.some((row) => row.code.trim().toUpperCase() === normalized && row.code.trim().toUpperCase() !== original);
  }

  function hasUnsavedChanges(): boolean {
    if (!loaded) return false;
    return (
      lotCodeInput.trim() !== loaded.code ||
      supplier.trim() !== loaded.supplier ||
      Number(carats) !== loaded.carats ||
      Number(cost) !== loaded.cost ||
      dateIso.trim() !== loaded.dateIso
    );
  }

  useEffect(() => {
    if (loaded === undefined || loaded === null) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [loaded, lotCodeInput, supplier, carats, cost, dateIso]);

  function handleCancel() {
    if (hasUnsavedChanges()) {
      setConfirmCancelOpen(true);
      return;
    }
    router.push("/lots");
  }

  function performSave(action: "save" | "save-new" = "save") {
    if (!loaded) return;
    const codeValue = lotCodeInput.trim();
    const c = Number(carats);
    const co = Number(cost);
    const r = Number(rate);
    if (!codeValue) {
      setLotCodeError("Lot number is required.");
      return;
    }
    if (isDuplicateLotCode(codeValue)) {
      setLotCodeError("Lot number already exists. Please use a unique lot number.");
      return;
    }
    setLotCodeError(null);
    if (!supplier.trim()) {
      setFormError("Supplier is required.");
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      setFormError("Enter a valid carats value.");
      return;
    }
    if (!Number.isFinite(co) || co < 0) {
      setFormError("Enter a valid total cost.");
      return;
    }
    if (!Number.isFinite(r) || r < 0) {
      setFormError("Enter a valid rate.");
      return;
    }
    if (!dateIso.trim()) {
      setFormError("Receive date is required.");
      return;
    }
    setFormError(null);
    setSaving(true);
    const updated = lotRowFromForm(codeValue, supplier, c, co, dateIso);
    const all = loadLots();
    const next = updateLotInList(all, updated, loaded.code);
    saveLots(next);
    setSaving(false);
    if (action === "save-new") {
      router.push("/lots/new");
      return;
    }
    router.push("/lots");
  }

  function attemptSave(action: "save" | "save-new") {
    if (hasUnsavedChanges()) {
      setPendingAction(action);
      setConfirmSaveOpen(true);
      return;
    }
    performSave(action);
  }

  if (loaded === undefined) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-8 text-center text-sm text-[var(--gs-muted)]">
        Loading…
      </div>
    );
  }

  if (loaded === null) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-8 text-center">
        <p className="text-sm text-[var(--gs-muted)]">Lot not found.</p>
        <Link href="/lots" className="text-sm font-semibold text-[var(--gs-accent)] hover:underline">
          Back to lots
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--gs-text)]">Edit lot</h1>
      </div>
      {formError ? (
        <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {formError}
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          attemptSave("save");
        }}
        className="space-y-5 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm"
      >
        <div>
          <label htmlFor="edit-lot-code" className={FIELD_LABEL}>
            Lot number *
          </label>
          <input
            id="edit-lot-code"
            type="text"
            value={lotCodeInput}
            onChange={(e) => {
              setLotCodeInput(e.target.value);
              if (lotCodeError) setLotCodeError(null);
            }}
            className={cx(FIELD_INPUT, lotCodeError ? "border-red-500 ring-1 ring-red-400/50" : undefined)}
            required
          />
          {lotCodeError ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{lotCodeError}</p> : null}
        </div>
        <div>
          <label htmlFor="edit-lot-supplier" className={FIELD_LABEL}>
            Supplier *
          </label>
          <input
            id="edit-lot-supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className={FIELD_INPUT}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="edit-lot-carats" className={FIELD_LABEL}>
              Carats *
            </label>
            <input
              id="edit-lot-carats"
              type="number"
              min={0}
              step="any"
              value={carats}
              onChange={(e) => {
                const nextCarats = e.target.value;
                setCarats(nextCarats);
                const c = Number(nextCarats);
                const r = Number(rate);
                if (Number.isFinite(c) && Number.isFinite(r)) {
                  setCost(String(c * r));
                }
              }}
              className={FIELD_INPUT}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-lot-rate" className={FIELD_LABEL}>
              Rate *
            </label>
            <input
              id="edit-lot-rate"
              type="number"
              min={0}
              step="any"
              value={rate}
              onChange={(e) => {
                const nextRate = e.target.value;
                setRate(nextRate);
                const c = Number(carats);
                const r = Number(nextRate);
                if (Number.isFinite(c) && Number.isFinite(r)) {
                  setCost(String(c * r));
                }
              }}
              className={FIELD_INPUT}
              required
            />
          </div>
          <div>
            <label htmlFor="edit-lot-cost" className={FIELD_LABEL}>
              Total cost *
            </label>
            <input
              id="edit-lot-cost"
              type="number"
              min={0}
              step="1"
              value={cost}
              onChange={(e) => {
                const nextCost = e.target.value;
                setCost(nextCost);
                const c = Number(carats);
                const co = Number(nextCost);
                if (Number.isFinite(c) && c > 0 && Number.isFinite(co)) {
                  setRate(String(co / c));
                }
              }}
              className={FIELD_INPUT}
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="edit-lot-date" className={FIELD_LABEL}>
            Receive date *
          </label>
          <input
            id="edit-lot-date"
            type="date"
            value={dateIso}
            onChange={(e) => setDateIso(e.target.value)}
            className={FIELD_INPUT}
            required
          />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => attemptSave("save-new")}
            className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)] disabled:opacity-60"
          >
            Save & new
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-hover)]"
          >
            Cancel
          </button>
        </div>
      </form>
      <AppDialog
        open={confirmSaveOpen}
        onClose={() => setConfirmSaveOpen(false)}
        titleId="confirm-edit-save-title"
        title="Save changes?"
        description="You have modified this lot. Do you want to save these changes?"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmSaveOpen(false)}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
            >
              No
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmSaveOpen(false);
                performSave(pendingAction);
              }}
              className="rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)]"
            >
              Yes, save
            </button>
          </div>
        }
      >
        <p className="text-sm text-[var(--gs-muted)]">Select an option to continue.</p>
      </AppDialog>
      <AppDialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        titleId="confirm-edit-cancel-title"
        title="Cancel without saving?"
        description="You have unsaved changes. Are you sure you want to cancel?"
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
        <p className="text-sm text-[var(--gs-muted)]">Your changes will be lost if you continue.</p>
      </AppDialog>
    </div>
  );
}
