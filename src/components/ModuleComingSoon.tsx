export function ModuleComingSoon({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-10 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--gs-accent)]">{name}</p>
      <h2 className="mt-3 text-xl font-bold text-[var(--gs-text)]">Coming soon</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--gs-muted)]">
        This screen will plug into your API and SRS workflows. Navigation and layout already match the rest of the app.
      </p>
    </div>
  );
}