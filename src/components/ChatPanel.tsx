import type { AtpAgent } from "@atproto/api";
import { HelpCircle, Loader2, LogOut, Send } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  clearChatSession,
  fetchMessages,
  friendlyChatError,
  getOwnerConvoId,
  loginWithAppPassword,
  resumeChatSession,
  sendMessage,
  type ChatMessage,
} from "../lib/chat";
import { ChatHeader } from "./ChatWidget";

type Phase = "loading" | "signed-out" | "signed-in";

/** A message on screen: sent, or still on its way (shown dimmed). */
type DisplayMessage = ChatMessage & { pending?: boolean };

const APP_PASSWORD_URL = "https://bsky.app/settings/app-passwords";
const SIGNUP_URL = "https://bsky.app/";
const POLL_MS = 4000;
/** Distance from the bottom (px) within which we still auto-follow new messages. */
const STICK_THRESHOLD = 80;
/** Scroll position from the top (px) that triggers loading older history. */
const LOAD_OLDER_THRESHOLD = 64;

/** Merge message lists, de-duplicating by id and sorting oldest-first by sentAt. */
function mergeMessages(a: DisplayMessage[], b: DisplayMessage[]): DisplayMessage[] {
  const byId = new Map<string, DisplayMessage>();
  for (const m of a) byId.set(m.id, m);
  for (const m of b) byId.set(m.id, m);
  return [...byId.values()].sort((x, y) => {
    const sx = typeof x.sentAt === "string" ? x.sentAt : "";
    const sy = typeof y.sentAt === "string" ? y.sentAt : "";
    return sx < sy ? -1 : sx > sy ? 1 : 0;
  });
}

