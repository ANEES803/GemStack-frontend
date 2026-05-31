import {
  Building2,
  GitBranch,
  Handshake,
  KeyRound,
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

/** Settings hub tab identifiers (URL ?tab= value). */
export type SettingsTabId =
  | "profile"
  | "company"
  | "security"
  | "tax"
  | "account_types"
  | "appearance"
  | "workflow"
  | "integrations"
  | "inventory"
  | "users"
  | "reset_password"
  | "fep"
  | "partners";

export const SETTINGS_TAB_IDS: SettingsTabId[] = [
  "profile",
  "company",
  "security",
  "tax",
  "account_types",
  "appearance",
  "workflow",
  "integrations",
  "inventory",
  "users",
  "reset_password",
  "fep",
  "partners",
];

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

/** Account dropdown — only profile + settings entry points. */
export const ACCOUNT_DROPDOWN_LINKS: AccountDropdownLink[] = [
  { label: "My Profile", href: "/settings?tab=profile", icon: User },
  { label: "Settings", href: "/settings?tab=company", icon: Settings },
];

/** Left sidebar navigation inside the Settings hub. */
export const SETTINGS_SIDEBAR_NAV: SettingsSidebarItem[] = [
  { id: "profile", label: "My profile", icon: User },
  { id: "company", label: "Company & fiscal", icon: Building2 },
  { id: "security", label: "Login & security", icon: Shield },
  { id: "tax", label: "Tax & currency", icon: Receipt },
  { id: "account_types", label: "Account types", icon: Layers },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "users", label: "Users & roles", icon: Users },
  { id: "reset_password", label: "Admin reset password", icon: KeyRound },
  { id: "fep", label: "FEP & commission", icon: Percent },
  { id: "partners", label: "Partners", icon: Handshake },
];

export function settingsTabHref(id: SettingsTabId): string {
  return `/settings?tab=${id}`;
}

export function isValidSettingsTab(tab: string | null): tab is SettingsTabId {
  return tab !== null && (SETTINGS_TAB_IDS as readonly string[]).includes(tab);
}

export function resolveSettingsTab(tab: string | null): SettingsTabId {
  return isValidSettingsTab(tab) ? tab : "company";
}

/** Search + legacy imports — all sidebar destinations. */
export const ACCOUNT_SETTINGS_LINKS = SETTINGS_SIDEBAR_NAV.map((item) => ({
  label: item.label,
  href: settingsTabHref(item.id),
}));
