/* eslint-disable react-refresh/only-export-components */
import { AlertCircle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

export type ToastVariant = "success" | "error" | "info" | "loading";

export interface ToastAction {
  label: string;
  /** External link — opens in a new tab. */
  href?: string;
  /** Internal router link. */
  to?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  description?: string;
  actions?: ToastAction[];
  /** ms before auto-dismiss; `null` keeps it sticky (used for loading). */
  duration?: number | null;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastApi {
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  loading: (message: string, options?: ToastOptions) => string;
  show: (variant: ToastVariant, message: string, options?: ToastOptions) => string;
  update: (
    id: string,
    variant: ToastVariant,
    message: string,
    options?: ToastOptions,
  ) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number | null> = {
  success: 4500,
  error: 6500,
  info: 4000,
  loading: null,
};

/** Icon + accent color per variant. */
const VARIANT_META: Record<
  ToastVariant,
  { Icon: typeof Info; iconClass: string; bar: string }
> = {
  success: {
    Icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bar: "#10b981",
  },
  error: { Icon: AlertCircle, iconClass: "text-red-500", bar: "#ef4444" },
  info: { Icon: Info, iconClass: "text-accent", bar: "var(--accent-ink)" },
  loading: { Icon: Loader2, iconClass: "text-accent", bar: "var(--accent-ink)" },
};

let counter = 0;
const nextId = () => `toast-${Date.now()}-${counter++}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const schedule = useCallback(
    (id: string, duration: number | null) => {
      clearTimer(id);
      if (duration != null) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration));
      }
    },
    [clearTimer, dismiss],
  );

  const show = useCallback(
    (variant: ToastVariant, message: string, options?: ToastOptions) => {
      const id = nextId();
      const duration =
        options?.duration === undefined ? DEFAULT_DURATION[variant] : options.duration;
      setToasts((prev) => [...prev, { id, variant, message, ...options, duration }]);
      schedule(id, duration);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: string, variant: ToastVariant, message: string, options?: ToastOptions) => {
      const duration =
        options?.duration === undefined ? DEFAULT_DURATION[variant] : options.duration;
      setToasts((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, variant, message, ...options, duration } : t,
        ),
      );
      schedule(id, duration);
    },
    [schedule],
  );

  // Flush any pending timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, o) => show("success", m, o),
      error: (m, o) => show("error", m, o),
      info: (m, o) => show("info", m, o),
      loading: (m, o) => show("loading", m, o),
      update,
      dismiss,
    }),
    [show, update, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[2000] flex flex-col items-center gap-2.5 px-4 pb-4 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end sm:px-0 sm:pb-0">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const meta = VARIANT_META[t.variant];
          const { Icon } = meta;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="pointer-events-auto w-full overflow-hidden rounded-xl border border-line bg-paper shadow-[0_14px_38px_rgba(0,0,0,0.22)] sm:w-[360px]"
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <Icon
                  size={17}
                  className={`mt-0.5 shrink-0 ${meta.iconClass} ${
                    t.variant === "loading" ? "animate-spin" : ""
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-snug font-medium text-ink">
                    {t.message}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-ink-3">
                      {t.description}
                    </p>
                  )}
                  {t.actions && t.actions.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      {t.actions.map((action) => {
                        const cls =
                          "font-mono text-[11px] font-medium text-accent underline-offset-2 transition-opacity hover:opacity-80 hover:underline";
                        if (action.to) {
                          return (
                            <Link
                              key={action.label}
                              to={action.to}
                              onClick={() => {
                                action.onClick?.();
                                onDismiss(t.id);
                              }}
                              className={cls}
                            >
                              {action.label}
                            </Link>
                          );
                        }
                        if (action.href) {
                          return (
                            <a
                              key={action.label}
                              href={action.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => action.onClick?.()}
                              className={cls}
                            >
                              {action.label}
                            </a>
                          );
                        }
                        return (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => {
                              action.onClick?.();
                              onDismiss(t.id);
                            }}
                            className={cls}
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(t.id)}
                  aria-label="Dismiss"
                  className="-mr-1 mt-0.5 shrink-0 text-ink-3 transition-colors hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Timed toasts: a depleting bar. Loading: indeterminate slider. */}
              {t.variant === "loading" ? (
                <div className="cover-upload-bar !w-full !rounded-none">
                  <span />
                </div>
              ) : (
                t.duration != null && (
                  <motion.div
                    className="h-[2px] origin-left"
                    style={{ background: meta.bar }}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: t.duration / 1000, ease: "linear" }}
                  />
                )
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
