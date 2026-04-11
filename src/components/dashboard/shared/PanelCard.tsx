import type { ReactNode } from "react";

export function PanelCard({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const showHead = Boolean(title || description || action);

  return (
    <div
      className={`rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_24px_rgba(15,23,42,0.04)] ${className}`}
    >
      {showHead ? (
        <div className="flex flex-col gap-3 border-b border-[var(--gs-border)]/90 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? <h2 className="text-lg font-bold tracking-tight text-[var(--gs-text)]">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-[var(--gs-muted)]">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={showHead ? `p-6 ${bodyClassName}` : `p-6 ${bodyClassName}`}>{children}</div>
    </div>
  );
}