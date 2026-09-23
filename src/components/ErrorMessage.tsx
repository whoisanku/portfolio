import { RotateCw } from "lucide-react";

/**
 * Inline failure state. With `onRetry`, offers a retry right where the
 * content should be; `retrying` keeps the button busy while it runs.
 */
const ErrorMessage = ({
  message,
  onRetry,
  retrying = false,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) => (
  <div className="flex flex-col items-center gap-4 py-12 text-center" role="alert">
    <p className="max-w-[46ch] font-mono text-xs leading-relaxed text-red-500">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="pressable inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 font-mono text-[12px] text-ink-2 hover:border-ink-3 hover:text-ink disabled:opacity-60"
      >
        <RotateCw size={13} className={retrying ? "animate-spin" : ""} />
        {retrying ? "Retrying…" : "Try again"}
      </button>
    )}
  </div>
);

export default ErrorMessage;
