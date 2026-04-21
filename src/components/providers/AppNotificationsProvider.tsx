"use client";

/**
 * App-wide toasts and modal dialogs (replaces window.alert / confirm / prompt).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ToastStack, type ToastItem } from "@/components/ui/ToastStack";

export const APP_TOAST_EVENT = "gemstack-app-toast";

type ToastVariant = "success" | "error" | "info";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

export type PromptOptions = {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
};

type AppNotificationsContextValue = {
  pushToast: (message: string, variant?: ToastVariant) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const AppNotificationsContext = createContext<AppNotificationsContextValue | null>(null);

export function useAppNotifications(): AppNotificationsContextValue {
  const ctx = useContext(AppNotificationsContext);
  if (!ctx) {
    throw new Error("useAppNotifications must be used within AppNotificationsProvider");
  }
  return ctx;
}

/** Fire-and-forget toast from non-React code (e.g. print helpers). Listener is registered by AppNotificationsProvider. */
export function emitAppToast(message: string, variant: ToastVariant = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_TOAST_EVENT, { detail: { message, variant } }));
}

type ProviderProps = { children: ReactNode };

export function AppNotificationsProvider({ children }: ProviderProps) {
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const removeToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const pushToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++toastIdRef.current;
      setToasts((t) => [...t.slice(-4), { id, message, variant }]);
      window.setTimeout(() => removeToast(id), 4200);
    },
    [removeToast],
  );

  useEffect(() => {
    function onToastEvent(e: Event) {
      const ce = e as CustomEvent<{ message?: string; variant?: ToastVariant }>;
      const msg = typeof ce.detail?.message === "string" ? ce.detail.message : "";
      if (!msg.trim()) return;
      pushToast(msg, ce.detail?.variant ?? "info");
    }
    window.addEventListener(APP_TOAST_EVENT, onToastEvent);
    return () => window.removeEventListener(APP_TOAST_EVENT, onToastEvent);
  }, [pushToast]);

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);
  const [confirmMounted, setConfirmMounted] = useState(false);

  useEffect(() => setConfirmMounted(true), []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmOpts(options);
    });
  }, []);

  const finishConfirm = useCallback((value: boolean) => {
    const fn = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmOpts(null);
    fn?.(value);
  }, []);

  const promptResolveRef = useRef<((value: string | null) => void) | null>(null);
  const [promptOpts, setPromptOpts] = useState<PromptOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      promptResolveRef.current = resolve;
      setPromptValue(options.defaultValue ?? "");
      setPromptOpts(options);
    });
  }, []);

  const finishPrompt = useCallback((value: string | null) => {
    const fn = promptResolveRef.current;
    promptResolveRef.current = null;
    setPromptOpts(null);
    setPromptValue("");
    fn?.(value);
  }, []);

  const value: AppNotificationsContextValue = useMemo(
    () => ({ pushToast, confirm, prompt }),
    [pushToast, confirm, prompt],
  );

  const confirmPortal =
    confirmMounted && confirmOpts
      ? createPortal(
          <div className="fixed inset-0 z-[270] flex items-center justify-center p-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              aria-label="Dismiss"
              onClick={() => finishConfirm(false)}
            />
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="gemstack-confirm-title"
              className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="gemstack-confirm-title" className="text-lg font-bold text-[var(--gs-text)]">
                {confirmOpts.title}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--gs-muted)]">{confirmOpts.message}</p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => finishConfirm(false)}
                  className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  {confirmOpts.cancelLabel ?? "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => finishConfirm(true)}
                  className={
                    confirmOpts.variant === "danger"
                      ? "rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      : "rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                  }
                >
                  {confirmOpts.confirmLabel ?? "OK"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const promptPortal =
    confirmMounted && promptOpts
      ? createPortal(
          <div className="fixed inset-0 z-[270] flex items-center justify-center p-4" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              aria-label="Dismiss"
              onClick={() => finishPrompt(null)}
            />
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="gemstack-prompt-title"
              className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--gs-border)] bg-[var(--gs-card)] p-5 shadow-2xl"
              onSubmit={(e) => {
                e.preventDefault();
                finishPrompt(promptValue);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="gemstack-prompt-title" className="text-lg font-bold text-[var(--gs-text)]">
                {promptOpts.title}
              </h2>
              {promptOpts.message ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--gs-muted)]">{promptOpts.message}</p>
              ) : null}
              <label className="mt-4 block text-sm font-medium text-[var(--gs-text)]">
                {promptOpts.label ?? "Value"}
                <input
                  autoFocus
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={promptOpts.placeholder}
                  className="gs-field mt-2 w-full"
                />
              </label>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => finishPrompt(null)}
                  className="rounded-full border border-[var(--gs-border)] px-4 py-2 text-sm font-semibold text-[var(--gs-text)] hover:bg-[var(--gs-hover)]"
                >
                  {promptOpts.cancelLabel ?? "Cancel"}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[var(--gs-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                >
                  {promptOpts.submitLabel ?? "OK"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )
      : null;

  return (
    <AppNotificationsContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onRemove={removeToast} />
      {confirmPortal}
      {promptPortal}
    </AppNotificationsContext.Provider>
  );
}
