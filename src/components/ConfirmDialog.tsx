import { useId, type ReactNode } from "react";

export interface ConfirmDialogAction {
  key: string;
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "quiet" | "danger" | "primary";
}

interface ConfirmDialogProps {
  title: ReactNode;
  description?: ReactNode;
  actions: ConfirmDialogAction[];
  onDismiss?: () => void;
  layer?: "absolute" | "fixed";
  className?: string;
  /** Extra content between the description and the action row (e.g. a prompt input). */
  children?: ReactNode;
}

const actionClasses: Record<NonNullable<ConfirmDialogAction["variant"]>, string> = {
  quiet:
    "rounded-lg px-3 py-2 font-mono text-[11px] text-ink-3 transition-colors hover:bg-raise hover:text-ink disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "rounded-lg px-3 py-2 font-mono text-[11px] text-ink-3 transition-colors hover:bg-raise hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50",
  primary:
    "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
};

const ConfirmDialog = ({
  title,
  description,
  actions,
  onDismiss,
  layer = "absolute",
  className = "",
  children,
}: ConfirmDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      className={`${layer} inset-0 z-20 flex items-center justify-center bg-paper/85 px-4 backdrop-blur-sm ${className}`}
      onClick={onDismiss}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-sm rounded-[10px] border border-line bg-paper p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-[20px] font-medium text-ink">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-ink-2">
            {description}
          </p>
        )}
        {children}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={actionClasses[action.variant ?? "quiet"]}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ConfirmDialog;
