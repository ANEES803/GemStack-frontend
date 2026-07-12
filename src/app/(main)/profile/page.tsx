"use client";

import { Suspense } from "react";

import { ProfileWorkspace } from "@/components/profile/ProfileWorkspace";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-[var(--gs-muted)]">Loading profile…</div>}>
      <ProfileWorkspace />
    </Suspense>
  );
}
