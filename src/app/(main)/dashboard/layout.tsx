export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-root -mx-3 min-h-full bg-[#0b1220] px-3 py-8 sm:-mx-5 sm:px-5 md:-mx-10 md:px-10">
      {children}
    </div>
  );
}
