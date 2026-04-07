/**
 * Demo revenue (income) accounts — aligned with Accounting → Chart of accounts seed data.
 * Use `id` to link service items; display uses code + name.
 */
export type DemoRevenueAccount = {
  id: string;
  code: string;
  name: string;
};

export const DEMO_REVENUE_ACCOUNTS: readonly DemoRevenueAccount[] = [
  { id: "8", code: "4000", name: "Sales revenue" },
  { id: "rev-other", code: "4010", name: "Service & misc. revenue" },
] as const;

export function revenueAccountLabel(id: string): string {
  const a = DEMO_REVENUE_ACCOUNTS.find((x) => x.id === id);
  return a ? `${a.code} — ${a.name}` : id || "—";
}
