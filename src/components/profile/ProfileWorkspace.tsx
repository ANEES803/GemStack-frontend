"use client";

import { useProfileTab } from "@/components/profile/AccountProfileShell";
import { ProfilePagePanel } from "@/components/profile/ProfilePagePanel";
import { ProfileSecurityPanel } from "@/components/profile/ProfileSecurityPanel";

export function ProfileWorkspace() {
  const tab = useProfileTab();
  if (tab === "security") return <ProfileSecurityPanel />;
  return <ProfilePagePanel />;
}
