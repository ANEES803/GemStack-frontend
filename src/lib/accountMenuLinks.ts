/** Former sidebar “Settings” items — shown under Account in the header. */
export const ACCOUNT_SETTINGS_LINKS = [
  { label: "Company & fiscal", href: "/settings?tab=company" },
  { label: "Tax & currency", href: "/settings?tab=tax" },
  { label: "Account types", href: "/settings?tab=account_types" },
  { label: "Users & roles", href: "/users" },
  { label: "FEP & commission", href: "/fep" },
  { label: "Partners", href: "/partners" },
] as const;
