"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSettingsTab } from "@/components/settings/AccountSettingsShell";
import { SettingsFepPanel } from "@/components/settings/SettingsFepPanel";
import { SettingsInventoryFlags } from "@/components/settings/SettingsInventoryFlags";
import { SettingsPartnersPanel } from "@/components/settings/SettingsPartnersPanel";
import { SettingsPanelHeader } from "@/components/settings/settingsUi";
import { ThemeToggleRow } from "@/components/theme";
import { UsersRolesWorkspace } from "@/components/users/UsersRolesWorkspace";
import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { useOptionalPermissions } from "@/contexts/PermissionContext";
import { isValidSettingsTab, settingsTabHref } from "@/lib/accountMenuLinks";
import { canViewSettingsTab, resolveDefaultSettingsTab } from "@/lib/permissions";

export function SettingsWorkspace() {
  const { pushToast } = useAppNotifications();
  const router = useRouter();
  const sp = useSearchParams();
  const tab = useSettingsTab();
  const permCtx = useOptionalPermissions();
  const permissions = permCtx?.permissions ?? {};
  const tabAllowed = permCtx?.ready ? canViewSettingsTab(permissions, tab) : false;

  const [companyName, setCompanyName] = useState("GemStack Trading Co.");
  const [fiscalStart, setFiscalStart] = useState("2026-01-01");
  const [gstLabel, setGstLabel] = useState("GST");
  const [gstRate, setGstRate] = useState("18");
  const [baseCurrency, setBaseCurrency] = useState("PKR");

  useEffect(() => {
    const urlTab = sp.get("tab");
    if (urlTab === "profile") {
      router.replace("/profile", { scroll: false });
      return;
    }
    if (urlTab === "security") {
      router.replace("/profile?tab=security", { scroll: false });
      return;
    }
    if (urlTab === "reset_password") {
      router.replace("/settings?tab=users", { scroll: false });
      return;
    }
    if (!permCtx?.ready) {
      return;
    }
    if (!urlTab || !isValidSettingsTab(urlTab)) {
      router.replace(settingsTabHref(resolveDefaultSettingsTab(permissions)), { scroll: false });
      return;
    }
    if (!canViewSettingsTab(permissions, urlTab)) {
      router.replace(settingsTabHref(resolveDefaultSettingsTab(permissions)), { scroll: false });
    }
  }, [permCtx?.ready, permissions, router, sp]);

  if (!permCtx?.ready) {
    return <div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading settings…</div>;
  }

  if (!tabAllowed) {
    return (
      <>
        <SettingsPanelHeader
          title="No access"
          description="Your role does not include permission for this settings section."
        />
        <div className="px-5 py-5 sm:px-6">
          <Link
            href={settingsTabHref(resolveDefaultSettingsTab(permissions))}
            className="inline-flex rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)]"
          >
            Go to allowed settings
          </Link>
        </div>
      </>
    );
  }

  if (tab === "users") {
    return <UsersRolesWorkspace embedded />;
  }
  if (tab === "fep") return <SettingsFepPanel />;
  if (tab === "partners") return <SettingsPartnersPanel />;

  if (tab === "appearance") {
    return (
      <>
        <SettingsPanelHeader title="Appearance" description="Workspace theme and display preferences." />
        <div className="px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4">
            <ThemeToggleRow />
          </div>
        </div>
      </>
    );
  }

  if (tab === "company") {
    return (
      <>
        <SettingsPanelHeader
          title="Company & fiscal"
          description="Legal name, address, logo, and registration — stored locally in demo."
        />
        <div className="space-y-6 px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pushToast("Demo: save company profile", "info")}
              className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)]"
            >
              Save
            </button>
            {canViewSettingsTab(permissions, "users") ? (
              <Link
                href={settingsTabHref("users")}
                className="inline-flex items-center rounded-full border border-[var(--gs-border)] px-5 py-2.5 text-sm font-semibold text-[var(--gs-text)] transition hover:bg-[var(--gs-accent-soft)]"
              >
                Users & roles →
              </Link>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  if (tab === "tax") {
    return (
      <>
        <SettingsPanelHeader title="Tax & currency" description="GST / VAT labels, default rates, and multi-currency pairs." />
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="gs-label">Primary tax label</label>
              <input value={gstLabel} onChange={(e) => setGstLabel(e.target.value)} className="gs-field" />
            </div>
            <div>
              <label className="gs-label">Default rate %</label>
              <input value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="gs-field" />
            </div>
          </div>
          <p className="text-xs text-[var(--gs-muted)]">
            Advanced tax mapping is aligned with{" "}
            <Link href="/accounting?tab=tax" className="font-semibold text-[var(--gs-accent)] hover:underline">
              Accounting → Tax setup
            </Link>
            .
          </p>
        </div>
      </>
    );
  }

  if (tab === "account_types") {
    return (
      <>
        <SettingsPanelHeader
          title="Account types"
          description="Map custom labels to Asset / Liability / Equity / Revenue / Expense."
        />
        <div className="flex justify-end border-b border-[var(--gs-border)] px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => pushToast("Demo: add account type drawer", "info")}
            className="rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--gs-accent-hover)]"
          >
            + Add type
          </button>
        </div>
        <div className="overflow-x-auto px-5 py-4 sm:px-6">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--gs-table-head)] text-xs font-bold uppercase tracking-wide text-[var(--gs-muted)]">
              <tr>
                <th className="px-4 py-3">Type name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="gs-striped-rows divide-y divide-[var(--gs-border)]">
              {["Operating bank", "Trade payables", "Sales revenue"].map((name, i) => (
                <tr key={name}>
                  <td className="px-4 py-3 font-medium text-[var(--gs-text)]">{name}</td>
                  <td className="px-4 py-3 text-[var(--gs-muted)]">{["Asset", "Liability", "Revenue"][i]}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="gs-settings-edit-btn">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  if (tab === "workflow") {
    return (
      <>
        <SettingsPanelHeader title="Workflow & approvals" description="Route drafts for journals, invoices, and bills to approvers." />
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--gs-text)]">
            <li>Journal entry: Draft → Submitted → Approved → Posted</li>
            <li>Sales purchase invoices: optional approval thresholds</li>
          </ul>
          <button
            type="button"
            onClick={() => pushToast("Demo: configure approval rules", "info")}
            className="gs-settings-edit-btn"
          >
            Configure rules
          </button>
        </div>
      </>
    );
  }

  if (tab === "inventory") {
    return (
      <>
        <SettingsPanelHeader
          title="Inventory (server)"
          description="Per-company switches for loading and saving catalog & stock on the API (used by Inventory Hub)."
        />
        <div className="px-5 py-5 sm:px-6">
          <SettingsInventoryFlags />
        </div>
      </>
    );
  }

  if (tab === "integrations") {
    return (
      <>
        <SettingsPanelHeader title="Integrations" description="API keys, webhooks, and payment gateways." />
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4">
            <p className="font-bold text-[var(--gs-text)]">REST API</p>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">Issue keys and rotate secrets.</p>
            <button type="button" className="mt-3 text-xs font-semibold text-[var(--gs-accent)] hover:underline">
              Manage API settings
            </button>
          </div>
          <div className="rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4">
            <p className="font-bold text-[var(--gs-text)]">Payment gateway</p>
            <p className="mt-1 text-sm text-[var(--gs-muted)]">Stripe / PayPal / bank redirect.</p>
            <button type="button" className="mt-3 text-xs font-semibold text-[var(--gs-accent)] hover:underline">
              Connect provider
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
