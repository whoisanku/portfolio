/**
 * Visitor chat: lets anyone sign in with their own atproto account (handle +
 * a DM-enabled app password) and send a real direct message to the site owner.
 *
 * No OAuth and no backend — we resolve the visitor's PDS, open a session there
 * with `com.atproto.server.createSession`, then talk to the chat service through
 * the PDS proxy (`atproto-proxy: did:web:api.bsky.chat#bsky_chat`).
 *
 * Account *creation* can't happen here: bsky.social gates new accounts behind
 * SMS verification, so new users are sent to the hosted signup instead.
 */
import { AtpAgent, ChatBskyConvoDefs, type AtpSessionData } from "@atproto/api";
import { resolveHandle, getPdsEndpoint } from "./atproto";
import { OWNER_HANDLE } from "./config";

const CHAT_SERVICE_DID = "did:web:api.bsky.chat";
const STORAGE_KEY = "anku-chat-session";

export type ChatMessage = ChatBskyConvoDefs.MessageView;

interface StoredSession {
  service: string;
  session: AtpSessionData;
}

/** Resolve the owner's DID once (the DM recipient). */
let ownerDidPromise: Promise<string> | null = null;
export function getOwnerDid(): Promise<string> {
  if (!ownerDidPromise) ownerDidPromise = resolveHandle(OWNER_HANDLE);
  return ownerDidPromise;
}

function persist(service: string, session: AtpSessionData | undefined) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const data: StoredSession = { service, session };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** A chat agent already routed through the DM proxy. */
function chat(agent: AtpAgent) {
  return agent.withProxy("bsky_chat", CHAT_SERVICE_DID).chat.bsky.convo;
}

/**
 * Sign in with a handle (or DID) and a DM-enabled app password.
 * Returns a live agent whose session auto-persists & refreshes.
 */
export async function loginWithAppPassword(
  identifier: string,
  password: string,
): Promise<AtpAgent> {
  const id = identifier.trim().replace(/^@/, "");
  const did = id.startsWith("did:") ? id : await resolveHandle(id);
  const service = await getPdsEndpoint(did);

  const agent = new AtpAgent({
    service,
    persistSession: (_evt, session) => persist(service, session),
  });
  await agent.login({ identifier: id, password });
  return agent;
}

/** Restore a previously saved session, or null if none / expired. */
export async function resumeChatSession(): Promise<AtpAgent | null> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const { service, session } = JSON.parse(raw) as StoredSession;
    const agent = new AtpAgent({
      service,
      persistSession: (_evt, s) => persist(service, s),
    });
    await agent.resumeSession(session);
    return agent;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearChatSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get (or open) the 1:1 conversation between the visitor and the owner. */
export async function getOwnerConvoId(agent: AtpAgent): Promise<string> {
  const ownerDid = await getOwnerDid();
  const { data } = await chat(agent).getConvoForMembers({ members: [ownerDid] });
  return data.convo.id;
}

export interface MessagePage {
  /** Messages in this page, oldest-first for display. */
  messages: ChatMessage[];
  /** Cursor for the next (older) page, or undefined when the start is reached. */
  cursor?: string;
}

/**
 * Fetch a page of a conversation's messages, oldest-first for display.
 * Pass the previous page's `cursor` to load older history.
 */
export async function fetchMessages(
  agent: AtpAgent,
  convoId: string,
  cursor?: string,
): Promise<MessagePage> {
  const { data } = await chat(agent).getMessages({ convoId, limit: 40, cursor });
  return {
    messages: data.messages.filter(ChatBskyConvoDefs.isMessageView).reverse(),
    cursor: data.cursor,
  };
}

/** Send a text message into the conversation. */
export async function sendMessage(
  agent: AtpAgent,
  convoId: string,
  text: string,
): Promise<void> {
  await chat(agent).sendMessage({ convoId, message: { text } });
}

/** Turn raw XRPC errors from getConvoForMembers into something human. */
export function friendlyChatError(err: unknown): string {
  const name =
    (err as { error?: string })?.error ??
    (err instanceof Error ? err.message : String(err));
  switch (name) {
    case "MessagesDisabled":
      return "Anku has direct messages turned off right now.";
    case "NotFollowedBySender":
      return "Anku isn't accepting messages from new people at the moment.";
    case "RecipientNotFound":
      return "Couldn't reach Anku's inbox. Try again later.";
    case "AuthenticationRequired":
    case "InvalidToken":
    case "ExpiredToken":
      return "Your session expired — please sign in again.";
    default:
      if (/app password|invalid identifier|invalid password|account/i.test(name))
        return "That handle or app password didn't work. Make sure the app password allows direct messages.";
      return "Something went wrong. Please try again.";
  }
}
