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

export type AuthStatus = "loading" | "signed-out" | "signed-in";

const IS_DEV = window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "[::1]";

interface AuthContextValue {
  status: AuthStatus;
  /** Authenticated agent — only set when the owner is signed in (null in dev mode). */
  agent: Agent | null;
  error: string | null;
  /** True when running on localhost — OAuth is bypassed, agent is null. */
  devMode: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Whether the admin modal is open. */
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    IS_DEV ? "signed-in" : "loading",
  );
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const sessionRef = useRef<OAuthSession | null>(null);
  const initialized = useRef(false);

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
          setError(`Only @${OWNER_HANDLE} can sign in here.`);
          setStatus("signed-out");
          return;
        }

        sessionRef.current = result.session;
        setAgent(new Agent(result.session));
        setStatus("signed-in");

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
        setError(err instanceof Error ? err.message : "Sign-in failed");
        setStatus("signed-out");
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);

    if (IS_DEV) {
      // Dev mode: just open the modal, no OAuth needed.
      setStatus("signed-in");
      setModalOpen(true);
      return;
    }

    sessionStorage.setItem("open-admin-modal", "1");
    const client = await getOAuthClient();
    await client.signIn(OWNER_HANDLE, { state: "admin" });
  }, []);

  const signOut = useCallback(async () => {
    if (!IS_DEV) {
      await sessionRef.current?.signOut();
      sessionRef.current = null;
    }
    setAgent(null);
    setStatus(IS_DEV ? "signed-out" : "signed-out");
    setModalOpen(false);
  }, []);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        status,
        agent,
        error,
        devMode: IS_DEV,
        signIn,
        signOut,
        modalOpen,
        openModal,
        closeModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
