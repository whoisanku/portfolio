import { OWNER_HANDLE, PUBLIC_API } from "./config";
import { fetchJson } from "./http";
import { readJson, writeJson } from "./storage";

const didCache = new Map<string, Promise<string>>();

/** Resolve a handle (e.g. anku.bsky.social) to its DID, with memoization. */
export function resolveHandle(handle: string, signal?: AbortSignal): Promise<string> {
  const key = handle.toLowerCase();
  let pending = didCache.get(key);
  if (!pending) {
    pending = fetchJson<{ did: string }>(
      `${PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
      { signal },
    ).then(({ did }) => did);
    // A failed lookup shouldn't poison the cache for the next attempt.
    pending.catch(() => didCache.delete(key));
    didCache.set(key, pending);
  }
  return pending;
}

interface DidDocument {
  service?: { id: string; type: string; serviceEndpoint: string }[];
}

const pdsCache = new Map<string, Promise<string>>();

/** Find the PDS endpoint hosting a DID's repo (via plc.directory / did:web). */
export function getPdsEndpoint(did: string, signal?: AbortSignal): Promise<string> {
  let pending = pdsCache.get(did);
  if (!pending) {
    const url = did.startsWith("did:web:")
      ? `https://${did.slice("did:web:".length)}/.well-known/did.json`
      : `https://plc.directory/${did}`;
    pending = fetchJson<DidDocument>(url, { signal }).then((doc) => {
      const pds = doc.service?.find(
        (s) => s.id.endsWith("#atproto_pds") || s.type === "AtprotoPersonalDataServer",
      )?.serviceEndpoint;
      if (!pds) throw new Error(`No PDS found for ${did}`);
      return pds;
    });
    pending.catch(() => pdsCache.delete(did));
    pdsCache.set(did, pending);
  }
  return pending;
}

/* ───────────────────────── Owner identity ─────────────────────────
   Every blog read needs the owner's DID and PDS, which costs two chained
   requests (handle → DID → DID document). Both change almost never, so the
   last answer is kept in localStorage: repeat visits start reading the repo
   straight away, and the identity is re-checked in the background once per
   page load. If the saved PDS has moved, withOwnerRepo() notices the failed
   read and retries with a fresh lookup. */

export interface Identity {
  did: string;
  pds: string;
}

const IDENTITY_KEY = `owner-identity:${OWNER_HANDLE}`;

declare global {
  interface Window {
    /** Seeded by the /blog/:rkey edge function, which already resolved it. */
    __BLOG_BOOT__?: { identity?: Identity; rkey?: string; record?: unknown };
  }
}

function isIdentity(value: unknown): value is Identity {
  const v = value as Identity | null;
  return typeof v?.did === "string" && typeof v?.pds === "string";
}

async function resolveOwnerIdentity(): Promise<Identity> {
  const did = await resolveHandle(OWNER_HANDLE);
  const pds = await getPdsEndpoint(did);
  const identity = { did, pds };
  writeJson(IDENTITY_KEY, identity);
  return identity;
}

let fresh: Promise<Identity> | null = null;

/** A just-resolved identity (network), shared by all callers this page load. */
function freshOwnerIdentity(): Promise<Identity> {
  if (!fresh) {
    fresh = resolveOwnerIdentity();
    fresh.catch(() => {
      fresh = null;
    });
  }
  return fresh;
}

/** Best known identity: saved or edge-seeded if we have one, else resolved now. */
export function getOwnerIdentity(): Promise<Identity> {
  const seeded = window.__BLOG_BOOT__?.identity;
  const saved = readJson<Identity>(IDENTITY_KEY);
  const known = isIdentity(seeded) ? seeded : isIdentity(saved) ? saved : null;
  if (!known) return freshOwnerIdentity();
  // Revalidate quietly; the saved copy serves this read.
  void freshOwnerIdentity().catch(() => {});
  return Promise.resolve(known);
}

/**
 * Run a read against the owner's repo. If it fails while using a saved
 * identity, the identity may be stale (PDS migration), so resolve afresh and
 * try once more before giving up.
 */
export async function withOwnerRepo<T>(read: (identity: Identity) => Promise<T>): Promise<T> {
  const identity = await getOwnerIdentity();
  try {
    return await read(identity);
  } catch (err) {
    const current = await freshOwnerIdentity().catch(() => null);
    if (!current || (current.did === identity.did && current.pds === identity.pds)) throw err;
    return read(current);
  }
}

export interface ListRecordsResponse<T> {
  cursor?: string;
  records: { uri: string; cid: string; value: T }[];
}

/** Public, unauthenticated repo read straight from the owner's PDS. */
export function listRecords<T>(
  { did, pds }: Identity,
  collection: string,
  { limit = 100, cursor, signal }: { limit?: number; cursor?: string; signal?: AbortSignal } = {},
): Promise<ListRecordsResponse<T>> {
  const params = new URLSearchParams({ repo: did, collection, limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return fetchJson(`${pds}/xrpc/com.atproto.repo.listRecords?${params}`, { signal });
}

export function getRecord<T>(
  { did, pds }: Identity,
  collection: string,
  rkey: string,
  signal?: AbortSignal,
): Promise<{ uri: string; cid: string; value: T }> {
  const params = new URLSearchParams({ repo: did, collection, rkey });
  return fetchJson(`${pds}/xrpc/com.atproto.repo.getRecord?${params}`, { signal });
}

/** at://did/collection/rkey → rkey */
export function rkeyFromUri(uri: string): string {
  return uri.split("/").pop() ?? "";
}

/** Build a bsky.app permalink for a feed post at-uri. */
export function bskyPostUrl(handle: string, uri: string): string {
  return `https://bsky.app/profile/${handle}/post/${rkeyFromUri(uri)}`;
}

/** Bluesky's CDN serves a small (128px) variant of every avatar. */
export function avatarThumbnail(url: string): string {
  return url.replace("/img/avatar/", "/img/avatar_thumbnail/");
}
