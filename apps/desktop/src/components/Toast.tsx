import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/UI";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastDescriptor {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: ToastAction;
  durationMs: number;
}

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: ToastAction;
  durationMs?: number;
}

interface ToastContextValue {
  show: (toast: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_META: Record<ToastTone, { icon: string; ring: string; iconColor: string }> = {
  info: {
    icon: "info",
    ring: "ring-secondary-fixed-dim/60",
    iconColor: "text-secondary"
  },
  success: {
    icon: "check_circle",
    ring: "ring-primary/30",
    iconColor: "text-primary"
  },
  warning: {
    icon: "tips_and_updates",
    ring: "ring-tertiary-fixed-dim/70",
    iconColor: "text-tertiary"
  },
  error: {
    icon: "error",
    ring: "ring-error/30",
    iconColor: "text-error"
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastDescriptor[]>([]);
  const idRef = useRef(1);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = idRef.current++;
      const descriptor: ToastDescriptor = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? "info",
        action: input.action,
        durationMs: input.durationMs ?? 5000
      };
      setToasts((prev) => [...prev, descriptor]);
      const timer = window.setTimeout(() => dismiss(id), descriptor.durationMs);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        className="pointer-events-none fixed z-[60] flex flex-col gap-sm w-[min(92vw,360px)] bottom-[calc(72px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 md:bottom-lg md:right-lg md:left-auto md:translate-x-0 md:max-w-sm"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const meta = TONE_META[toast.tone];
          return (
            <div
              key={toast.id}
              className={`dialog-pop-in pointer-events-auto flex items-start gap-sm rounded-lg bg-surface-container-lowest/95 backdrop-blur-md ring-1 ${meta.ring} px-md py-sm shadow-modal`}
              role="status"
            >
              <Icon name={meta.icon} className={`text-[22px] mt-0.5 shrink-0 ${meta.iconColor}`} filled />
              <div className="flex-1 min-w-0">
                <p className="font-label-md text-label-md text-on-surface leading-tight">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-1 text-label-sm font-label-sm text-on-surface-variant leading-relaxed">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-xs shrink-0">
                {toast.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action!.onClick();
                      dismiss(toast.id);
                    }}
                    className="rounded-full px-sm py-xs text-label-sm font-label-sm text-primary transition-colors hover:bg-primary-container/40 active:scale-[0.97]"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
                <div className={`relative ${meta.iconColor}`}>
                  {/* 倒计时环 — 在关闭按钮外圈匀速收紧 */}
                  <svg className="toast-ring" width="28" height="28" viewBox="0 0 28 28" aria-hidden>
                    <circle className="toast-ring__track" cx="14" cy="14" r="12" />
                    <circle
                      className="toast-ring__progress"
                      cx="14"
                      cy="14"
                      r="12"
                      style={{ ["--toast-duration" as string]: `${toast.durationMs}ms` }}
                    />
                  </svg>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    className="relative grid h-7 w-7 place-items-center rounded-full text-on-surface-variant/80 transition-colors hover:bg-surface-container hover:text-on-surface active:scale-95"
                    aria-label="关闭提示"
                  >
                    <Icon name="close" className="text-[16px]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => -1,
      dismiss: () => undefined
    };
  }
  return ctx;
}
