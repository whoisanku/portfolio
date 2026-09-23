import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ChevronDown, Loader2, MessageCircle, X } from "lucide-react";
import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { OWNER_HANDLE } from "../lib/config";
import { useOwnerProfile } from "../lib/ownerProfile";
import { OwnerAvatarIcon } from "./OwnerAvatar";

/**
 * The chat's working half (sign-in, conversation, the atproto client) is
 * the heaviest code on the site, and most visitors never open it. It loads
 * on first open, and starts loading as soon as the launcher is hovered,
 * focused or touched, so by the click it's usually there.
 */
const loadPanel = () => import("./ChatPanel");
const ChatPanel = lazy(loadPanel);
const preloadPanel = () => void loadPanel();

const EASE = [0.16, 1, 0.3, 1] as const;

/** Panel header, shared by the loading shell and the loaded panel. */
export const ChatHeader = ({ onClose, actions }: { onClose: () => void; actions?: ReactNode }) => {
  const { displayName } = useOwnerProfile();
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3">
      <OwnerAvatarIcon className="h-8 w-8 border border-line" alt={OWNER_HANDLE} />
      <div className="min-w-0 flex-1 leading-tight">
        {/* Bluesky display name; the handle stands in when there is none. */}
        <p className="truncate font-mono text-[13px] text-ink">{displayName ?? `@${OWNER_HANDLE}`}</p>
      </div>
      {actions}
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-raise hover:text-ink"
        aria-label="Close chat"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
};

/**
 * Floating "message me" widget. Visitors sign in with their own handle and a
 * DM-enabled app password, then exchange real direct messages with the owner —
 * no OAuth, no backend. See src/lib/chat.ts for the transport.
 *
 * Once opened, the panel stays mounted (hidden and inert while closed) so the
 * conversation, scroll position and any half-written message survive closing.
 */
const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const toggle = () => {
    setMounted(true);
    setOpen((v) => !v);
  };

  return (
    // The wrapper spans the (hidden) panel's area too, so it must not catch clicks.
    <div className="pointer-events-none fixed right-5 bottom-5 z-[60] flex flex-col items-end gap-3 print:hidden">
      {mounted && (
        <m.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={
            open
              ? { opacity: 1, y: 0, scale: 1, visibility: "visible" }
              : { opacity: 0, y: 12, scale: 0.97, transitionEnd: { visibility: "hidden" } }
          }
          transition={{ duration: 0.18, ease: EASE }}
          inert={!open}
          role="dialog"
          aria-label="Chat with Ankit"
          className="pointer-events-auto flex h-[520px] max-h-[calc(100dvh-7rem)] w-[360px] max-w-[calc(100vw-2.5rem)] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
        >
          <Suspense
            fallback={
              <>
                <ChatHeader onClose={close} />
                <div className="flex flex-1 items-center justify-center text-ink-3" role="status">
                  <Loader2 size={18} className="animate-spin" aria-label="Loading chat" />
                </div>
              </>
            }
          >
            <ChatPanel open={open} onClose={close} />
          </Suspense>
        </m.div>
      )}

      {/* Launcher */}
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={preloadPanel}
        onFocus={preloadPanel}
        onTouchStart={preloadPanel}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-paper shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-transform fine:hover:scale-105 active:scale-95"
        aria-label={open ? "Close chat" : "Message Ankit"}
        aria-expanded={open}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span
            key={open ? "close" : "open"}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X size={20} /> : <MessageCircle size={20} />}
          </m.span>
        </AnimatePresence>
      </button>
    </div>
  );
};

export default ChatWidget;
