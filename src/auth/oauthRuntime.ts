/**
 * The heavy half of admin auth: the atproto OAuth client and API agent.
 *
 * Loaded on demand by AuthContext, only when the owner has a stored session,
 * is returning from Bluesky, or clicks sign in; visitors never download it.
 */
import { Agent } from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client-browser";
import { resolveHandle } from "../lib/atproto";
import { OWNER_HANDLE } from "../lib/config";
import { getOAuthClient } from "../lib/oauth";

export type InitResult =
  | { kind: "none" }
  | { kind: "blocked"; message: string }
  | { kind: "signed-in"; session: OAuthSession; agent: Agent };

/** Finish an OAuth callback or restore the stored session. */
export async function initOwnerSession(): Promise<InitResult> {
  const client = await getOAuthClient();
  const result = await client.init();
  if (!result) return { kind: "none" };

  // The admin panel belongs to the site owner only.
  const ownerDid = await resolveHandle(OWNER_HANDLE);
  if (result.session.did !== ownerDid) {
    await result.session.signOut();
    return { kind: "blocked", message: `Only @${OWNER_HANDLE} can sign in here.` };
  }
  return { kind: "signed-in", session: result.session, agent: new Agent(result.session) };
}

/** Hand off to Bluesky's authorization page (navigates away on success). */
export async function startOwnerSignIn(): Promise<void> {
  const client = await getOAuthClient();
  await client.signIn(OWNER_HANDLE, { state: "admin" });
}
