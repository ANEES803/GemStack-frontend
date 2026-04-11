export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-root -mx-3 min-h-full bg-white px-3 py-8 text-neutral-950 sm:-mx-5 sm:px-5 md:-mx-10 md:px-10 dark:bg-white dark:text-neutral-950">
      {children}
    </div>
  );
}