const TooltipShell = ({
  width,
  apexX,
  children,
}: {
  width: number;
  apexX: number;
  children: ReactNode;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Track the content's height so the bubble always wraps it exactly.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const r = 10;
  const caretH = 6;
  const h = height;
  const apex = apexX;
  const baseL = apex - 6;
  const baseR = apex + 6;

  const d =
    h > 0
      ? `M${r} 0 ` +
      `L${width - r} 0 ` +
      `A${r} ${r} 0 0 1 ${width} ${r} ` +
      `L${width} ${h - r} ` +
      `A${r} ${r} 0 0 1 ${width - r} ${h} ` +
      `L${baseR} ${h} ` +
      `L${apex + 1.2} ${h + 5.3} Q${apex} ${h + 6.5} ${apex - 1.2} ${h + 5.3} ` +
      `L${baseL} ${h} ` +
      `L${r} ${h} ` +
      `A${r} ${r} 0 0 1 0 ${h - r} ` +
      `L0 ${r} ` +
      `A${r} ${r} 0 0 1 ${r} 0 Z`
      : "";

  return (
    <div className="relative" style={{ width }}>
      {h > 0 && (
        <svg
          aria-hidden="true"
          width={width}
          height={h + caretH}
          viewBox={`0 0 ${width} ${h + caretH}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            overflow: "visible",
            pointerEvents: "none",
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.45))",
          }}
        >
          <path
            d={d}
            fill="var(--color-paper)"
            stroke="var(--color-line)"
            strokeWidth="1"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <div ref={contentRef} className="relative px-4 py-3.5 flex flex-col">
        {children}
      </div>
    </div>
  );
};

/**
 * "What is an app password?" help. Hover opens the tooltip on desktop, and tap/click
 * toggles a persistent tooltip (rendered in a portal so the chat panel's `overflow-hidden`
 * can't clip it) positioned above the trigger via fixed coordinates. Works on desktop
 * and touch, and the "Create one on Bluesky" link stays clickable.
 */
const AppPasswordHelp = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number; apexX: number } | null>(null);

  const isOpen = isHovered || isClicked;

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 240;
    const margin = 8;
    const iconCenter = r.left + r.width / 2;
    const left = Math.max(margin, Math.min(iconCenter - width / 2, window.innerWidth - width - margin));
    setPos({ left, bottom: window.innerHeight - r.top + margin, apexX: iconCenter - left });
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  const handleClick = () => {
    setIsClicked((c) => {
      const next = !c;
      if (!next) {
        setIsHovered(false);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    place();
    const reposition = () => place();
    const onAway = (e: Event) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setIsClicked(false);
      setIsHovered(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsClicked(false);
        setIsHovered(false);
      }
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("mousedown", onAway);
    document.addEventListener("touchstart", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("touchstart", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label="What is an app password?"
        aria-expanded={isOpen}
        className="flex items-center text-ink-3 transition-colors hover:text-ink"
      >
        <HelpCircle size={12} className="cursor-pointer" />
      </button>
      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ position: "fixed", left: pos.left, bottom: pos.bottom, zIndex: 70 }}
          >
            <TooltipShell width={240} apexX={pos.apexX}>
              <p className="text-[11px] leading-relaxed text-ink-3">
                Requires a secure App Password with DM access. Your master password is never shared.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed">
                <a
                  href={APP_PASSWORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-medium hover:underline inline-flex items-center gap-0.5"
                >
                  Create one on Bluesky →
                </a>
              </p>
            </TooltipShell>
          </div>,
          document.body,
        )}
    </>
  );
};

/** Whether the tab is in front; polling pauses while it isn't. */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

/**
 * The working half of the chat widget (see ChatWidget.tsx): sign-in with an
 * app password, then a live 1:1 conversation with the owner.
 */
const ChatPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [phase, setPhase] = useState<Phase>("loading");
  const pageVisible = usePageVisible();

  const agentRef = useRef<AtpAgent | null>(null);
  const [myDid, setMyDid] = useState<string | null>(null);
  const [convoId, setConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [convoError, setConvoError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Upward pagination of older history.
  const [olderCursor, setOlderCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Scroll bookkeeping: are we pinned to the bottom, and what should the next
  // render do (jump to bottom, or hold position after prepending older msgs).
  const atBottomRef = useRef(true);
  const scrollIntentRef = useRef<"bottom" | "preserve" | null>(null);
  const prevScrollHeightRef = useRef<number | null>(null);

  // login form
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // composer
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /** Open the owner conversation and load its most recent page. */
  const loadConvo = useCallback(async (agent: AtpAgent) => {
    setConvoError(null);
    try {
      const id = await getOwnerConvoId(agent);
      setConvoId(id);
      const page = await fetchMessages(agent, id);
      atBottomRef.current = true;
      scrollIntentRef.current = "bottom";
      setMessages(page.messages);
      setOlderCursor(page.cursor);
      setHasMore(Boolean(page.cursor));
    } catch (err) {
      setConvoError(friendlyChatError(err));
    }
  }, []);

  /** Prepend the next older page, holding the visible scroll position. */
  const loadOlder = useCallback(async () => {
    const agent = agentRef.current;
    if (!agent || !convoId || !olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    const container = scrollContainerRef.current;
    prevScrollHeightRef.current = container ? container.scrollHeight : null;
    try {
      const page = await fetchMessages(agent, convoId, olderCursor);
      scrollIntentRef.current = "preserve";
      setMessages((prev) => mergeMessages(page.messages, prev));
      setOlderCursor(page.cursor);
      setHasMore(Boolean(page.cursor));
    } catch {
      /* leave hasMore set so the user can retry by scrolling up again */
    } finally {
      setLoadingOlder(false);
    }
  }, [convoId, olderCursor, loadingOlder]);

  // Restore an existing session when the panel first loads.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const agent = await resumeChatSession();
      if (cancelled) return;
      if (agent) {
        agentRef.current = agent;
        setMyDid(agent.session?.did ?? null);
        setPhase("signed-in");
        await loadConvo(agent);
      } else {
        setPhase("signed-out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConvo]);

  // Poll for new messages while the panel is open, signed in and on screen.
  useEffect(() => {
    if (!open || !pageVisible || phase !== "signed-in" || !convoId) return;
    const agent = agentRef.current;
    if (!agent) return;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const page = await fetchMessages(agent, convoId);
        setMessages((prev) => {
          const merged = mergeMessages(prev, page.messages);
          // Only follow new arrivals if the reader is already at the bottom —
          // otherwise leave their scroll position untouched.
          if (merged.length > prev.length && atBottomRef.current) {
            scrollIntentRef.current = "bottom";
          }
          return merged;
        });
      } catch {
        /* transient — next tick retries */
      } finally {
        inFlight = false;
      }
    };
    // Coming back to the tab (or reopening the panel): catch up right away.
    void tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [open, pageVisible, phase, convoId]);

  // Apply the pending scroll intent after the message list renders: jump to the
  // bottom for new/sent messages, or hold the viewport steady when older history
  // was prepended. No intent → don't touch the user's scroll position.
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const intent = scrollIntentRef.current;
    scrollIntentRef.current = null;
    if (intent === "bottom") {
      container.scrollTop = container.scrollHeight;
    } else if (intent === "preserve" && prevScrollHeightRef.current != null) {
      container.scrollTop += container.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
    }
  }, [messages]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || !appPassword.trim() || submitting) return;
    setSubmitting(true);
    setLoginError(null);
    try {
      const agent = await loginWithAppPassword(handle, appPassword);
      agentRef.current = agent;
      setMyDid(agent.session?.did ?? null);
      setPhase("signed-in");
      setAppPassword("");
      await loadConvo(agent);
    } catch (err) {
      setLoginError(friendlyChatError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    const agent = agentRef.current;
    if (!text || !convoId || !agent || sending) return;
    setSending(true);
    setSendError(null);
    setDraft("");

    // Show the message straight away; swap in the stored one when it lands.
    const tempId = `pending-${Date.now()}`;
    const pending = {
      id: tempId,
      rev: "",
      text,
      sender: { did: myDid ?? "" },
      sentAt: new Date().toISOString(),
      pending: true,
    } as DisplayMessage;
    atBottomRef.current = true;
    scrollIntentRef.current = "bottom";
    setMessages((prev) => [...prev, pending]);

    try {
      const sent = await sendMessage(agent, convoId, text);
      scrollIntentRef.current = "bottom";
      setMessages((prev) => mergeMessages(prev.filter((m) => m.id !== tempId), [sent]));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError(friendlyChatError(err));
      setDraft(text); // restore so nothing is lost
    } finally {
      setSending(false);
    }
  };

  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSignOut = () => {
    clearChatSession();
    agentRef.current = null;
    setMyDid(null);
    setConvoId(null);
    setMessages([]);
    setOlderCursor(undefined);
    setHasMore(false);
    setConvoError(null);
    setSendError(null);
    setPhase("signed-out");
  };

  // Track bottom-stickiness and trigger older-history loads near the top.
  const handleMessagesScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    atBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      STICK_THRESHOLD;
    if (container.scrollTop < LOAD_OLDER_THRESHOLD && hasMore && !loadingOlder) {
      void loadOlder();
    }
  };

  return (
    <>
      <ChatHeader
        onClose={onClose}
        actions={
          phase === "signed-in" && (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-raise hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          )
        }
      />

      {/* Body */}
      {phase === "loading" && (
        <div className="flex flex-1 items-center justify-center text-ink-3" role="status">
          <Loader2 size={18} className="animate-spin" aria-label="Loading chat" />
        </div>
      )}

      {phase === "signed-out" && (
        <form
          onSubmit={handleLogin}
          className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4"
        >

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
              Handle
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="you.bsky.social"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              className="rounded-lg border border-line bg-raise px-3 py-2 font-mono text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
                App password
              </span>
              <AppPasswordHelp />
            </div>
            <input
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              autoComplete="off"
              className="rounded-lg border border-line bg-raise px-3 py-2 font-mono text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
            />
          </label>

          {loginError && (
            <p className="text-[12px] leading-relaxed text-red-500" role="alert">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-1.5 text-center font-mono text-[11px] text-ink-3">
            Don't have an account?{" "}
            <a
              href={SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent font-medium hover:underline"
            >
              Sign up from here
            </a>
          </div>
        </form>
      )}

      {phase === "signed-in" && (
        <>
          <div
            ref={scrollContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-3"
            aria-live="polite"
          >
            {convoError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-[12px] leading-relaxed text-ink-3">
                {convoError}
                <button
                  type="button"
                  onClick={() => agentRef.current && void loadConvo(agentRef.current)}
                  className="font-mono text-[11px] text-accent hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-[13px] text-ink-3">
                {convoId ? "Say hi to Anku 👋" : <Loader2 size={16} className="animate-spin" />}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(loadingOlder || hasMore) && (
                  <div className="flex justify-center py-1.5">
                    {loadingOlder ? (
                      <Loader2 size={14} className="animate-spin text-ink-3" />
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3/70">
                        Scroll up for older
                      </span>
                    )}
                  </div>
                )}
                {messages.map((m) => {
                  const mine = m.sender?.did === myDid;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words transition-opacity ${mine
                        ? "self-end bg-accent text-paper"
                        : "self-start border border-line bg-raise text-ink"
                        } ${m.pending ? "opacity-60" : ""}`}
                    >
                      {m.text}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!convoError && (
            <div className="border-t border-line p-2">
              {sendError && (
                <p className="px-1 pb-2 text-[11.5px] leading-relaxed text-red-500" role="alert">
                  {sendError}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKey}
                  rows={1}
                  placeholder="Write a message…"
                  aria-label="Message"
                  className="max-h-28 flex-1 resize-none rounded-lg border border-line bg-raise px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || sending || !convoId}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ChatPanel;
