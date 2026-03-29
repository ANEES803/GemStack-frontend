export type NavItem = {
  label: string;
  href: string;
  icon: "dashboard" | "lot" | "parcel" | "sale" | "ledger" | "expense" | "report" | "fep" | "partner" | "users";
};

export type NavSection = { title: string; items: NavItem[] };

export const navigation: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }],
  },
  {
    title: "Inventory",
    items: [
      { label: "Lots", href: "/lots", icon: "lot" },
      { label: "Parcels", href: "/parcels", icon: "parcel" },
    ],
  },
  {
    title: "Sales",
    items: [{ label: "Invoices", href: "/sales", icon: "sale" }],
  },
  {
    title: "Finance",
    items: [
      { label: "Accounting", href: "/accounting", icon: "ledger" },
      { label: "Expenses", href: "/expenses", icon: "expense" },
      { label: "Reports", href: "/reports", icon: "report" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "FEP & commission", href: "/fep", icon: "fep" },
      { label: "Partners", href: "/partners", icon: "partner" },
    ],
  },
  {
    title: "System",
    items: [{ label: "Users & roles", href: "/users", icon: "users" }],
  },
];

