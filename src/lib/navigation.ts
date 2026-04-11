export type NavIconName =
  | "dashboard"
  | "accounting"
  | "sale"
  | "purchase"
  | "inventory"
  | "report"
  | "lot"
  | "parcel"
  | "ledger"
  | "expense"
  | "fep"
  | "partner"
  | "users";

export type NavChild = { label: string; href: string };

/** Main sidebar: doc order — Dashboard, Accounting, Sales, Purchases, Inventory, Reports (Settings → Account menu in header) */
export type NavModule = {
  id: string;
  label: string;
  icon: NavIconName;
  /** Default when clicking the module title */
  href: string;
  children: NavChild[];
};

export const navigation: NavModule[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    href: "/dashboard",
    children: [],
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: "accounting",
    href: "/accounting?tab=coa",
    children: [
      { label: "Chart of accounts", href: "/accounting?tab=coa" },
      { label: "Journal entries", href: "/accounting?tab=journal_list" },
      { label: "Banking", href: "/accounting?tab=banking" },
      { label: "Opening balances", href: "/accounting?tab=opening" },
      { label: "Capital, drawings & profit split", href: "/partners" },
      { label: "Expenses & cash", href: "/expenses" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: "sale",
    href: "/sales?tab=transactions",
    children: [
      { label: "Sales transactions", href: "/sales?tab=transactions" },
      { label: "Customers", href: "/sales?tab=customers" },
      { label: "Receipts / payments", href: "/sales?tab=receipts" },
    ],
  },
  {
    id: "purchases",
    label: "Purchases",
    icon: "purchase",
    href: "/purchases",
    children: [
      { label: "Purchase transactions", href: "/purchases?tab=flow" },
      { label: "Vendor payments", href: "/purchases?tab=payments" },
      { label: "Vendors", href: "/purchases?tab=vendors" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: "inventory",
    href: "/inventory",
    children: [
      { label: "Stock / Services", href: "/inventory?tab=items" },
      { label: "Lots", href: "/lots" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "report",
    href: "/reports?tab=hub",
    children: [
      { label: "Report hub", href: "/reports?tab=hub" },
      { label: "General ledger", href: "/reports/general-ledger" },
      { label: "Trial balance", href: "/reports/trial-balance" },
      { label: "Profit & loss", href: "/reports/profit-loss" },
      { label: "Balance sheet", href: "/reports/balance-sheet" },
      { label: "Cash flow", href: "/reports/cash-flow" },
      { label: "Accounting exports", href: "/reports?tab=accounting" },
    ],
  },
];
