"use client";

import { Suspense } from "react";

import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading settings…</div>}>
      <SettingsWorkspace />
    </Suspense>
  );
}
