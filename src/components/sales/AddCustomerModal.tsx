"use client";

import { useEffect, useState } from "react";

import type { DemoCustomer } from "@/lib/demoCustomers";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (c: Omit<DemoCustomer, "id">) => void;
};

export function AddCustomerModal({ open, onClose, onSave }: Props) {
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

  if (!open) return null;

  function save() {
    if (!name.trim()) {
      window.alert("Name is required.");
      return;
    }
    onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), detail: detail.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-3 pt-8 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--gs-navy)]">Add new customer</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Detail / notes</label>
            <textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
            Cancel
          </button>
          <button type="button" onClick={save} className="rounded-full bg-[var(--gs-accent)] px-5 py-2 text-sm font-semibold text-white">
            Save customer
          </button>
        </div>
      </div>
    </div>
  );
}
