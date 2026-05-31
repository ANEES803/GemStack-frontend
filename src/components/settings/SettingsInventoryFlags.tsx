"use client";

import { useCallback, useEffect, useState } from "react";

import { useAppNotifications } from "@/components/providers/AppNotificationsProvider";
import { getAccessToken, getStoredUser } from "@/lib/authClient";
import {
  fetchInventoryFeatureFlags,
  patchInventoryFeatureFlags,
  type InvInventoryFeatureFlags,
} from "@/lib/invApi";

function flagOn(flags: InvInventoryFeatureFlags, key: "hub_backend_reads" | "hub_backend_writes"): boolean {
  const v = flags[key];
  if (v === undefined || v === null) return true;
  return v !== false;
}

export function SettingsInventoryFlags() {
  const { pushToast } = useAppNotifications();
  const user = getStoredUser();
  const canEdit = user?.role === "owner" || user?.role === "admin";
  const signedIn = Boolean(getAccessToken());

  const [flags, setFlags] = useState<InvInventoryFeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventoryFeatureFlags();
      setFlags(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load inventory flags");
      setFlags(null);
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: "hub_backend_reads" | "hub_backend_writes", next: boolean) {
    if (!canEdit || !flags) return;
    setSaving(true);
    try {
      const updated = await patchInventoryFeatureFlags({ [key]: next });
      setFlags(updated);
      pushToast("Inventory settings saved.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!signedIn) {
    return (
      <p className="mt-4 text-sm text-[var(--gs-muted)]">Sign in to view server inventory settings for your business.</p>
    );
  }

  if (loading) {
    return <p className="mt-4 text-sm text-[var(--gs-muted)]">Loading inventory settings…</p>;
  }

  if (error) {
    return (
      <p className="mt-4 text-sm text-red-700">
        {error}{" "}
        <button type="button" className="font-semibold underline" onClick={() => void load()}>
          Retry
        </button>
      </p>
    );
  }

  if (!flags) return null;

  const readsOn = flagOn(flags, "hub_backend_reads");
  const writesOn = flagOn(flags, "hub_backend_writes");

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-[var(--gs-muted)]">
        Control whether the Inventory Hub loads and saves stock on the server (recommended for production). When writes are
        off, create/edit/split calls return an error from the API.
      </p>
      {!canEdit ? (
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Only owner or admin can change these switches.</p>
      ) : null}
      <div className="space-y-3 rounded-xl border border-[var(--gs-border)] bg-[var(--gs-input-bg)] p-4">
        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold text-[var(--gs-text)]">Load from server</span>
            <span className="mt-0.5 block text-xs text-[var(--gs-muted)]">hub_backend_reads — inventory list comes from the database when on.</span>
          </span>
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={readsOn}
            disabled={!canEdit || saving}
            onChange={(e) => void toggle("hub_backend_reads", e.target.checked)}
          />
        </label>
        <label className="flex items-start justify-between gap-4 border-t border-[var(--gs-border)] pt-3">
          <span>
            <span className="block text-sm font-semibold text-[var(--gs-text)]">Allow server saves</span>
            <span className="mt-0.5 block text-xs text-[var(--gs-muted)]">hub_backend_writes — off blocks create, edit, split, and lot workflows.</span>
          </span>
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={writesOn}
            disabled={!canEdit || saving}
            onChange={(e) => void toggle("hub_backend_writes", e.target.checked)}
          />
        </label>
      </div>
    </div>
  );
}
