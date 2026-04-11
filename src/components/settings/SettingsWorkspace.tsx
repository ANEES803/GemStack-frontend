"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggleRow } from "@/components/theme";

type Tab = "appearance" | "company" | "tax" | "account_types" | "workflow" | "integrations";

export function SettingsWorkspace() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get("tab") as Tab | null) ?? "company";

  useEffect(() => {
    if (!sp.get("tab")) router.replace("/settings?tab=company", { scroll: false });
  }, [router, sp]);

  const setTab = (t: Tab) => router.push(`/settings?tab=${t}`, { scroll: false });

  const [companyName, setCompanyName] = useState("GemStack Trading Co.");
  const [fiscalStart, setFiscalStart] = useState("2026-01-01");
  const [gstLabel, setGstLabel] = useState("GST");
  const [gstRate, setGstRate] = useState("18");
  const [baseCurrency, setBaseCurrency] = useState("PKR");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <p className="text-sm leading-relaxed text-[var(--gs-muted)]">
        Company profile, fiscal calendar, tax & currency, account types, workflow, and integrations — front-end only until APIs are wired.
      </p>

      <div className="flex flex-wrap gap-1 rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-2 shadow-sm transition-colors duration-200 sm:p-3">
        {(
          [
            ["appearance", "Appearance"],
            ["company", "Company & fiscal"],
            ["tax", "Tax & currency"],
            ["account_types", "Account types"],
            ["workflow", "Workflow / approvals"],
            ["integrations", "Integrations"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition duration-200 sm:text-sm ${
              tab === id
                ? "bg-[var(--gs-pill-active-bg)] text-[var(--gs-pill-active-text)]"
                : "text-[var(--gs-muted)] hover:bg-black/[0.04] dark:hover:bg-[var(--gs-card)]/[0.06]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "appearance" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Appearance</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Workspace theme and display preferences.</p>
          <div className="mt-6 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4 transition-colors duration-200">
            <ThemeToggleRow />
          </div>
        </section>
      )}

      {tab === "company" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Company setup</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Legal name, address, logo, and registration — stored locally in demo.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="gs-label">Company name</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="gs-field" />
            </div>
            <div>
              <label className="gs-label">Fiscal year start</label>
              <input
                type="date"
                value={fiscalStart}
                onChange={(e) => setFiscalStart(e.target.value)}
                className="gs-field"
              />
            </div>
            <div>
              <label className="gs-label">Reporting currency</label>
              <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} className="gs-field">
                <option>PKR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.alert("Demo: save company profile")}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)]"
            >
              Save
            </button>
            <Link
              href="/users"
              className="inline-flex items-center rounded-full border border-[var(--gs-border)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-accent-soft)]"
            >
              Users & roles →
            </Link>
          </div>
        </section>
      )}

      {tab === "tax" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Tax & currency</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">GST / VAT labels, default rates, and multi-currency pairs.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="gs-label">Primary tax label</label>
              <input value={gstLabel} onChange={(e) => setGstLabel(e.target.value)} className="gs-field" />
            </div>
            <div>
              <label className="gs-label">Default rate %</label>
              <input value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="gs-field" />
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--gs-muted)]">
            Advanced tax mapping is aligned with <Link href="/accounting?tab=tax" className="font-semibold text-[var(--gs-accent)] hover:underline">Accounting → Tax setup</Link>.
          </p>
        </section>
      )}

      {tab === "account_types" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm transition-colors duration-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--gs-text)]">Account types</h2>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">Map custom labels to Asset / Liability / Equity / Revenue / Expense.</p>
            </div>
            <button
              type="button"
              onClick={() => window.alert("Demo: add account type drawer")}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)]"
            >
              + Add type
            </button>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
                <tr>
                  <th className="px-4 py-3">Type name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gs-border)]">
                {["Operating bank", "Trade payables", "Sales revenue"].map((name, i) => (
                  <tr key={name}>
                    <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{name}</td>
                    <td className="px-4 py-3 text-[var(--gs-muted)]">{["Asset", "Liability", "Revenue"][i]}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="text-xs font-semibold text-[var(--gs-accent)] hover:underline">
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

      {tab === "workflow" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Workflow & approvals</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">Route drafts for journals, invoices, and bills to approvers.</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--gs-text)]">
            <li>Journal entry: Draft → Submitted → Approved → Posted</li>
            <li>Sales purchase invoices: optional approval thresholds</li>
          </ul>
          <button
            type="button"
            onClick={() => window.alert("Demo: configure approval rules")}
            className="mt-6 rounded-full border border-[var(--gs-border)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-accent-soft)]"
          >
            Configure rules
          </button>
        </section>
      )}

      {tab === "integrations" && (
        <section className="rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-6 shadow-sm transition-colors duration-200">
          <h2 className="text-lg font-bold text-[var(--gs-text)]">Integrations</h2>
          <p className="mt-1 text-sm text-[var(--gs-muted)]">API keys, webhooks, and payment gateways.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4 transition-colors duration-200">
              <p className="font-bold text-[var(--gs-text)]">REST API</p>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">Issue keys and rotate secrets.</p>
              <button type="button" className="mt-3 text-xs font-semibold text-[var(--gs-accent)] hover:underline">
                Manage API settings
              </button>
            </div>
            <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4 transition-colors duration-200">
              <p className="font-bold text-[var(--gs-text)]">Payment gateway</p>
              <p className="mt-1 text-sm text-[var(--gs-muted)]">Stripe / PayPal / bank redirect.</p>
              <button type="button" className="mt-3 text-xs font-semibold text-[var(--gs-accent)] hover:underline">
                Connect provider
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}