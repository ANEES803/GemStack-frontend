import { ListPageLayout, ListToolbar } from "@/components/ui/ListPageLayout";

const rows = [
  { code: "P-228", lot: "LO-09", grade: "A", carats: "42.5", fep: "A. Khan", status: "With FEP" as const },
  { code: "P-227", lot: "LO-09", grade: "B", carats: "18.0", fep: "M. Ali", status: "With FEP" as const },
  { code: "P-226", lot: "LO-08", grade: "A", carats: "55.2", fep: "—", status: "Warehouse" as const },
];

function statusStyle(s: (typeof rows)[0]["status"]) {
  if (s === "With FEP") {
    return "bg-sky-50 text-sky-800 ring-sky-100";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function ParcelsPage() {
  return (
    <ListPageLayout
      title="Parcels"
      subtitle="Track weight, grade, and which FEP holds each parcel."
      toolbar={<ListToolbar placeholder="Search parcel, lot, FEP…" />}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-[var(--gs-table-head)] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3.5">Parcel</th>
              <th className="px-6 py-3.5">Lot</th>
              <th className="px-6 py-3.5">Grade</th>
              <th className="px-6 py-3.5 text-right">Carats</th>
              <th className="px-6 py-3.5">FEP</th>
              <th className="px-6 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.code} className="bg-white hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-semibold text-slate-900">{row.code}</td>
                <td className="px-6 py-4 font-mono text-slate-700">{row.lot}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-100">
                    {row.grade}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-900">{row.carats}</td>
                <td className="px-6 py-4 text-slate-600">{row.fep}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle(row.status)}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ListPageLayout>
  );
}
