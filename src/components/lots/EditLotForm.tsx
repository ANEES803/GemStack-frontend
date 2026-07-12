"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppDialog } from "@/components/ui/AppDialog";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { formatMoney } from "@/lib/format";
import { getAccessToken } from "@/lib/authClient";
import { listPostableGlAccounts, type GlAccountDto } from "@/lib/glApi";
import {
  addPurchaseLotPayment,
  fetchVendors,
  getPurchaseLotByCode,
  patchPurchaseLot,
  type PurchaseLotDetail,
  type VendorDto,
} from "@/lib/purchaseLotsApi";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";
import { loadLots, lotRowFromForm, saveLots, updateLotInList } from "@/lib/lotsListStorage";

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function num(v: string): number {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

const PAY_FIELD = "gs-field mt-1 min-h-[2.75rem] w-full text-sm";

const FIELD_LABEL = "block text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]";
const FIELD_INPUT =
  "mt-2 w-full rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-sm text-[var(--gs-text)] outline-none transition focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20";

const PAYMENT_TERM_OPTIONS = ["Due on receipt", "Net 7", "Net 15", "Net 30"] as const;

const CARAT_UOMS = new Set(["ct", "cts", "carat", "carats"]);

type Props = {
  lotCode: string;
};

type ApiLineRow = {
  id: string;
  item_name: string;
  category: string;
  lot_details: string;
  line_type: string;
  quantity: string;
  uom: string;
  pieces: string;
  rate: string;
};

function humanizePaymentStatus(s: string): string {
  const x = s.toLowerCase();
  if (x === "unpaid") return "Unpaid";
  if (x === "partially_paid") return "Partially paid";
  if (x === "paid") return "Paid";
  return s;
}

function detailToLineRows(detail: PurchaseLotDetail): ApiLineRow[] {
  return detail.lines.map((ln) => ({
    id: ln.id,
    item_name: ln.item_name,
    category: ln.category,
    lot_details: ln.lot_details,
    line_type: ln.line_type,
    quantity: String(ln.quantity),
    uom: ln.uom || "ct",
    pieces: String(ln.pieces ?? 0),
    rate: String(ln.rate),
  }));
}

export function EditLotForm({ lotCode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const todayIso = useHydratedTodayIso();
  const { pushToast } = useAppNotifications();
  const baselineRef = useRef<string>("");
  const openPayFromQueryRef = useRef(false);
  const [apiMode, setApiMode] = useState(false);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "not_found">("loading");
  const [purchaseLotId, setPurchaseLotId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [partyVendorId, setPartyVendorId] = useState("");

  const [lotCodeInput, setLotCodeInput] = useState("");
  const [lotCodeError, setLotCodeError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [carats, setCarats] = useState("");
  const [cost, setCost] = useState("");
  const [rate, setRate] = useState("");
  const [dateIso, setDateIso] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Due on receipt");
  const [referenceNo, setReferenceNo] = useState("");
  const [memo, setMemo] = useState("");
  const [postedToGl, setPostedToGl] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [payStatus, setPayStatus] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [lineRows, setLineRows] = useState<ApiLineRow[]>([]);

  const [glAccounts, setGlAccounts] = useState<GlAccountDto[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [paidFromAccountId, setPaidFromAccountId] = useState("");
  const [paidToAccountId, setPaidToAccountId] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "save-new">("save");

  useEffect(() => {
    setApiMode(Boolean(getAccessToken()));
  }, []);

  useEffect(() => {
    if (searchParams.get("pay") === "1") openPayFromQueryRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (todayIso) setPayDate((d) => d || todayIso);
  }, [todayIso]);

  const totalNum = useMemo(() => Number(totalAmount) || 0, [totalAmount]);
  const paidNum = useMemo(() => Number(paidAmount) || 0, [paidAmount]);
  const balanceNum = useMemo(() => Math.max(totalNum - paidNum, 0), [totalNum, paidNum]);
  const isFullyPaid = useMemo(
    () => (payStatus || "").toLowerCase() === "paid" || balanceNum <= 0.0005,
    [payStatus, balanceNum],
  );
  const canRecordPayment = useMemo(
    () => Boolean(apiMode && purchaseLotId && balanceNum > 0.0005),
    [apiMode, purchaseLotId, balanceNum],
  );

  const paidFromOptions = useMemo(
    () =>
      glAccounts
        .filter((a) => a.is_active && a.allow_posting && !a.is_group && (a.account_type || "").toLowerCase() === "asset")
        .sort((a, b) => `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`)),
    [glAccounts],
  );
  const paidToOptions = useMemo(
    () =>
      glAccounts
        .filter((a) => a.is_active && a.allow_posting && !a.is_group)
        .sort((a, b) => `${a.code} ${a.name}`.localeCompare(`${b.code} ${b.name}`)),
    [glAccounts],
  );
  const defaultPayable = useMemo(
    () =>
      glAccounts.find((a) => (a.account_subtype || "").toLowerCase() === "payable") ??
      glAccounts.find((a) => (a.account_type || "").toLowerCase() === "liability") ??
      null,
    [glAccounts],
  );
  const paidFromAccount = useMemo(() => glAccounts.find((a) => a.id === paidFromAccountId) ?? null, [glAccounts, paidFromAccountId]);
  const paidToAccount = useMemo(() => glAccounts.find((a) => a.id === paidToAccountId) ?? null, [glAccounts, paidToAccountId]);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listPostableGlAccounts();
        if (!cancelled) setGlAccounts(list);
      } catch {
        if (!cancelled) setPayError("Could not load chart of accounts.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  useEffect(() => {
    if (!payOpen) return;
    setPayError(null);
    setPaySuccess(false);
  }, [payOpen]);

  useEffect(() => {
    if (!payOpen) return;
    setPayAmount(String(balanceNum || totalNum || 0));
    setPaidFromAccountId((prev) => prev || paidFromOptions[0]?.id || "");
    setPaidToAccountId((prev) => prev || defaultPayable?.id || paidToOptions[0]?.id || "");
    setPayReference(referenceNo);
    setPayNotes(memo);
  }, [payOpen, balanceNum, totalNum, referenceNo, memo, paidFromOptions, defaultPayable, paidToOptions]);

  useEffect(() => {
    if (!openPayFromQueryRef.current) return;
    if (loadStatus !== "ready" || !apiMode || !purchaseLotId) return;
    openPayFromQueryRef.current = false;
    setPayOpen(true);
    const path = pathname || `/lots/edit/${encodeURIComponent(lotCode)}`;
    router.replace(path, { scroll: false });
  }, [loadStatus, apiMode, purchaseLotId, router, pathname, lotCode]);

  function setBaselineFromApi(detail: PurchaseLotDetail) {
    baselineRef.current = JSON.stringify({
      lot_code: detail.lot_code,
      vendor_id: detail.vendor_id,
      receipt_date: detail.receipt_date,
      payment_terms: detail.payment_terms,
      reference_no: detail.reference_no,
      memo: detail.memo,
      lines: detailToLineRows(detail),
    });
  }

  useEffect(() => {
    if (apiMode) {
      let cancelled = false;
      (async () => {
        try {
          const [detail, vlist] = await Promise.all([getPurchaseLotByCode(lotCode), fetchVendors()]);
          if (cancelled) return;
          setPurchaseLotId(detail.id);
          setVendors(vlist);
          setLotCodeInput(detail.lot_code);
          setSupplier(detail.vendor_name);
          setPartyVendorId(detail.vendor_id);
          setDateIso(detail.receipt_date);
          setPaymentTerms(detail.payment_terms || "Due on receipt");
          setReferenceNo(detail.reference_no || "");
          setMemo(detail.memo || "");
          setPostedToGl(detail.posted_to_gl);
          setCurrency(detail.currency || "USD");
          setPayStatus(detail.payment_status || detail.status);
          setPaidAmount(String(detail.paid_amount));
          setTotalAmount(String(detail.total_amount));
          setLineRows(detailToLineRows(detail));

          let caratsSum = 0;
          for (const ln of detail.lines) {
            const u = (ln.uom || "").toLowerCase();
            if (CARAT_UOMS.has(u)) {
              caratsSum += Number(ln.quantity);
            }
          }
          if (caratsSum <= 0 && detail.lines.length > 0) {
            caratsSum = Number(detail.lines[0]?.quantity) || 0;
          }
          const totalAmt = Number(detail.total_amount);
          const r = caratsSum > 0 ? totalAmt / caratsSum : 0;
          setCarats(String(caratsSum));
          setCost(String(totalAmt));
          setRate(String(r));
          setBaselineFromApi(detail);
          setLoadStatus("ready");
        } catch {
          if (!cancelled) {
            setLoadStatus("not_found");
            setFormError("Could not load lot. Check login or lot code.");
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    const rows = loadLots();
    const row = rows.find((r) => r.code === lotCode) ?? null;
    if (row) {
      setLotCodeInput(row.code);
      setSupplier(row.supplier);
      setCarats(String(row.carats));
      setCost(String(row.cost));
      setRate(row.carats > 0 ? String(row.cost / row.carats) : "0");
      setDateIso(row.dateIso);
      baselineRef.current = JSON.stringify({
        lot_code: row.code,
        supplier: row.supplier,
        carats: row.carats,
        cost: row.cost,
        rate: row.carats > 0 ? row.cost / row.carats : 0,
        date: row.dateIso,
      });
      setLoadStatus("ready");
    } else {
      setLoadStatus("not_found");
    }
    return undefined;
  }, [lotCode, apiMode]);

  function isDuplicateLotCode(nextCode: string): boolean {
    if (loadStatus !== "ready" || apiMode) return false;
    const normalized = nextCode.trim().toUpperCase();
    if (!normalized) return false;
    const original = (loadLots().find((r) => r.code === lotCode)?.code ?? "").trim().toUpperCase();
    const rows = loadLots();
    return rows.some((row) => row.code.trim().toUpperCase() === normalized && row.code.trim().toUpperCase() !== original);
  }

  function hasUnsavedChanges(): boolean {
    if (loadStatus !== "ready") return false;
    if (apiMode && purchaseLotId) {
      const snap = JSON.stringify({
        lot_code: lotCodeInput.trim(),
        vendor_id: partyVendorId,
        receipt_date: dateIso.trim(),
        payment_terms: paymentTerms,
        reference_no: referenceNo,
        memo,
        lines: lineRows,
      });
      return snap !== baselineRef.current;
    }
    const snap = JSON.stringify({
      lot_code: lotCodeInput.trim(),
      supplier: supplier.trim(),
      carats: Number(carats),
      cost: Number(cost),
      rate: Number(rate),
      date: dateIso.trim(),
    });
    return snap !== baselineRef.current;
  }

  useEffect(() => {
    if (loadStatus !== "ready") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [
    loadStatus,
    lotCodeInput,
    supplier,
    carats,
    cost,
    dateIso,
    apiMode,
    purchaseLotId,
    partyVendorId,
    rate,
    lotCode,
    paymentTerms,
    referenceNo,
    memo,
    lineRows,
  ]);

  function handleCancel() {
    if (hasUnsavedChanges()) {
      setConfirmCancelOpen(true);
      return;
    }
    router.push("/lots");
  }

  const submitPayment = useCallback(async () => {
    const amount = num(payAmount);
    if (amount <= 0) {
      const m = "Payment amount must be greater than 0.";
      setPayError(m);
      pushToast(m, "error");
      return;
    }
    if (amount > balanceNum) {
      const m = `Payment cannot exceed remaining balance (${formatMoney(balanceNum, currency)}).`;
      setPayError(m);
      pushToast(m, "error");
      return;
    }
    if (!paidFromAccountId) {
      const m = "Paid From account is required.";
      setPayError(m);
      pushToast(m, "error");
      return;
    }
    if (!paidToAccountId) {
      const m = "Paid To account is required.";
      setPayError(m);
      pushToast(m, "error");
      return;
    }
    if (!payDate) {
      const m = "Payment date is required.";
      setPayError(m);
      pushToast(m, "error");
      return;
    }
    if (!purchaseLotId) {
      setPayError("Lot is not loaded.");
      return;
    }
    setPaySubmitting(true);
    setPayError(null);
    try {
      const detail = await addPurchaseLotPayment(purchaseLotId, {
        amount,
        payment_method: "bank",
        paid_from: paidFromAccount ? `${paidFromAccount.code} - ${paidFromAccount.name}` : "",
        paid_to: paidToAccount ? `${paidToAccount.code} - ${paidToAccount.name}` : "",
        bank_account: paidFromAccount ? `${paidFromAccount.code} - ${paidFromAccount.name}` : "",
        pay_date: payDate,
        reference_no: payReference,
        notes: payNotes,
        gl_bank_account_id: paidFromAccountId || null,
      });
      setPayStatus(detail.payment_status || detail.status);
      setPaidAmount(String(detail.paid_amount));
      setTotalAmount(String(detail.total_amount));
      setPaySuccess(true);
      pushToast(
        (detail.payment_status || detail.status || "").toLowerCase() === "paid"
          ? "Payment recorded. Lot marked as paid."
          : "Payment recorded. Lot marked as partially paid.",
        "success",
      );
      window.setTimeout(() => {
        setPayOpen(false);
        setPaySuccess(false);
      }, 1200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      setPayError(msg);
      pushToast(msg, "error");
    } finally {
      setPaySubmitting(false);
    }
  }, [
    payAmount,
    balanceNum,
    currency,
    paidFromAccountId,
    paidToAccountId,
    payDate,
    payReference,
    payNotes,
    purchaseLotId,
    paidFromAccount,
    paidToAccount,
    pushToast,
  ]);

  function updateLineRow(id: string, patch: Partial<ApiLineRow>) {
    setLineRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function performSave(action: "save" | "save-new" = "save") {
    const codeValue = lotCodeInput.trim();
    if (!codeValue) {
      setLotCodeError("Lot number is required.");
      return;
    }
    if (!apiMode && isDuplicateLotCode(codeValue)) {
      setLotCodeError("Lot number already exists. Please use a unique lot number.");
      return;
    }
    setLotCodeError(null);

    if (apiMode && purchaseLotId) {
      if (!partyVendorId) {
        setFormError("Supplier is required.");
        return;
      }
      if (!dateIso.trim()) {
        setFormError("Receive date is required.");
        return;
      }
      if (!postedToGl) {
        if (lineRows.length === 0) {
          setFormError("At least one line is required.");
          return;
        }
        for (const ln of lineRows) {
          const q = Number(ln.quantity);
          const rt = Number(ln.rate);
          if (!Number.isFinite(q) || q < 0 || !Number.isFinite(rt) || rt < 0) {
            setFormError("Each line needs valid quantity and rate.");
            return;
          }
        }
      }
      setFormError(null);
      setSaving(true);
      try {
        const body: Parameters<typeof patchPurchaseLot>[1] = {
          lot_code: codeValue,
          vendor_id: partyVendorId || undefined,
          receipt_date: dateIso,
          payment_terms: paymentTerms,
          reference_no: referenceNo,
          memo,
        };
        if (!postedToGl) {
          body.lines = lineRows.map((ln) => ({
            item_name: ln.item_name,
            category: ln.category,
            lot_details: ln.lot_details,
            line_type: ln.line_type,
            quantity: Number(ln.quantity),
            uom: ln.uom || "ct",
            pieces: Number(ln.pieces) || 0,
            rate: Number(ln.rate),
          }));
        }
        const updated = await patchPurchaseLot(purchaseLotId, body);
        setBaselineFromApi(updated);
        setPostedToGl(updated.posted_to_gl);
        setPayStatus(updated.payment_status || updated.status);
        setPaidAmount(String(updated.paid_amount));
        setTotalAmount(String(updated.total_amount));
        setLineRows(detailToLineRows(updated));
        setSaving(false);
        if (action === "save-new") {
          router.push("/lots/new");
          return;
        }
        router.push("/lots");
      } catch (e) {
        setSaving(false);
        setFormError(e instanceof Error ? e.message : "Save failed.");
      }
      return;
    }

    const c = Number(carats);
    const co = Number(cost);
    const r = Number(rate);
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

    const row = loadLots().find((r) => r.code === lotCode);
    if (!row) {
      setSaving(false);
      return;
    }
    const updated = lotRowFromForm(codeValue, supplier, c, co, dateIso);
    const all = loadLots();
    const next = updateLotInList(all, updated, row.code);
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
    void performSave(action);
  }

  if (loadStatus === "loading") {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-8 text-center text-sm text-[var(--gs-muted)]">
        Loading…
      </div>
    );
  }

  if (loadStatus === "not_found") {
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--gs-text)]">Edit lot</h1>
        <p className="mt-1 text-sm text-[var(--gs-muted)]">
          {apiMode
            ? "Header, terms, and lines match what was saved. Lines and amounts are locked after the lot is posted to the general ledger."
            : "Update this lot in local demo storage."}
        </p>
      </div>
      {formError ? (
        <div className="gs-banner-danger mb-4 px-4 py-3">
          {formError}
        </div>
      ) : null}
      {apiMode && postedToGl ? (
        <div
          className="mb-4 rounded-lg border border-[var(--gs-border-strong)] bg-[var(--gs-accent-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--gs-text)]"
          role="status"
        >
          This lot is posted to the general ledger. You can change lot code, supplier, dates, payment terms, reference, and memo. Line items,
          totals, and currency cannot be edited here.
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          attemptSave("save");
        }}
        className="space-y-5 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
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
            {lotCodeError ? <p className="gs-text-danger mt-1 rounded-md bg-[var(--gs-danger-bg)] px-2 py-1 text-xs">{lotCodeError}</p> : null}
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
        </div>

        <div>
          <label htmlFor="edit-lot-supplier" className={FIELD_LABEL}>
            Supplier *
          </label>
          {apiMode ? (
            <select
              id="edit-lot-supplier"
              value={partyVendorId}
              onChange={(e) => {
                const id = e.target.value;
                setPartyVendorId(id);
                const v = vendors.find((x) => x.id === id);
                setSupplier(v?.name ?? "");
              }}
              className={FIELD_INPUT}
              required
            >
              <option value="">Select supplier…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="edit-lot-supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={FIELD_INPUT}
              required
            />
          )}
        </div>

        {apiMode ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-payment-terms" className={FIELD_LABEL}>
                  Payment terms
                </label>
                <select
                  id="edit-payment-terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className={FIELD_INPUT}
                >
                  {!PAYMENT_TERM_OPTIONS.includes(paymentTerms as (typeof PAYMENT_TERM_OPTIONS)[number]) ? (
                    <option value={paymentTerms}>{paymentTerms}</option>
                  ) : null}
                  {PAYMENT_TERM_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-reference" className={FIELD_LABEL}>
                  Reference no.
                </label>
                <input
                  id="edit-reference"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className={FIELD_INPUT}
                />
              </div>
            </div>
            <div>
              <label htmlFor="edit-memo" className={FIELD_LABEL}>
                Memo
              </label>
              <textarea
                id="edit-memo"
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={FIELD_INPUT}
              />
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)]/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-[var(--gs-text)]">
                Payment: {humanizePaymentStatus(payStatus)} · Paid {formatMoney(Number(paidAmount) || 0, currency)} /{" "}
                {formatMoney(Number(totalAmount) || 0, currency)}
                <span className="mt-1 block text-xs font-normal text-[var(--gs-muted)]">
                  Balance: {formatMoney(balanceNum, currency)}
                </span>
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                {canRecordPayment ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPayError(null);
                      setPayOpen(true);
                    }}
                    className="rounded-xl bg-[var(--gs-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
                  >
                    Record payment
                  </button>
                ) : isFullyPaid ? (
                  <span className="inline-flex items-center rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] px-4 py-2.5 text-xs font-semibold text-[var(--gs-muted)]">
                    Fully paid
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <p className={FIELD_LABEL}>Line items</p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--gs-border)]">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase text-[var(--gs-muted)]">
                    <tr>
                      <th className="px-2 py-2">Item</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Details</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">UOM</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Pc</th>
                      <th className="px-2 py-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
                    {lineRows.map((ln) => (
                      <tr key={ln.id}>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.item_name}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { item_name: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.category}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { category: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.lot_details}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { lot_details: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.line_type}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { line_type: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.uom}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { uom: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.quantity}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { quantity: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs text-right", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.pieces}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { pieces: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs text-right", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={ln.rate}
                            disabled={postedToGl}
                            onChange={(e) => updateLineRow(ln.id, { rate: e.target.value })}
                            className={cx(FIELD_INPUT, "!mt-0 py-1.5 text-xs text-right", postedToGl && "cursor-not-allowed opacity-70")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
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
                  const rr = Number(rate);
                  if (Number.isFinite(c) && Number.isFinite(rr)) {
                    setCost(String(c * rr));
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
                  const rr = Number(nextRate);
                  if (Number.isFinite(c) && Number.isFinite(rr)) {
                    setCost(String(c * rr));
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
        )}

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
        open={payOpen}
        onClose={() => {
          if (paySubmitting) return;
          setPayOpen(false);
        }}
        titleId="edit-lot-pay-title"
        title={isFullyPaid ? "Payment details" : "Record payment"}
        size="full"
        description={
          isFullyPaid
            ? "This lot is fully paid. You cannot post another payment while the balance is zero."
            : "Same form as when creating a lot. Pick where cash leaves the business (Paid from) and which account shows the bill being paid (Paid to—often Accounts payable). A journal posts when the lot is on the GL."
        }
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={paySubmitting}
              onClick={() => setPayOpen(false)}
              className="rounded-lg border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!canRecordPayment || paySubmitting || paySuccess}
              onClick={() => void submitPayment()}
              className="inline-flex min-w-[10rem] items-center justify-center rounded-lg bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gs-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paySubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                  Recording…
                </span>
              ) : (
                "Submit payment"
              )}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {paySuccess ? (
            <div className="gs-banner-success px-3 py-3 sm:col-span-2">
              Payment saved successfully.
            </div>
          ) : null}
          {payError ? (
            <div className="gs-banner-danger px-3 py-3 sm:col-span-2">
              {payError}
            </div>
          ) : null}
          {!canRecordPayment && !isFullyPaid ? (
            <div className="sm:col-span-2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)] px-3 py-2 text-sm text-[var(--gs-text)]">
              Sign in and load this lot from the server to record payments.
            </div>
          ) : null}
          {isFullyPaid ? (
            <div className="sm:col-span-2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)] px-3 py-2 text-sm text-[var(--gs-text)]">
              Balance is {formatMoney(balanceNum, currency)}. No further payment can be recorded for this lot.
            </div>
          ) : null}
          <div className="lg:col-span-3 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)] px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gs-muted)]">Money flow</p>
            <p className="mt-1 text-sm font-semibold text-[var(--gs-text)]">
              {paidFromAccount ? `${paidFromAccount.code} - ${paidFromAccount.name}` : "Select Paid From"} →{" "}
              {paidToAccount ? `${paidToAccount.code} - ${paidToAccount.name}` : "Select Paid To"}
            </p>
          </div>
          <div className="lg:col-span-1">
            <label className="gs-label">Paid from</label>
            <p className="mt-1 text-xs leading-snug text-[var(--gs-muted)]">
              Bank or cash account — the asset account money leaves when you pay the supplier.
            </p>
            <select
              value={paidFromAccountId}
              onChange={(e) => setPaidFromAccountId(e.target.value)}
              className={PAY_FIELD}
              disabled={!canRecordPayment || isFullyPaid}
            >
              <option value="">Select account…</option>
              {paidFromOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="gs-label">Paid to</label>
            <p className="mt-1 text-xs leading-snug text-[var(--gs-muted)]">
              Usually Accounts payable (or similar) — the liability side so the books show you paid down what you owed for this lot.
            </p>
            <select
              value={paidToAccountId}
              onChange={(e) => setPaidToAccountId(e.target.value)}
              className={PAY_FIELD}
              disabled={!canRecordPayment || isFullyPaid}
            >
              <option value="">Select account…</option>
              {paidToOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="gs-label">Vendor / Supplier</label>
            <input value={supplier} readOnly className={`${PAY_FIELD} bg-[var(--gs-hover)]`} />
          </div>
          <div>
            <label className="gs-label">Amount</label>
            <input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className={PAY_FIELD}
              disabled={!canRecordPayment || isFullyPaid}
            />
            <p className="mt-1 text-xs text-[var(--gs-muted)]">Remaining: {formatMoney(balanceNum, currency)}</p>
          </div>
          <div>
            <label className="gs-label">Date</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className={PAY_FIELD}
              disabled={!canRecordPayment || isFullyPaid}
            />
          </div>
          <div>
            <label className="gs-label">Reference No</label>
            <input value={payReference} onChange={(e) => setPayReference(e.target.value)} className={PAY_FIELD} />
          </div>
          <div className="lg:col-span-3">
            <label className="gs-label">Notes (optional)</label>
            <textarea rows={3} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className={`${PAY_FIELD} min-h-[5rem] resize-y py-3`} />
          </div>
        </div>
      </AppDialog>

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
                void performSave(pendingAction);
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
