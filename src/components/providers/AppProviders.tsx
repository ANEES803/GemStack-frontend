"use client";

import type { ReactNode } from "react";

import { AppNotificationsProvider } from "@/components/providers/AppNotificationsProvider";

/**
 * Client-side providers for the whole app (toasts, confirm/prompt modals).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <AppNotificationsProvider>{children}</AppNotificationsProvider>;
}
