import type { ReactNode } from "react";

import { AccountProfileShell } from "@/components/profile/AccountProfileShell";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <AccountProfileShell>{children}</AccountProfileShell>;
}
