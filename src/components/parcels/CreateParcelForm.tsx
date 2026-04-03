"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { appendDemoParcel, type DemoParcelRow } from "@/lib/demoParcels";
import { useHydratedTodayIso } from "@/lib/useHydratedTodayIso";

const LOTS = ["LO-09", "LO-08", "LO-07", "LO-06"];
const GRADES = ["A", "B", "C"] as const;
const FEP_OPTIONS = ["—", "A. Khan", "M. Ali", "S. Noor"] as const;
const STATUSES = ["Warehouse", "With FEP", "In transit", "Reserved"] as const;

function parseCt(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function CreateParcelForm() {
  const router = useRouter();
  const todayIso = useHydratedTodayIso();

  const [parcelPreview, setParcelPreview] = useState("P-······");
  useEffect(() => {
    const t = Date.now().toString(36).toUpperCase();
    setParcelPreview(`P-${t.slice(-6)}`);
  }, []);

  const [assignedDate, setAssignedDate] = useState("");
  useEffect(() => {
    if (todayIso) setAssignedDate((d) => d || todayIso);
  }, [todayIso]);

  const [sourceLot, setSourceLot] = useState(LOTS[0] ?? "");
  const [grade, setGrade] = useState<(typeof GRADES)[number]>("A");
  const [carats, setCarats] = useState("");
  const [fep, setFep] = useState<(typeof FEP_OPTIONS)[number]>("—");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Warehouse");
  const [notes, setNotes] = useState("");

  const caratsNum = useMemo(() => parseCt(carats), [carats]);

  function validate(): string | null {
    if (!assignedDate) return "Assignment / split date is required.";
    if (caratsNum <= 0) return "Carat weight must be greater than 0.";
    return null;
  }

  function onSave() {
    const err = validate();
    if (err) {
      window.alert(err);
      return;
    }
    const display = (() => {
      const s = caratsNum.toFixed(2).replace(/\.?0+$/, "");
      return s || "0";
    })();
    const row: DemoParcelRow = {
      code: parcelPreview,
      lot: sourceLot,
      grade,
      carats: caratsNum,
      caratsDisplay: display,
      fep: fep === "—" ? "—" : fep,
      status,
      dateIso: assignedDate,
    };
    appendDemoParcel(row);
    console.log("[CreateParcel] demo save", { ...row, notes: notes.trim() || undefined });
    window.alert("Demo: parcel saved (stored in this browser).");
    router.push("/parcels");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-1 sm:px-0">
      <div>
        <Link
          href="/parcels"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gs-accent)] transition hover:text-[var(--gs-accent-hover)]"
        >
          ← Back to parcels
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--gs-navy)] md:text-3xl">New parcel</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--gs-muted)]">
          Split inventory from a lot into a graded parcel. Assign FEP when stock leaves the warehouse. Demo only until the API is
          connected.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--gs-border)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_10px_28px_rgba(15,23,42,0.05)] sm:p-8">
        <div className="space-y-8">
          <section className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Parcel code</label>
              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-slate-700">
                {parcelPreview}
              </p>
              <p className="mt-1 text-xs text-[var(--gs-muted)]">Generated for this session (demo).</p>
            </div>
            <div>
              <label htmlFor="parcel-date" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Split / assignment date <span className="text-red-500">*</span>
              </label>
              <input
                id="parcel-date"
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none ring-[var(--gs-accent)]/25 focus:border-[var(--gs-accent)] focus:ring-4"
                required
              />
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="parcel-lot" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Source lot <span className="text-red-500">*</span>
              </label>
              <select
                id="parcel-lot"
                value={sourceLot}
                onChange={(e) => setSourceLot(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              >
                {LOTS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="parcel-grade" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Grade <span className="text-red-500">*</span>
              </label>
              <select
                id="parcel-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value as (typeof GRADES)[number])}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="parcel-ct" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Weight (carats) <span className="text-red-500">*</span>
              </label>
              <input
                id="parcel-ct"
                inputMode="decimal"
                value={carats}
                onChange={(e) => setCarats(e.target.value)}
                placeholder="e.g. 42.5"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              />
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="parcel-fep" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                FEP holder
              </label>
              <select
                id="parcel-fep"
                value={fep}
                onChange={(e) => setFep(e.target.value as (typeof FEP_OPTIONS)[number])}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              >
                {FEP_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f === "—" ? "Not assigned" : f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="parcel-status" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                Status
              </label>
              <select
                id="parcel-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section>
            <label htmlFor="parcel-notes" className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Notes
            </label>
            <textarea
              id="parcel-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — internal reference, channel, or split notes."
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--gs-accent)] focus:ring-2"
            />
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/parcels"
              className="inline-flex justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={onSave}
              className="inline-flex justify-center rounded-full bg-[var(--gs-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
            >
              Save parcel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
