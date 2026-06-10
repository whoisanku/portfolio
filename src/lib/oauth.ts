import { BrowserOAuthClient } from "@atproto/oauth-client-browser";
import { HANDLE_RESOLVER } from "./config";

let clientPromise: Promise<BrowserOAuthClient> | null = null;

export function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (!clientPromise) {
    const { origin } = window.location;

    clientPromise = BrowserOAuthClient.load({
      clientId: `${origin}/oauth/client-metadata.json`,
      handleResolver: HANDLE_RESOLVER,
    });
  }
  return clientPromise;
}
