import type { ReactNode } from "react";

import { AccountSettingsShell } from "@/components/settings/AccountSettingsShell";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <AccountSettingsShell>{children}</AccountSettingsShell>;
}
