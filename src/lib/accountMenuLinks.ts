import {
  Building2,
  GitBranch,
  Handshake,
  Layers,
  Package,
  Palette,
  Percent,
  Plug,
  Receipt,
  Settings,
  Shield,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Profile hub tab identifiers (URL ?tab= on /profile). */
export type ProfileTabId = "profile" | "security";

export const PROFILE_TAB_IDS: ProfileTabId[] = ["profile", "security"];

/** Settings hub tab identifiers (URL ?tab= on /settings). */
export type SettingsTabId =
  | "company"
  | "tax"
  | "account_types"
  | "appearance"
  | "workflow"
  | "integrations"
  | "inventory"
  | "users"
  | "fep"
  | "partners";

export const SETTINGS_TAB_IDS: SettingsTabId[] = [
  "company",
  "tax",
  "account_types",
  "appearance",
  "workflow",
  "integrations",
  "inventory",
  "users",
  "fep",
  "partners",
];

export type ProfileSidebarItem = {
  id: ProfileTabId;
  label: string;
  icon: LucideIcon;
};

export type SettingsSidebarItem = {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
};

export type AccountDropdownLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/** Account dropdown — profile and workspace settings entry points. */
export const ACCOUNT_DROPDOWN_LINKS: AccountDropdownLink[] = [
  { label: "My Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings?tab=company", icon: Settings },
];

/** Left sidebar on the profile hub (/profile). */
export const PROFILE_SIDEBAR_NAV: ProfileSidebarItem[] = [
  { id: "profile", label: "My profile", icon: User },
  { id: "security", label: "Login & security", icon: Shield },
];

/** Left sidebar navigation inside the Settings hub (/settings). */
export const SETTINGS_SIDEBAR_NAV: SettingsSidebarItem[] = [
  { id: "company", label: "Company & fiscal", icon: Building2 },
  { id: "tax", label: "Tax & currency", icon: Receipt },
  { id: "account_types", label: "Account types", icon: Layers },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "users", label: "Users & roles", icon: Users },
  { id: "fep", label: "FEP & commission", icon: Percent },
  { id: "partners", label: "Partners", icon: Handshake },
];

export function profileTabHref(id: ProfileTabId): string {
  return id === "profile" ? "/profile" : `/profile?tab=${id}`;
}

export function settingsTabHref(id: SettingsTabId): string {
  return `/settings?tab=${id}`;
}

export function isValidProfileTab(tab: string | null): tab is ProfileTabId {
  return tab !== null && (PROFILE_TAB_IDS as readonly string[]).includes(tab);
}

export function isValidSettingsTab(tab: string | null): tab is SettingsTabId {
  return tab !== null && (SETTINGS_TAB_IDS as readonly string[]).includes(tab);
}

export function resolveProfileTab(tab: string | null): ProfileTabId {
  return isValidProfileTab(tab) ? tab : "profile";
}

export function resolveSettingsTab(tab: string | null): SettingsTabId {
  return isValidSettingsTab(tab) ? tab : "company";
}

/** @deprecated Use SETTINGS_SIDEBAR_NAV — kept for search indexing. */
export const ACCOUNT_SETTINGS_LINKS = [
  ...PROFILE_SIDEBAR_NAV.map((item) => ({
    label: item.label,
    href: profileTabHref(item.id),
  })),
  ...SETTINGS_SIDEBAR_NAV.map((item) => ({
    label: item.label,
    href: settingsTabHref(item.id),
  })),
];

/** Legacy combined tab type for redirects from old URLs. */
export type LegacySettingsTabId = ProfileTabId | SettingsTabId | "profile" | "security" | "reset_password";

export function isLegacySettingsTab(tab: string | null): boolean {
  if (!tab) return false;
  return (
    isValidProfileTab(tab) ||
    isValidSettingsTab(tab) ||
    tab === "reset_password"
  );
}
