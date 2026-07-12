"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "gemstack-theme";
const THEME_EVENT = "gemstack-theme-change";

export type ThemeMode = "light" | "dark" | "system";

function getSystemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  const el = document.documentElement;
  if (mode === "dark") {
    el.classList.add("dark");
  } else if (mode === "light") {
    el.classList.remove("dark");
  } else {
    el.classList.toggle("dark", getSystemDark());
  }
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const s = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  return s === "light" || s === "dark" || s === "system" ? s : "system";
}

let clientMode: ThemeMode = "system";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): ThemeMode {
  return clientMode;
}

function getServerSnapshot(): ThemeMode {
  return "system";
}

export function initThemeFromStorage() {
  if (typeof window === "undefined") return;
  clientMode = readStoredMode();
  applyTheme(clientMode);
  emit();
}

export function setThemeMode(next: ThemeMode) {
  clientMode = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    emit();
    window.dispatchEvent(new Event(THEME_EVENT));
  }
}

function useSystemPrefersDark() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setV(mq.matches);
    const fn = () => setV(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return v;
}

function useGemstackTheme() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const systemPrefersDark = useSystemPrefersDark();

  useEffect(() => {
    initThemeFromStorage();
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) initThemeFromStorage();
    }
    function onCustom() {
      initThemeFromStorage();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_EVENT, onCustom);
    };
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const updateMode = useCallback((next: ThemeMode) => {
    setThemeMode(next);
  }, []);

  const effectiveDark = mode === "dark" || (mode === "system" && systemPrefersDark);

  return { mode, updateMode, effectiveDark };
}

export function ThemeToggleRow() {
  const { mode, updateMode } = useGemstackTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 animate-pulse rounded-lg bg-[var(--gs-border)]/40" aria-hidden />;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-[var(--gs-text)]">Color scheme</p>
        <p className="mt-0.5 text-xs text-[var(--gs-muted)]">Light, dark, or match your system setting.</p>
      </div>
      <div className="flex gap-1 rounded-full bg-[var(--gs-input-bg)] p-1 ring-1 ring-[var(--gs-border)]">
        {(
          [
            ["light", "Light", Sun] as const,
            ["system", "System", Monitor] as const,
            ["dark", "Dark", Moon] as const,
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => updateMode(key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)]/50 ${
              mode === key
                ? "bg-[var(--gs-card)] text-[var(--gs-accent)] shadow-sm ring-1 ring-[var(--gs-border)]"
                : "text-[var(--gs-muted)] hover:text-[var(--gs-text)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ThemeToggleTopBar() {
  const { mode, updateMode, effectiveDark } = useGemstackTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = useCallback(() => {
    const order: ThemeMode[] = ["light", "system", "dark"];
    const next = order[(order.indexOf(mode) + 1) % order.length]!;
    updateMode(next);
  }, [mode, updateMode]);

  if (!mounted) {
    return <div className="h-11 w-11 shrink-0" aria-hidden />;
  }

  const label =
    mode === "light" ? "Light mode" : mode === "dark" ? "Dark mode" : "System theme";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${label} — click to cycle`}
      aria-label={`${label}. Click to cycle theme.`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--gs-muted)] transition hover:bg-[var(--gs-topbar-icon-hover)] hover:text-[var(--gs-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gs-shell-header)]"
    >
      {effectiveDark ? <Moon className="h-5 w-5" strokeWidth={2} aria-hidden /> : <Sun className="h-5 w-5" strokeWidth={2} aria-hidden />}
    </button>
  );
}

export function ThemeToggleIconButton() {
  const { mode, updateMode, effectiveDark } = useGemstackTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = useCallback(() => {
    const order: ThemeMode[] = ["light", "system", "dark"];
    const next = order[(order.indexOf(mode) + 1) % order.length]!;
    updateMode(next);
  }, [mode, updateMode]);

  if (!mounted) {
    return <div className="h-10 px-3" aria-hidden />;
  }

  const label =
    mode === "light" ? "Light mode" : mode === "dark" ? "Dark mode" : "System theme";

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--gs-text)] transition-colors hover:bg-[var(--gs-accent-soft)] hover:text-[var(--gs-accent)]"
      role="menuitem"
    >
      {effectiveDark ? <Moon className="h-4 w-4 shrink-0" aria-hidden /> : <Sun className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 text-[10px] font-medium text-[var(--gs-muted)]">Cycle</span>
    </button>
  );
}
