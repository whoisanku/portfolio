import {
  BrowserOAuthClient,
  atprotoLoopbackClientMetadata,
  buildAtprotoLoopbackClientId,
} from "@atproto/oauth-client-browser";
import { HANDLE_RESOLVER, OAUTH_SCOPE } from "./config";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

let clientPromise: Promise<BrowserOAuthClient> | null = null;

/**
 * atproto loopback OAuth only works on IP origins, so in dev we hop from
 * localhost to 127.0.0.1 before starting a flow. Returns the equivalent
 * 127.0.0.1 URL when running on localhost, null otherwise.
 */
export function devLoopbackUrl(): string | null {
  const { hostname, port, pathname, search } = window.location;
  if (hostname !== "localhost") return null;
  return `http://127.0.0.1${port ? `:${port}` : ""}${pathname}${search}`;
}

/**
 * Lazily build the OAuth client (once per page load).
 *
 * - In dev (loopback origin) a virtual "loopback client" is used: no hosted
 *   metadata needed. The library redirects localhost → 127.0.0.1 itself.
 * - In production the client id is the hosted metadata document at
 *   /oauth/client-metadata.json (see public/oauth/client-metadata.json —
 *   it must list the deployed origin).
 */
export function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (!clientPromise) {
    const { hostname, origin, port } = window.location;

    if (LOOPBACK_HOSTS.has(hostname)) {
      const clientId = buildAtprotoLoopbackClientId({
        scope: OAUTH_SCOPE,
        redirect_uris: [`http://127.0.0.1${port ? `:${port}` : ""}/admin`],
      });
      clientPromise = Promise.resolve(
        new BrowserOAuthClient({
          handleResolver: HANDLE_RESOLVER,
          clientMetadata: atprotoLoopbackClientMetadata(clientId),
        }),
      );
    } else {
      clientPromise = BrowserOAuthClient.load({
        clientId: `${origin}/oauth/client-metadata.json`,
        handleResolver: HANDLE_RESOLVER,
      });
    }
  }
  return clientPromise;
}
