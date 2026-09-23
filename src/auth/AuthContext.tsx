/* eslint-disable react-refresh/only-export-components */
import type { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client-browser";
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
import { useNavigate } from "react-router-dom";
import { OWNER_HANDLE } from "../lib/config";
import type { BlogEntry } from "../lib/blog";
import { readString } from "../lib/storage";
import { useToast } from "../components/Toast";
import {
  clearAuthReturnPath,
  clearPendingAdminAuth,
  hasPendingAdminAuth,
  isOAuthCallbackPath,
  markPendingAdminAuth,
  readAuthReturnPath,
  rememberAuthReturnPath,
} from "./oauthState";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

const IS_DEV = window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]";

/**
 * Where @atproto/oauth-client-browser records the signed-in account. When
 * it's absent the client's init() has nothing to restore, so there's no
 * reason to download the OAuth stack at all.
 */
const OAUTH_SUB_KEY = "@@atproto/oauth-client-browser(sub)";

/** Whether this page load has an OAuth session to restore or finish. */
const needsOAuthInit = () =>
  !IS_DEV &&
  (isOAuthCallbackPath() || hasPendingAdminAuth() || readString(OAUTH_SUB_KEY) != null);

const loadRuntime = () => import("./oauthRuntime");

/** Start fetching the OAuth code ahead of a likely sign-in click. */
export const preloadAuthRuntime = () => {
  if (!IS_DEV) void loadRuntime();
};

interface AuthContextValue {
  status: AuthStatus;
  /** Authenticated agent — only set when the owner is signed in (null in dev mode). */
  agent: Agent | null;
  error: string | null;
  /** True while handing off to Bluesky or resolving the OAuth return. */
  signingIn: boolean;
  /** True when running on localhost — OAuth is bypassed, agent is null. */
  devMode: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Whether the admin modal is open. */
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  editingBlog: BlogEntry | null;
  setEditingBlog: (blog: BlogEntry | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Visitors (no stored session) are known to be signed out from the first
  // render; only a page load with a session to restore starts in "loading".
  const [status, setStatus] = useState<AuthStatus>(() =>
    needsOAuthInit() ? "loading" : "signed-out",
  );
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // True across the whole OAuth round-trip until client.init() resolves.
  const [signingIn, setSigningIn] = useState(
    () => !IS_DEV && (isOAuthCallbackPath() || hasPendingAdminAuth()),
  );
  const sessionRef = useRef<OAuthSession | null>(null);
  const initialized = useRef(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (!needsOAuthInit()) return;

    (async () => {
      const shouldOpenAdmin = hasPendingAdminAuth() || isOAuthCallbackPath();
      const finishOAuthReturn = () => {
        const wasCallback = isOAuthCallbackPath();
        const returnPath = readAuthReturnPath();
        clearPendingAdminAuth();
        clearAuthReturnPath();
        if (wasCallback) navigate(returnPath, { replace: true });
      };

      try {
        const { initOwnerSession } = await loadRuntime();
        const result = await initOwnerSession();

        if (result.kind === "none") {
          setStatus("signed-out");
          if (shouldOpenAdmin) finishOAuthReturn();
          return;
        }

        if (result.kind === "blocked") {
          setError(result.message);
          setStatus("signed-out");
          toast.error("Sign-in blocked", { description: result.message });
          if (shouldOpenAdmin) finishOAuthReturn();
          return;
        }

        sessionRef.current = result.session;
        setAgent(result.agent);
        setStatus("signed-in");

        // Only greet + open the panel when an actual sign-in just completed —
        // not on a silent session restore (every page reload would toast).
        if (shouldOpenAdmin) {
          toast.success("Signed in", {
            description: `Welcome back, @${OWNER_HANDLE}.`,
          });
          finishOAuthReturn();
          setModalOpen(true);
        }
      } catch (err) {
        if (isOAuthCallbackPath()) {
          const returnPath = readAuthReturnPath();
          clearPendingAdminAuth();
          clearAuthReturnPath();
          navigate(returnPath, { replace: true });
        }
        const msg = err instanceof Error ? err.message : "Sign-in failed";
        setError(msg);
        setStatus("signed-out");
        // A failed silent restore (expired session) isn't worth an alarm;
        // a failed sign-in the owner just attempted is.
        if (shouldOpenAdmin) toast.error("Couldn't complete sign-in", { description: msg });
      } finally {
        // The login round-trip is over (success or not) — stop the lock spinner.
        setSigningIn(false);
      }
    })();
  }, [navigate, toast]);

  const signIn = useCallback(async () => {
    setError(null);

    if (IS_DEV) {
      // Dev mode: just open the modal, no OAuth needed.
      setStatus("signed-in");
      setModalOpen(true);
      return;
    }

    // Keep the lock in a busy state while we resolve the handle + build the auth URL,
    // then the browser navigates away to Bluesky.
    setSigningIn(true);
    rememberAuthReturnPath();
    markPendingAdminAuth();
    try {
      const { startOwnerSignIn } = await loadRuntime();
      await startOwnerSignIn();
      // Navigation happens above; nothing runs after it on success.
    } catch (err) {
      setSigningIn(false);
      clearPendingAdminAuth();
      clearAuthReturnPath();
      const msg = err instanceof Error ? err.message : "Couldn't start sign-in";
      setError(msg);
      toast.error("Couldn't reach Bluesky", { description: msg });
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    if (!IS_DEV) {
      try {
        await sessionRef.current?.signOut();
      } catch {
        // Token revocation is best-effort; the local session is gone either way.
      }
      sessionRef.current = null;
    }
    setAgent(null);
    setStatus("signed-out");
    setModalOpen(false);
    toast.info("Signed out");
  }, [toast]);

  const [editingBlog, setEditingBlogState] = useState<BlogEntry | null>(null);

  // Selecting a blog to edit always brings up the admin modal.
  const setEditingBlog = useCallback((blog: BlogEntry | null) => {
    setEditingBlogState(blog);
    if (blog) setModalOpen(true);
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      agent,
      error,
      signingIn,
      devMode: IS_DEV,
      signIn,
      signOut,
      modalOpen,
      openModal,
      closeModal,
      editingBlog,
      setEditingBlog,
    }),
    [
      status,
      agent,
      error,
      signingIn,
      signIn,
      signOut,
      modalOpen,
      openModal,
      closeModal,
      editingBlog,
      setEditingBlog,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
