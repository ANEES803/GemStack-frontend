export type DemoCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  detail: string;
};

const STORAGE_KEY = "gemstack-demo-customers";

const SEED: DemoCustomer[] = [
  { id: "c1", name: "Facebook — batch A", email: "batch-a@facebook.demo", phone: "+41 79 000 0001", detail: "Batch buyer, PayPal preferred" },
  { id: "c2", name: "Direct — Zurich", email: "buyer@zurich.demo", phone: "+41 44 000 0000", detail: "Bank transfer, EU" },
  { id: "c3", name: "PayPal checkout", email: "paypal@customer.demo", phone: "—", detail: "Guest checkout" },
  { id: "c4", name: "Bank transfer", email: "wire@customer.demo", phone: "+92 300 0000000", detail: "Local bank" },
];

function ensureSeed(list: DemoCustomer[]): DemoCustomer[] {
  if (list.length === 0) return [...SEED];
  const names = new Set(list.map((c) => c.name.toLowerCase()));
  const merged = [...list];
  for (const s of SEED) {
    if (!names.has(s.name.toLowerCase())) merged.push(s);
  }
  return merged;
}

export function loadCustomers(): DemoCustomer[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED];
    const parsed = JSON.parse(raw) as DemoCustomer[];
    if (!Array.isArray(parsed)) return [...SEED];
    return ensureSeed(parsed);
  } catch {
    return [...SEED];
  }
}

export function persistCustomers(customers: DemoCustomer[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch {
    /* ignore */
  }
}

export function addCustomer(c: Omit<DemoCustomer, "id">): DemoCustomer {
  const id = `c-${Date.now()}`;
  const row: DemoCustomer = { id, ...c };
  const next = [row, ...loadCustomers()];
  persistCustomers(next);
  return row;
}
