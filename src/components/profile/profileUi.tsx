import type { ReactNode } from "react";

export function ProfileCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] shadow-sm ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function ProfileSectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-bold text-[var(--gs-text)]">{children}</h3>;
}

export function ProfileDetailGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10">{children}</div>
  );
}

export function ProfileDetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--gs-muted)]">{label}</p>
      <div className="mt-1 text-sm font-semibold text-[var(--gs-text)]">{value}</div>
    </div>
  );
}

type ProfileDetailInputProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
};

/** Inline editable field on the profile page (no popup). */
export function ProfileDetailInput({ label, value, onChange, placeholder, readOnly }: ProfileDetailInputProps) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--gs-muted)]">{label}</label>
      {readOnly ? (
        <p className="mt-1 text-sm font-semibold text-[var(--gs-muted)]">{value || "—"}</p>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="gs-field mt-1.5 w-full text-sm"
        />
      )}
    </div>
  );
}

export function ProfileStatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-800">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-800">
      Disabled
    </span>
  );
}

export function ProfileMutedBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-950 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-100 dark:ring-sky-800">
      {children}
    </span>
  );
}

export function formatProfileDate(iso: string | null | undefined): string {
  if (!iso) return "Not available";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
