"use client";

import { useRef } from "react";

type RowAction = {
  label: string;
  onSelect?: () => void;
  tone?: "default" | "danger" | "accent";
};

type RowActionsMenuProps = {
  actions?: RowAction[];
  items?: string[];
  align?: "left" | "right";
};

function toneClass(tone: RowAction["tone"]) {
  switch (tone) {
    case "danger":
      return "text-red-600 hover:bg-red-50";
    case "accent":
      return "text-[var(--gs-accent)] hover:bg-[var(--gs-accent-soft)]";
    default:
      return "text-slate-700 hover:bg-slate-50";
  }
}

export function RowActionsMenu({ actions, items, align = "right" }: RowActionsMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const resolvedActions: RowAction[] = actions ?? items?.map((label) => ({ label })) ?? [{ label: "View" }, { label: "Edit" }, { label: "Delete" }];

  return (
    <details ref={detailsRef} className="relative inline-block">
      <summary
        className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 [&::-webkit-details-marker]:hidden"
        aria-label="Open row actions"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </summary>
      <div
        className={`absolute z-20 mt-1 min-w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg ${
          align === "left" ? "left-0" : "right-0"
        }`}
      >
        {resolvedActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              action.onSelect?.();
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className={`block w-full px-3 py-1.5 text-left transition ${toneClass(action.tone)}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </details>
  );
}
