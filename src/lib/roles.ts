export const ROLE_SLUGS = ["owner", "admin", "accountant", "stock-manager", "fep"] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

export function isRoleSlug(s: string): s is RoleSlug {
  return (ROLE_SLUGS as readonly string[]).includes(s);
}

export type RoleDefinition = {
  slug: RoleSlug;
  title: string;
  label: string;
  /** SRS-aligned: what this role can do */
  canSee: string[];
  accent: "orange" | "blue" | "violet" | "emerald" | "teal";
};

export const ROLES: RoleDefinition[] = [
  {
    slug: "owner",
    title: "Owner",
    label: "Business owner",
    canSee: ["All reports and KPIs", "Sales, inventory & profit trends", "Partner & commission overview", "Export-ready summaries"],
    accent: "orange",
  },
  {
    slug: "admin",
    title: "Admin",
    label: "System administrator",
    canSee: ["Full module access", "User & role management", "Audit-sensitive actions", "System health & usage"],
    accent: "violet",
  },
  {
    slug: "accountant",
    title: "Accountant",
    label: "Bookkeeping",
    canSee: ["Chart of accounts & journals", "Ledger balances", "Expenses and postings", "P&L / balance sheet prep (no destructive edits per SRS)"],
    accent: "blue",
  },
  {
    slug: "stock-manager",
    title: "Stock manager",
    label: "Inventory operations",
    canSee: ["Lots and parcels", "Carats by grade (A/B/C)", "FEP assignments & transfers", "Stock alerts"],
    accent: "teal",
  },
  {
    slug: "fep",
    title: "Sales (FEP)",
    label: "Field sales",
    canSee: ["Record sales only", "Parcels assigned to you", "Your commission balance", "No accounting or company-wide reports (per SRS)"],
    accent: "emerald",
  },
];

export function roleHref(slug: RoleSlug): string {
  return `/dashboard/${slug}`;
}
