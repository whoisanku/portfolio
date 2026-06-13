import type { AtpAgent } from "@atproto/api";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, HelpCircle, Loader2, LogOut, MessageCircle, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { OWNER_HANDLE } from "../lib/config";
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

type Phase = "loading" | "signed-out" | "signed-in";

const APP_PASSWORD_URL = "https://bsky.app/settings/app-passwords";
const SIGNUP_URL = "https://bsky.app/";
const POLL_MS = 4000;

const TooltipShell = ({
  width,
  apexX,
  children,
}: {
  width: number;
  apexX: number;
  children: React.ReactNode;
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (contentRef.current) setHeight(contentRef.current.offsetHeight);
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
 * Floating "message me" widget. Visitors sign in with their own handle and a
 * DM-enabled app password, then exchange real direct messages with the owner —
 * no OAuth, no backend. See src/lib/chat.ts for the transport.
 */
const ChatWidget = ({ ownerAvatar }: { ownerAvatar: string | null }) => {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");

  const agentRef = useRef<AtpAgent | null>(null);
  const [myDid, setMyDid] = useState<string | null>(null);
  const [convoId, setConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convoError, setConvoError] = useState<string | null>(null);

  // login form
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // composer
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /** Open the owner conversation and load its history. */
  const loadConvo = useCallback(async (agent: AtpAgent) => {
    setConvoError(null);
    try {
      const id = await getOwnerConvoId(agent);
      setConvoId(id);
      setMessages(await fetchMessages(agent, id));
    } catch (err) {
      setConvoError(friendlyChatError(err));
    }
  }, []);

  // Restore an existing session on first mount.
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

  // Poll for new messages while the panel is open and signed in.
  useEffect(() => {
    if (!open || phase !== "signed-in" || !convoId) return;
    const agent = agentRef.current;
    if (!agent) return;
    const tick = async () => {
      try {
        setMessages(await fetchMessages(agent, convoId));
      } catch {
        /* transient — next tick retries */
      }
    };
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [open, phase, convoId]);

  // Keep the latest message in view.
  useEffect(() => {
    if (open && phase === "signed-in") {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, open, phase]);

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
    setDraft("");
    try {
      await sendMessage(agent, convoId, text);
      setMessages(await fetchMessages(agent, convoId));
    } catch (err) {
      setConvoError(friendlyChatError(err));
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
    setConvoError(null);
    setPhase("signed-out");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 print:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[520px] max-h-[calc(100vh-7rem)] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              {ownerAvatar ? (
                <img
                  src={ownerAvatar}
                  alt={OWNER_HANDLE}
                  className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
                />
              ) : (
                <span className="h-8 w-8 shrink-0 rounded-full border border-line bg-raise" />
              )}
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-mono text-[13px] text-ink">Ankt Bhandari</p>
              </div>
              {phase === "signed-in" && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-raise hover:text-ink"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-raise hover:text-ink"
                aria-label="Close chat"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Body */}
            {phase === "loading" && (
              <div className="flex flex-1 items-center justify-center text-ink-3">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}

            {phase === "signed-out" && (
              <form
                onSubmit={handleLogin}
                className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4"
              >
                <div>
                  <p className="text-sm font-medium text-ink">Message Anku</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-3">
                    Sign in with your handle to start a conversation.
                  </p>
                </div>

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
                    className="rounded-lg border border-line bg-raise px-3 py-2 font-mono text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
                      App password
                    </span>
                    <div className="group relative flex items-center">
                      <HelpCircle
                        size={12}
                        className="cursor-help text-ink-3 transition-colors hover:text-ink"
                      />
                      <div className="absolute bottom-full left-[-80px] z-50 pb-2.5 w-60 transition-all duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
                        <TooltipShell width={240} apexX={86}>
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
                      </div>
                    </div>
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
                  <p className="text-[12px] leading-relaxed text-red-500">{loginError}</p>
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
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                  {convoError ? (
                    <div className="flex h-full items-center justify-center px-4 text-center text-[12px] leading-relaxed text-ink-3">
                      {convoError}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-[13px] text-ink-3">
                      Say hi to Anku 👋
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {messages.map((m) => {
                        const mine = m.sender?.did === myDid;
                        return (
                          <div
                            key={m.id}
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${mine
                              ? "self-end bg-accent text-paper"
                              : "self-start border border-line bg-raise text-ink"
                              }`}
                          >
                            {m.text}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!convoError && (
                  <div className="flex items-end gap-2 border-t border-line p-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onComposerKey}
                      rows={1}
                      placeholder="Write a message…"
                      className="max-h-28 flex-1 resize-none rounded-lg border border-line bg-raise px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!draft.trim() || sending}
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
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-paper shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? "Close chat" : "Message Anku"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "open"}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X size={20} /> : <MessageCircle size={20} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
};

export default ChatWidget;
