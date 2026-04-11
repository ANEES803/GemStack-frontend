"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export type ActionTone = "default" | "danger" | "accent" | "success" | "warning" | "info";

export type RowAction = {
  label: string;
  onSelect?: () => void;
  tone?: ActionTone;
};

type RowActionsMenuProps = {
  actions?: RowAction[];
  items?: string[];
  align?: "left" | "right";
  /** Extra classes for the ⋮ trigger button (e.g. cursor-pointer). */
  triggerClassName?: string;
};

const DEFAULT_ACTIONS: RowAction[] = [
  { label: "View", tone: "default" },
  { label: "Edit", tone: "accent" },
  { label: "Delete", tone: "danger" },
];

/** Map common labels to semantic colors when using `items` shorthand. */
export function inferActionTone(label: string): ActionTone {
  const l = label.toLowerCase();
  if (/delete|remove|reverse|unlink|escalate|force logout/.test(l)) return "danger";
  if (l.includes("archive") || /freeze|disable user|disable payouts/.test(l)) return "warning";
  if (/receive payment|record payment|enable user/.test(l)) return "success";
  if (/warn|hold|flag|pending payout/.test(l)) return "warning";
  if (/export|download|pdf|csv|voucher|history|payment history/.test(l)) return "info";
  if (/edit|open |send reminder|adjust|reassign|inspect|open entry|open parcel|open invoice|transfer|apply/.test(l)) return "accent";
  return "default";
}

function toneClass(tone: ActionTone) {
  switch (tone) {
    case "danger":
      return "text-red-700 hover:bg-red-50 active:bg-red-100/80";
    case "accent":
      return "text-[var(--gs-accent)] hover:bg-[var(--gs-accent-soft)] active:bg-orange-100/60";
    case "success":
      return "text-[var(--gs-text)] hover:bg-emerald-50 active:bg-emerald-100/70";
    case "warning":
      return "text-amber-900 hover:bg-amber-50 active:bg-amber-100/70";
    case "info":
      return "text-sky-900 hover:bg-sky-50 active:bg-sky-100/70";
    default:
      return "text-[var(--gs-text)] hover:bg-[var(--gs-hover)] active:bg-[var(--gs-hover)]/80";
  }
}

function computeMenuPosition(anchor: DOMRect, align: "left" | "right") {
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuWidth = Math.min(220, Math.max(168, vw - margin * 2));
  let left = align === "right" ? anchor.right - menuWidth : anchor.left;
  left = Math.max(margin, Math.min(left, vw - menuWidth - margin));
  const spaceBelow = vh - anchor.bottom - margin * 2;
  const spaceAbove = anchor.top - margin * 2;
  const openBelow = spaceBelow >= 100 || spaceBelow >= spaceAbove;
  let top: number;
  let maxH: number;
  if (openBelow) {
    top = anchor.bottom + margin;
    maxH = Math.min(360, Math.max(100, spaceBelow));
  } else {
    maxH = Math.min(360, Math.max(100, spaceAbove));
    top = anchor.top - margin - maxH;
  }
  if (top < margin) {
    top = margin;
    maxH = Math.min(maxH, vh - top - margin);
  }
  if (top + maxH > vh - margin) {
    maxH = Math.max(100, vh - margin - top);
  }
  return { top, left, width: menuWidth, maxHeight: maxH };
}

export function RowActionsMenu({ actions, items, align = "right", triggerClassName }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const resolvedActions: RowAction[] =
    actions ??
    (items?.map((label) => ({ label, tone: inferActionTone(label) })) ?? DEFAULT_ACTIONS);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setMenuStyle(null);
      return;
    }
    function update() {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pos = computeMenuPosition(r, align);
      setMenuStyle({
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        zIndex: 275,
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      const inMenu = (e.target as HTMLElement).closest?.("[data-gs-row-actions-menu]");
      if (inMenu) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  const menu =
    mounted && open && menuStyle ? (
      <div
        data-gs-row-actions-menu
        style={menuStyle}
        className="flex flex-col overflow-hidden rounded-xl border border-[var(--gs-border)]/95 bg-[var(--gs-card)] shadow-[0_16px_48px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04]"
        role="menu"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 [scrollbar-gutter:stable]">
          {resolvedActions.map((action) => {
            const tone = action.tone ?? inferActionTone(action.label);
            return (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  action.onSelect?.();
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2.5 text-left text-sm font-semibold transition ${toneClass(tone)}`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <>
      <div ref={rootRef} className="relative inline-flex text-left">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full border text-[var(--gs-muted)] transition hover:bg-[var(--gs-hover)] hover:text-[var(--gs-text)] sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0 ${
            open ? "border-[var(--gs-border)] bg-[var(--gs-hover)] text-[var(--gs-text)]" : "border-transparent hover:border-[var(--gs-border)]"
          } ${triggerClassName ?? ""}`}
          aria-label="Open row actions"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}