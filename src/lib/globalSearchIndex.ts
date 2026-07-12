import { ACCOUNT_SETTINGS_LINKS } from "@/lib/accountMenuLinks";
import { navigation } from "@/lib/navigation";

export type GlobalSearchEntry = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: string;
};

function entriesFromNavigation(): GlobalSearchEntry[] {
  const out: GlobalSearchEntry[] = [];
  for (const mod of navigation) {
    out.push({
      id: `nav-mod-${mod.id}`,
      title: mod.label,
      subtitle: "Module",
      href: mod.href,
      category: "Go to",
    });
    for (const c of mod.children) {
      out.push({
        id: `nav-${mod.id}-${encodeURIComponent(c.href)}`,
        title: c.label,
        subtitle: mod.label,
        href: c.href,
        category: "Go to",
      });
    }
  }
  return out;
}

/** Demo rows for global search until APIs exist — matches placeholder “accounts, invoices, items”. */
const DEMO_ACCOUNTS: GlobalSearchEntry[] = [
  { id: "acc-1000", title: "1000 — Cash and bank", subtitle: "Current asset", href: "/accounting?tab=coa", category: "Account" },
  { id: "acc-1100", title: "1100 — Accounts receivable", subtitle: "Current asset", href: "/accounting?tab=coa", category: "Account" },
  { id: "acc-2000", title: "2000 — Accounts payable", subtitle: "Current liability", href: "/accounting?tab=coa", category: "Account" },
  { id: "acc-4000", title: "4000 — Sales revenue", subtitle: "Income", href: "/accounting?tab=coa", category: "Account" },
  { id: "acc-5000", title: "5000 — Cost of goods sold", subtitle: "Expense", href: "/accounting?tab=coa", category: "Account" },
];

const DEMO_INVOICES: GlobalSearchEntry[] = [
  { id: "inv-1001", title: "INV-2025-1001", subtitle: "Aurora Jewellers · $12,400", href: "/sales?tab=transactions", category: "Invoice" },
  { id: "inv-1002", title: "INV-2025-1002", subtitle: "Gem House Ltd · $8,200", href: "/sales?tab=transactions", category: "Invoice" },
  { id: "inv-1003", title: "INV-2025-1003", subtitle: "Sample customer · Pending", href: "/sales?tab=transactions", category: "Invoice" },
];

const DEMO_ITEMS: GlobalSearchEntry[] = [
  { id: "item-s-em", title: "Emerald parcel", subtitle: "SKU S-EM · Faceted", href: "/inventory?tab=items", category: "Item" },
  { id: "item-s-ap", title: "Appraisal service", subtitle: "Service catalog · revenue (not stock)", href: "/inventory?tab=items", category: "Item" },
  { id: "item-r-ro", title: "Rough sapphire lot", subtitle: "SKU R-RO · Rough", href: "/inventory?tab=items", category: "Item" },
];

const SETTINGS_SEARCH: GlobalSearchEntry[] = ACCOUNT_SETTINGS_LINKS.map((it, i) => ({
  id: `settings-search-${i}`,
  title: it.label,
  subtitle: "Settings",
  href: it.href,
  category: "Settings",
}));

export const GLOBAL_SEARCH_ENTRIES: GlobalSearchEntry[] = [
  ...entriesFromNavigation(),
  ...SETTINGS_SEARCH,
  ...DEMO_ACCOUNTS,
  ...DEMO_INVOICES,
  ...DEMO_ITEMS,
];

function searchBlob(e: GlobalSearchEntry): string {
  return `${e.title} ${e.subtitle ?? ""} ${e.category} ${e.href}`.toLowerCase();
}

/** Every whitespace-separated token must appear somewhere in the entry (substring match). */
export function filterGlobalSearch(query: string, limit = 24): GlobalSearchEntry[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];
  const tokens = raw.split(/\s+/).filter(Boolean);
  const matched = GLOBAL_SEARCH_ENTRIES.filter((e) => {
    const blob = searchBlob(e);
    return tokens.every((t) => blob.includes(t));
  });

  const first = tokens[0] ?? "";
  matched.sort((a, b) => {
    const at = a.title.toLowerCase().startsWith(first) ? 1 : 0;
    const bt = b.title.toLowerCase().startsWith(first) ? 1 : 0;
    if (bt !== at) return bt - at;
    const ac = categoryOrder(a.category) - categoryOrder(b.category);
    if (ac !== 0) return ac;
    return a.title.localeCompare(b.title);
  });

  return matched.slice(0, limit);
}

function categoryOrder(c: string): number {
  const order = ["Go to", "Settings", "Account", "Invoice", "Item"];
  const i = order.indexOf(c);
  return i === -1 ? 99 : i;
}
