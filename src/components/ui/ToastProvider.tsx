"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastKind = "success" | "error";
type ToastOptions = { kind?: ToastKind; actionLabel?: string; actionHref?: string; durationMs?: number };
type ToastEntry = { id: number; message: string; kind: ToastKind; actionLabel?: string; actionHref?: string };

const ToastContext = createContext<{ showToast: (message: string, options?: ToastOptions) => void } | null>(null);

// No toast/snackbar system existed anywhere in the app before this — every
// other async action either reloaded the page or showed inline text. This
// is deliberately minimal (no external toast library): a context + a fixed
// stack of auto-dismissing cards, mounted once in the root layout so any
// client component can call useToast() without prop drilling.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = nextId.current++;
    const entry: ToastEntry = { id, message, kind: options?.kind || "success", actionLabel: options?.actionLabel, actionHref: options?.actionHref };
    setToasts((prev) => [...prev, entry]);
    const duration = options?.durationMs ?? 5000;
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border bg-white p-3.5 shadow-[0_12px_32px_rgba(20,32,48,0.14)] ${toast.kind === "error" ? "border-[#F2C6BE]" : "border-hair"}`}
          >
            {toast.kind === "error" ? <XCircle size={16} className="mt-0.5 shrink-0 text-[#9D3127]" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-5 text-ink">{toast.message}</p>
              {toast.actionHref && toast.actionLabel && (
                <Link href={toast.actionHref} onClick={() => dismiss(toast.id)} className="mt-1 inline-block text-xs font-semibold text-navy">{toast.actionLabel}</Link>
              )}
            </div>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="shrink-0 text-mute hover:text-ink"><X size={13} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
