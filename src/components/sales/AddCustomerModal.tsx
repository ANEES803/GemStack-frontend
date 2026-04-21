"use client";

import { useEffect, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { AppDialog } from "@/components/ui/AppDialog";
import type { DemoCustomer } from "@/lib/demoCustomers";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (c: Omit<DemoCustomer, "id">) => void;
};

export function AddCustomerModal({ open, onClose, onSave }: Props) {
  const { pushToast } = useAppNotifications();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setDetail("");
    }
  }, [open]);

  function save() {
    if (!name.trim()) {
      pushToast("Name is required.", "error");
      return;
    }
    onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), detail: detail.trim() });
    onClose();
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      titleId="add-customer-title"
      title="Add new customer"
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[var(--gs-border)] px-4 py-3 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)] sm:w-auto sm:py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="w-full rounded-xl bg-[var(--gs-accent)] px-5 py-3 text-sm font-semibold text-white sm:w-auto sm:py-2.5"
          >
            Save customer
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">Detail / notes</label>
          <textarea
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="mt-1.5 w-full resize-y rounded-xl border border-[var(--gs-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
          />
        </div>
      </div>
    </AppDialog>
  );
}
