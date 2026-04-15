export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-root -mx-3 min-h-full min-w-0 bg-[var(--gs-page-bg)] px-3 py-8 text-[var(--gs-text)] sm:-mx-5 sm:px-5 md:-mx-10 md:px-10">
      {children}
    </div>
  );
}
