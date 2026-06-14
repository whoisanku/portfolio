/* eslint-disable react-refresh/only-export-components */
import { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { resolveHandle } from "../lib/atproto";
import { OWNER_HANDLE } from "../lib/config";
import { getOAuthClient } from "../lib/oauth";
import type { BlogEntry } from "../lib/blog";
import RedirectOverlay from "../components/RedirectOverlay";
import { useToast } from "../components/Toast";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

const IS_DEV = window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]";

interface AuthContextValue {
  status: AuthStatus;
  /** Authenticated agent — only set when the owner is signed in (null in dev mode). */
  agent: Agent | null;
  error: string | null;
  /** True while handing off to Bluesky's OAuth page (pre-redirect gap). */
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
  const [status, setStatus] = useState<AuthStatus>(() =>
    IS_DEV ? "signed-in" : "loading",
  );
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const sessionRef = useRef<OAuthSession | null>(null);
  const initialized = useRef(false);
  const toast = useToast();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Dev mode: auto-signed-in with no agent — no OAuth needed.
    if (IS_DEV) return;

    // Production: run the OAuth init flow.
    (async () => {
      try {
        const client = await getOAuthClient();
        const result = await client.init();
        if (!result) {
          setStatus("signed-out");
          return;
        }

        // The admin panel belongs to the site owner only.
        const ownerDid = await resolveHandle(OWNER_HANDLE);
        if (result.session.did !== ownerDid) {
          await result.session.signOut();
          const msg = `Only @${OWNER_HANDLE} can sign in here.`;
          setError(msg);
          setStatus("signed-out");
          toast.error("Sign-in blocked", { description: msg });
          return;
        }

        sessionRef.current = result.session;
        setAgent(new Agent(result.session));
        setStatus("signed-in");
        toast.success("Signed in", {
          description: `Welcome back, @${OWNER_HANDLE}.`,
        });

        // Auto-open modal after OAuth callback
        if (
          sessionStorage.getItem("open-admin-modal") === "1" ||
          window.location.pathname === "/oauth/callback"
        ) {
          sessionStorage.removeItem("open-admin-modal");
          setModalOpen(true);
          if (window.location.pathname === "/oauth/callback") {
            window.history.replaceState(null, "", "/");
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign-in failed";
        setError(msg);
        setStatus("signed-out");
        toast.error("Couldn't complete sign-in", { description: msg });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async () => {
    setError(null);

    if (IS_DEV) {
      // Dev mode: just open the modal, no OAuth needed.
      setStatus("signed-in");
      setModalOpen(true);
      return;
    }

    // Show the redirect veil while we resolve the handle + build the auth URL,
    // then the browser navigates away to Bluesky. The veil stays up until then.
    setSigningIn(true);
    try {
      sessionStorage.setItem("open-admin-modal", "1");
      const client = await getOAuthClient();
      await client.signIn(OWNER_HANDLE, { state: "admin" });
      // Navigation happens above; nothing runs after it on success.
    } catch (err) {
      setSigningIn(false);
      sessionStorage.removeItem("open-admin-modal");
      const msg = err instanceof Error ? err.message : "Couldn't start sign-in";
      setError(msg);
      toast.error("Couldn't reach Bluesky", { description: msg });
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    if (!IS_DEV) {
      await sessionRef.current?.signOut();
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

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
      <RedirectOverlay show={signingIn} />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
