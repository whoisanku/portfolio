import { createPortal } from "react-dom";
import blueskyLogo from "../assets/bsky.svg";

/**
 * Full-screen veil shown during the brief gap between hitting "sign in" and the
 * browser actually navigating to Bluesky's OAuth page — so the wait never reads
 * as a frozen UI. Sits above the admin modal (z 1000), below toasts (z 2000).
 */
const RedirectOverlay = ({
  show,
  label = "Redirecting to Bluesky…",
}: {
  show: boolean;
  label?: string;
}) => {
  if (!show || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center backdrop-blur-md"
      style={{ background: "color-mix(in oklch, var(--ink) 55%, transparent)" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-paper px-6 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
        <img
          src={blueskyLogo}
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
        />
        <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="font-mono text-[12px] text-ink-2">{label}</span>
      </div>
    </div>,
    document.body,
  );
};

export default RedirectOverlay;
