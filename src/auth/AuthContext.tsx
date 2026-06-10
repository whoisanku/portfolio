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
import { devLoopbackUrl, getOAuthClient } from "../lib/oauth";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

interface AuthContextValue {
  status: AuthStatus;
  /** Authenticated agent — only set when the owner is signed in. */
  agent: Agent | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // On localhost the OAuth client would force-redirect to 127.0.0.1 on
  // construction, so skip session init there — the hop to 127.0.0.1 happens
  // when the user actually clicks sign-in.
  const [status, setStatus] = useState<AuthStatus>(() =>
    devLoopbackUrl() ? "signed-out" : "loading",
  );
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<OAuthSession | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // client.init() must run exactly once per page load.
    if (initialized.current) return;
    initialized.current = true;

    if (devLoopbackUrl()) return;

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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
        setStatus("signed-out");
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    const loopback = devLoopbackUrl();
    if (loopback) {
      window.location.replace(loopback);
      return;
    }
    const client = await getOAuthClient();
    // Redirects away; the promise only settles if the user aborts.
    await client.signIn(OWNER_HANDLE, { state: "admin" });
  }, []);

  const signOut = useCallback(async () => {
    await sessionRef.current?.signOut();
    sessionRef.current = null;
    setAgent(null);
    setStatus("signed-out");
  }, []);

  return (
    <AuthContext.Provider value={{ status, agent, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
