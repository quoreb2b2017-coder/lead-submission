"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);
const DURATION = 4000;

const STYLES = {
  success: { box: "bg-emerald-600 text-white shadow-emerald-900/25", icon: CheckCircle2, bar: "bg-white/40", sub: "text-emerald-50/90", close: "text-emerald-100 hover:bg-white/15 hover:text-white" },
  error: { box: "bg-red-600 text-white shadow-red-900/25", icon: AlertCircle, bar: "bg-white/40", sub: "text-red-50/90", close: "text-red-100 hover:bg-white/15 hover:text-white" },
  info: { box: "bg-slate-900 text-white shadow-slate-900/30", icon: Info, bar: "bg-white/30", sub: "text-slate-300", close: "text-slate-300 hover:bg-white/10 hover:text-white" },
};

function ToastItem({ t, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION);
  const started = useRef(0);
  const s = STYLES[t.type] || STYLES.success;
  const Icon = s.icon;

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(t.id), 180);
  }, [onDismiss, t.id]);

  // Auto-dismiss; hovering pauses the timer
  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const id = setTimeout(close, remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current -= Date.now() - started.current;
    };
  }, [paused, close]);

  return (
    <div
      role={t.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto relative w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl shadow-2xl ${s.box} ${
        leaving ? "animate-[toast-out_180ms_ease-in_forwards]" : "animate-[toast-in_320ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{t.title || t.message}</p>
          {t.title && t.message && <p className={`mt-0.5 text-[13px] leading-snug ${s.sub}`}>{t.message}</p>}
        </div>
        <button onClick={close} className={`-mr-1 -mt-0.5 rounded-md p-1 transition ${s.close}`} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-1 w-full bg-black/10">
        <div
          className={`h-full origin-left ${s.bar}`}
          style={{ animation: `toast-progress ${DURATION}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((all) => all.filter((x) => x.id !== id)), []);

  /**
   * toast("Saved")                                  → green
   * toast("Couldn't save", "error")                 → red
   * toast("Lead submitted", "success", { title })   → title + message
   */
  const toast = useCallback((message, type = "success", opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((all) => [...all.slice(-3), { id, message, type, title: opts.title }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col items-end gap-2.5 sm:right-5 sm:top-5" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
