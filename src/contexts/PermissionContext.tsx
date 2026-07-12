"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { AuthUser } from "@/lib/authClient";
import { canAccess, type AccessLevel } from "@/lib/permissions";

type PermissionContextValue = {
  user: AuthUser | null;
  /** True after cached session user is read (avoids flashing all nav before filter applies). */
  ready: boolean;
  permissions: Record<string, AccessLevel>;
  can: (module: string, level?: AccessLevel) => boolean;
  setUser: (user: AuthUser | null) => void;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  user,
  ready = true,
  onUserChange,
  children,
}: {
  user: AuthUser | null;
  ready?: boolean;
  onUserChange?: (user: AuthUser | null) => void;
  children: ReactNode;
}) {
  const permissions = useMemo(() => {
    const raw = user?.permissions ?? {};
    return raw as Record<string, AccessLevel>;
  }, [user]);

  const can = useCallback(
    (module: string, level: AccessLevel = "view") => canAccess(permissions[module], level),
    [permissions],
  );

  const setUser = useCallback(
    (next: AuthUser | null) => {
      onUserChange?.(next);
    },
    [onUserChange],
  );

  const value = useMemo(
    () => ({
      user,
      ready,
      permissions,
      can,
      setUser,
    }),
    [user, ready, permissions, can, setUser],
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }
  return ctx;
}

export function useOptionalPermissions() {
  return useContext(PermissionContext);
}
