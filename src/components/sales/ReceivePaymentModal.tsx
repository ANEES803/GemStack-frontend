"use client";

import { useEffect, useMemo, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { AppDialog } from "@/components/ui/AppDialog";
import { listPostableGlAccounts, type GlAccountDto } from "@/lib/glApi";
import { getAccessToken } from "@/lib/authClient";
import type { ReceivePaymentSubmitPayload } from "@/lib/salesInvoicesApi";

export const PAYMENT_OPTIONS = ["Cash", "Bank Transfer", "Direct to Bank Account", "Cheque", "Online"] as const;

export type ReceivePaymentInitial = {
  invoiceId?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  detail?: string;
  amount?: string;
};

export type OpenInvoicePickerOption = {
  apiId: string;
  invoiceCode: string;
  customerName: string;
  balanceDue: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: ReceivePaymentInitial;
  title?: string;
  amountDue?: number;
  openInvoices?: OpenInvoicePickerOption[];
  requireInvoiceSelection?: boolean;
  onSubmitPayment?: (payload: ReceivePaymentSubmitPayload) => void | Promise<void>;
};

export function ReceivePaymentModal({
  open,
  onClose,
  initial,
  title = "Receive payment",
  amountDue,
  openInvoices = [],
  requireInvoiceSelection = false,
  onSubmitPayment,
}: Props) {
  const { pushToast } = useAppNotifications();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_OPTIONS)[number]>("Cash");
  const [date, setDate] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [bankAccounts, setBankAccounts] = useState<GlAccountDto[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const selectedInvoice = useMemo(
    () => openInvoices.find((inv) => inv.apiId === selectedInvoiceId),
    [openInvoices, selectedInvoiceId],
  );

  const effectiveAmountDue = useMemo(() => {
    if (selectedInvoice && selectedInvoice.balanceDue > 0) return selectedInvoice.balanceDue;
    if (typeof amountDue === "number" && amountDue > 0) return amountDue;
    return undefined;
  }, [selectedInvoice, amountDue]);

  useEffect(() => {
    if (!open) return;
    const presetId = initial?.invoiceId ?? "";
    const match = openInvoices.find((inv) => inv.apiId === presetId || inv.invoiceCode === presetId);
    setSelectedInvoiceId(match?.apiId ?? presetId);
    setCustomerName(initial?.customerName ?? match?.customerName ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setNotes(initial?.detail ?? "");
    setAmount(initial?.amount ?? (match ? String(match.balanceDue) : String(amountDue ?? "")));
    setMethod("Cash");
    setDate(new Date().toISOString().slice(0, 10));
    setBankAccountId("");
    setReferenceNo("");
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
  }, [open, initial, amountDue, openInvoices]);

  useEffect(() => {
    if (!open || !getAccessToken()) {
      setBankAccounts([]);
      return;
    }
    let cancelled = false;
    void listPostableGlAccounts()
      .then((accounts) => {
        if (!cancelled) {
          setBankAccounts(accounts.filter((a) => a.account_type === "asset" && a.is_active));
        }
      })
      .catch(() => {
        if (!cancelled) setBankAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (selectedInvoice) {
      setCustomerName(selectedInvoice.customerName);
      if (!initial?.amount) {
        setAmount(String(selectedInvoice.balanceDue));
      }
    }
  }, [open, selectedInvoice, initial?.amount]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
    };
  }, [receiptPreviewUrl]);

  const requiresBank = method === "Bank Transfer" || method === "Direct to Bank Account" || method === "Online";
  const amountNum = Number(amount || 0);

  async function submit() {
    const invoiceApiId = selectedInvoice?.apiId ?? initial?.invoiceId ?? "";
    if ((requireInvoiceSelection || getAccessToken()) && !invoiceApiId) {
      pushToast("Please select an invoice to apply this payment.", "error");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      pushToast("Amount must be greater than 0.", "error");
      return;
    }
    if (typeof effectiveAmountDue === "number" && amountNum > effectiveAmountDue + 0.0001) {
      pushToast(`Amount cannot exceed total due (${effectiveAmountDue.toFixed(2)}).`, "error");
      return;
    }
    if (requiresBank && bankAccounts.length > 0 && !bankAccountId) {
      pushToast("Please select a company bank account.", "error");
      return;
    }
    if (!date) {
      pushToast("Date is required.", "error");
      return;
    }
    const payload: ReceivePaymentSubmitPayload = {
      invoiceApiId,
      amount: amountNum,
      method,
      date,
      referenceNo,
      notes,
      glBankAccountId: requiresBank && bankAccountId ? bankAccountId : null,
    };
    if (onSubmitPayment) {
      await onSubmitPayment(payload);
    } else {
      pushToast(
        `Demo: Record payment — Method: ${method}; Invoice: ${invoiceApiId || "—"}; Customer: ${customerName || "—"}; Amount: ${amount || "—"}. Sign in to post to the server.`,
        "info",
      );
    }
    onClose();
  }

  const fieldLabel = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--gs-muted)]";
  const inputClass =
    "w-full min-h-[42px] rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-3 py-2 text-sm text-[var(--gs-text)] shadow-sm outline-none transition placeholder:text-[var(--gs-muted)] focus:border-[var(--gs-accent)] focus:ring-2 focus:ring-[var(--gs-accent)]/20";

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      titleId="receive-payment-title"
      title={title}
      description="Choose how the customer paid and confirm details."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-[var(--gs-border)] bg-[var(--gs-card)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] shadow-sm transition hover:bg-[var(--gs-hover)] sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            className="w-full rounded-lg bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)] sm:w-auto"
          >
            Record payment
          </button>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        <fieldset className="rounded-xl border border-[var(--gs-border)]/90 bg-[var(--gs-hover)]/60 p-3 shadow-sm sm:p-3.5">
          <legend className="sr-only">Payment method</legend>
          <p id="receive-payment-method-label" className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">
            Payment method *
          </p>
          <div
            className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2"
            role="radiogroup"
            aria-labelledby="receive-payment-method-label"
          >
            {PAYMENT_OPTIONS.map((opt) => {
              const selected = method === opt;
              return (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 shadow-sm transition sm:px-2.5 sm:py-2 ${
                    selected
                      ? "border-[var(--gs-accent)] bg-[var(--gs-card)] ring-1 ring-[var(--gs-accent)]/30"
                      : "border-[var(--gs-border)]/90 bg-[var(--gs-card)] hover:border-[var(--gs-border-strong)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="receive-payment-method"
                    value={opt}
                    checked={selected}
                    onChange={() => setMethod(opt)}
                    className="h-3.5 w-3.5 shrink-0 border-[var(--gs-border-strong)] text-[var(--gs-accent)] focus:ring-[var(--gs-accent)]"
                  />
                  <span
                    className={`min-w-0 flex-1 text-left text-[11px] font-semibold leading-snug sm:text-xs ${
                      selected ? "text-[var(--gs-text)]" : "text-[var(--gs-muted)]"
                    }`}
                  >
                    {opt}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-3 shadow-sm sm:p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[var(--gs-muted)]">Invoice &amp; payer</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Invoice *</label>
              {openInvoices.length > 0 ? (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select open invoice...</option>
                  {openInvoices.map((inv) => (
                    <option key={inv.apiId} value={inv.apiId}>
                      {inv.invoiceCode} · {inv.customerName} · due {inv.balanceDue.toFixed(2)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  placeholder="Invoice UUID (from server invoice)"
                  className={inputClass}
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Customer name</label>
              <input value={customerName} readOnly className={`${inputClass} bg-[var(--gs-hover)]/60`} />
            </div>
            <div>
              <label className={fieldLabel}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={fieldLabel}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Amount received *</label>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} />
              {typeof effectiveAmountDue === "number" ? (
                <p className="mt-1 text-xs text-[var(--gs-muted)]">Balance due: {effectiveAmountDue.toFixed(2)}</p>
              ) : null}
            </div>
            {requiresBank ? (
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Company bank account {bankAccounts.length > 0 ? "*" : ""}</label>
                {bankAccounts.length > 0 ? (
                  <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={inputClass}>
                    <option value="">Select bank account...</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} — {acc.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    No GL bank accounts configured. Payment will use the default bank from accounting settings.
                  </p>
                )}
              </div>
            ) : null}
            <div>
              <label className={fieldLabel}>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={fieldLabel}>Reference no</label>
              <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="TXN-12345 / CHQ-00991" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Upload Payment Receipt</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className={inputClass}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (receiptPreviewUrl) {
                    URL.revokeObjectURL(receiptPreviewUrl);
                  }
                  setReceiptFile(file);
                  if (file && file.type.startsWith("image/")) {
                    setReceiptPreviewUrl(URL.createObjectURL(file));
                  } else {
                    setReceiptPreviewUrl(null);
                  }
                }}
              />
              {receiptFile ? (
                <div className="mt-2 rounded-lg border border-[var(--gs-border)] bg-[var(--gs-hover)] p-3">
                  <p className="text-xs font-medium text-[var(--gs-text)]">{receiptFile.name}</p>
                  {receiptPreviewUrl ? (
                    <img src={receiptPreviewUrl} alt="Receipt preview" className="mt-2 max-h-28 rounded-md border border-[var(--gs-border)] object-contain" />
                  ) : (
                    <p className="mt-1 text-xs text-[var(--gs-muted)]">PDF selected</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (receiptPreviewUrl) URL.revokeObjectURL(receiptPreviewUrl);
                      setReceiptFile(null);
                      setReceiptPreviewUrl(null);
                    }}
                    className="mt-2 text-xs font-semibold text-[var(--gs-accent)] hover:text-[var(--gs-accent-hover)]"
                  >
                    Remove file
                  </button>
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} min-h-[72px] resize-y py-2`}
              />
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
