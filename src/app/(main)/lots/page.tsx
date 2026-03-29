import Link from "next/link";

import { ListPageLayout, ListToolbar } from "@/components/ui/ListPageLayout";

const rows = [
  { code: "LO-09", supplier: "Sapphire Co.", carats: "312.0", cost: "$48,200", date: "Mar 12, 2026" },
  { code: "LO-08", supplier: "Global Gems Ltd", carats: "145.5", cost: "$22,900", date: "Feb 28, 2026" },
  { code: "LO-07", supplier: "Sapphire Co.", carats: "228.0", cost: "$31,400", date: "Feb 02, 2026" },
];

export default function LotsPage() {
  return (
    <ListPageLayout
      title="Lots"
      subtitle="Bulk purchases — total weight and cost at lot level before parcels are split."
      actions={
        <Link
          href="/lots/new"
          className="inline-flex rounded-full bg-[var(--gs-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--gs-accent-hover)]"
        >
          New lot
        </Link>
      }
      toolbar={<ListToolbar placeholder="Search by lot code or supplier…" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3.5">Lot</th>
              <th className="px-6 py-3.5">Supplier</th>
              <th className="px-6 py-3.5 text-right">Carats</th>
              <th className="px-6 py-3.5 text-right">Total cost</th>
              <th className="px-6 py-3.5">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.code} className="bg-white hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-semibold text-slate-900">{row.code}</td>
                <td className="px-6 py-4 text-slate-700">{row.supplier}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-900">{row.carats}</td>
                <td className="px-6 py-4 text-right font-semibold text-slate-900">{row.cost}</td>
                <td className="px-6 py-4 text-slate-600">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPageLayout>
  );
}
