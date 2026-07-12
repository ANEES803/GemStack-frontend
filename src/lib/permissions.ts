import {
  SETTINGS_SIDEBAR_NAV,
  type SettingsSidebarItem,
  type SettingsTabId,
} from "@/lib/accountMenuLinks";
import { navigation, type NavModule } from "@/lib/navigation";

export type AccessLevel = "none" | "view" | "edit" | "full";

export const ACCESS_LEVELS: AccessLevel[] = ["full", "edit", "view", "none"];

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  none: "None",
  view: "View",
  edit: "Edit",
  full: "Full",
};

const LEVEL_ORDER: Record<AccessLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  full: 3,
};

export function canAccess(level: AccessLevel | undefined, required: AccessLevel): boolean {
  const actual = level ?? "none";
  return LEVEL_ORDER[actual] >= LEVEL_ORDER[required];
}

export const NAV_MODULE_PERMISSION: Record<string, AccessLevel> = {
  dashboard: "view",
  accounting: "view",
  sales: "view",
  purchases: "view",
  inventory: "view",
  reports: "view",
};

export const ROUTE_PERMISSION: Record<string, { module: string; level: AccessLevel }> = {
  "/dashboard": { module: "dashboard", level: "view" },
  "/accounting": { module: "accounting", level: "view" },
  "/expenses": { module: "accounting", level: "view" },
  "/sales": { module: "sales", level: "view" },
  "/purchases": { module: "purchases", level: "view" },
  "/inventory": { module: "inventory", level: "view" },
  "/lots": { module: "inventory", level: "view" },
  "/reports": { module: "reports", level: "view" },
  "/partners": { module: "partners", level: "view" },
  "/settings": { module: "settings", level: "view" },
  "/profile": { module: "settings", level: "view" },
};

/** RBAC module labels for the current user's permissions card (mirrors backend catalog). */
export const PERMISSION_MODULE_LABELS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard & KPIs" },
  { key: "accounting", label: "Accounting" },
  { key: "sales", label: "Sales" },
  { key: "purchases", label: "Purchases" },
  { key: "inventory", label: "Inventory" },
  { key: "reports", label: "Reports & exports" },
  { key: "partners", label: "Partners & FEP" },
  { key: "settings", label: "Company settings" },
  { key: "users_roles", label: "Users & roles" },
];

/** RBAC module required to open a settings sidebar tab (null = always allowed when signed in). */
export function settingsTabPermission(tab: SettingsTabId): { module: string; level: AccessLevel } | null {
  if (tab === "users") {
    return { module: "users_roles", level: "view" };
  }
  if (tab === "fep" || tab === "partners") {
    return { module: "partners", level: "view" };
  }
  if (tab === "appearance") {
    return null;
  }
  return { module: "settings", level: "view" };
}

export function canViewSettingsTab(
  permissions: Record<string, AccessLevel>,
  tab: SettingsTabId,
): boolean {
  const rule = settingsTabPermission(tab);
  if (!rule) {
    return true;
  }
  return canAccess(permissions[rule.module], rule.level);
}

export function filterSettingsNav(permissions: Record<string, AccessLevel>): SettingsSidebarItem[] {
  return SETTINGS_SIDEBAR_NAV.filter((item) => canViewSettingsTab(permissions, item.id));
}

/** First workspace settings tab this user may open. */
export function resolveDefaultSettingsTab(permissions: Record<string, AccessLevel>): SettingsTabId {
  return filterSettingsNav(permissions)[0]?.id ?? "company";
}

export function filterMainNavigation(permissions: Record<string, AccessLevel>): NavModule[] {
  return navigation.filter((mod) => {
    const required = NAV_MODULE_PERMISSION[mod.id];
    if (!required) {
      return true;
    }
    return canAccess(permissions[mod.id], required);
  });
}

export type PermissionUser = {
  must_change_password: boolean;
  permissions: Record<string, AccessLevel>;
};

const POST_LOGIN_CANDIDATES: { path: string; module: string }[] = [
  { path: "/dashboard", module: "dashboard" },
  { path: "/accounting?tab=coa", module: "accounting" },
  { path: "/sales?tab=transactions", module: "sales" },
  { path: "/purchases", module: "purchases" },
  { path: "/inventory", module: "inventory" },
  { path: "/reports?tab=hub", module: "reports" },
  { path: "/partners", module: "partners" },
];

/** Pick the first module home page this user may view after login. */
export function resolvePostLoginPath(user: PermissionUser): string {
  if (user.must_change_password) {
    return "/dashboard";
  }
  for (const candidate of POST_LOGIN_CANDIDATES) {
    if (canAccess(user.permissions[candidate.module], "view")) {
      return candidate.path;
    }
  }
  return "/profile";
}

export function isPersonalProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

export function routePermissionForPath(pathname: string, search = ""): { module: string; level: AccessLevel } | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return { module: "dashboard", level: "view" };
  }
  if (pathname.startsWith("/profile")) {
    return null;
  }
  if (pathname.startsWith("/settings")) {
    const tab = new URLSearchParams(search).get("tab");
    if (tab === "users") {
      return { module: "users_roles", level: "view" };
    }
    if (tab === "appearance") {
      return null;
    }
    if (tab === "company" || tab === null) {
      return { module: "settings", level: "view" };
    }
    return { module: "settings", level: "view" };
  }
  for (const [prefix, perm] of Object.entries(ROUTE_PERMISSION)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)) {
      return perm;
    }
  }
  if (pathname.startsWith("/reports/")) {
    return { module: "reports", level: "view" };
  }
  return null;
}

export function levelBadgeClass(level: AccessLevel): string {
  if (level === "full") {
    return "bg-emerald-100 text-emerald-950 ring-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-100 dark:ring-emerald-700";
  }
  if (level === "edit") {
    return "bg-amber-100 text-amber-950 ring-amber-300 dark:bg-amber-950/80 dark:text-amber-100 dark:ring-amber-700";
  }
  if (level === "view") {
    return "bg-sky-100 text-sky-950 ring-sky-300 dark:bg-sky-950/80 dark:text-sky-100 dark:ring-sky-700";
  }
  return "bg-[var(--gs-hover)] text-[var(--gs-muted)] ring-[var(--gs-border)]";
}
