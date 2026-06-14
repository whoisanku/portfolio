/* eslint-disable react-refresh/only-export-components */
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
import ConfirmDialog from "./ConfirmDialog";

interface ConfirmOptions {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as a destructive action. */
  danger?: boolean;
}

interface PromptOptions {
  title: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: "text" | "url";
}

interface DialogApi {
  /** Resolves true when confirmed, false when cancelled/dismissed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the entered string, or null when cancelled/dismissed. */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type ActiveDialog =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (v: string | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

/**
 * App-wide replacement for the browser's `confirm()` / `prompt()`. Mount once
 * near the root; call `useDialog()` anywhere to await a styled dialog rendered
 * through the shared {@link ConfirmDialog} shell. One dialog shows at a time.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setActive({ kind: "confirm", options, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setInputValue(options.defaultValue ?? "");
        setActive({ kind: "prompt", options, resolve });
      }),
    [],
  );

  const settle = useCallback(
    (result: boolean | string | null) => {
      setActive((current) => {
        // resolve outside of setState's scope guarantees a single resolution
        if (current) current.resolve(result as never);
        return null;
      });
    },
    [],
  );

  const cancel = useCallback(() => {
    setActive((current) => {
      if (current) current.resolve((current.kind === "prompt" ? null : false) as never);
      return null;
    });
  }, []);

  // Focus the input when a prompt opens.
  useEffect(() => {
    if (active?.kind === "prompt") {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [active]);

  // Escape always cancels the open dialog. Capture-phase + stopPropagation so a
  // dialog opened over the admin modal doesn't also trigger the modal's own
  // Escape-to-close handler.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, cancel]);

  const api = useMemo<DialogApi>(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {active?.kind === "confirm" && (
        <ConfirmDialog
          layer="fixed"
          className="!z-[1200]"
          title={active.options.title}
          description={active.options.description}
          onDismiss={cancel}
          actions={[
            {
              key: "cancel",
              label: active.options.cancelLabel ?? "Cancel",
              onClick: cancel,
              variant: "quiet",
            },
            {
              key: "confirm",
              label: active.options.confirmLabel ?? "Confirm",
              onClick: () => settle(true),
              variant: active.options.danger ? "danger" : "primary",
            },
          ]}
        />
      )}
      {active?.kind === "prompt" && (
        <ConfirmDialog
          layer="fixed"
          className="!z-[1200]"
          title={active.options.title}
          description={active.options.description}
          onDismiss={cancel}
          actions={[
            {
              key: "cancel",
              label: active.options.cancelLabel ?? "Cancel",
              onClick: cancel,
              variant: "quiet",
            },
            {
              key: "confirm",
              label: active.options.confirmLabel ?? "OK",
              onClick: () => settle(inputValue.trim() ? inputValue.trim() : null),
              variant: "primary",
            },
          ]}
        >
          <input
            ref={inputRef}
            type={active.options.inputType ?? "text"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                settle(inputValue.trim() ? inputValue.trim() : null);
              }
            }}
            placeholder={active.options.placeholder}
            className="mt-3 w-full rounded-lg border border-line bg-raise/40 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent/50"
          />
        </ConfirmDialog>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
