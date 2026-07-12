import type { ReactNode } from "react";

type SettingsPanelHeaderProps = {
  title: string;
  description: ReactNode;
};

/** Top heading inside a settings tab panel. */
export function SettingsPanelHeader({ title, description }: SettingsPanelHeaderProps) {
  return (
    <div className="border-b border-[var(--gs-border)] px-5 py-5 sm:px-6">
      <h2 className="text-lg font-bold text-[var(--gs-text)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--gs-muted)]">{description}</p>
    </div>
  );
}

type SettingsRowProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

/** Reference-style row: title, description, optional action on the right. */
export function SettingsRow({ title, description, action }: SettingsRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--gs-border)] px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--gs-text)]">{title}</p>
        <p className="mt-0.5 text-sm text-[var(--gs-muted)]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type SettingsEditButtonProps = {
  label?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

/** Pill-shaped outlined action button used in settings rows. */
export function SettingsEditButton({
  label = "Edit",
  onClick,
  type = "button",
  disabled = false,
}: SettingsEditButtonProps) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="gs-settings-edit-btn disabled:opacity-60">
      {label}
    </button>
  );
}
