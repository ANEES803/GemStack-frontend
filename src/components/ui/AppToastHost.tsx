"use client";

import { useCallback, useEffect, useState } from "react";

type ToastRecord = {
  id: string;
  message: string;
};

function ToastItem({ message, onRemove }: { message: string; onRemove: () => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const visibleMs = 3000 + Math.random() * 2000;
    const tExit = window.setTimeout(() => setLeaving(true), visibleMs);
    const tRemove = window.setTimeout(onRemove, visibleMs + 520);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(tExit);
      window.clearTimeout(tRemove);
    };
  }, [onRemove]);

  return (
    <div
      role="alert"
      className={`gs-toast-motion pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-red-200/90 bg-gradient-to-r from-red-50/95 via-rose-50/80 to-white px-4 py-3.5 shadow-[0_12px_40px_rgba(185,28,28,0.08)] ring-1 ring-red-100/90 transition-[transform,opacity] duration-500 ease-out ${
        leaving
          ? "translate-x-[110vw] opacity-0"
          : entered
            ? "translate-x-0 opacity-100"
            : "-translate-x-[110vw] opacity-0"
      }`}
    >
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 ring-1 ring-red-200/80"
        aria-hidden
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <p className="min-w-0 flex-1 pt-1 text-sm font-medium leading-relaxed text-red-900">{message}</p>
    </div>
  );
}

/**
 * Replaces blocking `window.alert` with stacked toasts that slide in from the left,
 * rest 3–5s, then slide out to the right.
 */
export function AppToastHost() {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const pushToast = useCallback((message: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `t-${Date.now()}-${Math.random()}`;
    setToasts((prev) => {
      const next = [...prev, { id, message }];
      return next.length > 2 ? next.slice(-2) : next;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const original = window.alert.bind(window);
    window.alert = (msg?: string) => {
      pushToast(String(msg ?? ""));
    };
    return () => {
      window.alert = original;
    };
  }, [pushToast]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-end gap-2 px-4 sm:top-5 sm:px-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} message={t.message} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
