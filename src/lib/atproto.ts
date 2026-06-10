import { PUBLIC_API } from "./config";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

const didCache = new Map<string, string>();

/** Resolve a handle (e.g. anku.bsky.social) to its DID, with memoization. */
export async function resolveHandle(handle: string): Promise<string> {
  const cached = didCache.get(handle);
  if (cached) return cached;
  const { did } = await getJson<{ did: string }>(
    `${PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`,
  );
  didCache.set(handle, did);
  return did;
}

interface DidDocument {
  service?: { id: string; type: string; serviceEndpoint: string }[];
}

const pdsCache = new Map<string, string>();

/** Find the PDS endpoint hosting a DID's repo (via plc.directory / did:web). */
export async function getPdsEndpoint(did: string): Promise<string> {
  const cached = pdsCache.get(did);
  if (cached) return cached;

  const url = did.startsWith("did:web:")
    ? `https://${did.slice("did:web:".length)}/.well-known/did.json`
    : `https://plc.directory/${did}`;
  const doc = await getJson<DidDocument>(url);
  const pds = doc.service?.find(
    (s) => s.id.endsWith("#atproto_pds") || s.type === "AtprotoPersonalDataServer",
  )?.serviceEndpoint;
  if (!pds) throw new Error(`No PDS found for ${did}`);
  pdsCache.set(did, pds);
  return pds;
}

export interface ListRecordsResponse<T> {
  cursor?: string;
  records: { uri: string; cid: string; value: T }[];
}

/** Public, unauthenticated repo read straight from the owner's PDS. */
export async function listRecords<T>(
  did: string,
  collection: string,
  limit = 100,
): Promise<ListRecordsResponse<T>> {
  const pds = await getPdsEndpoint(did);
  return getJson<ListRecordsResponse<T>>(
    `${pds}/xrpc/com.atproto.repo.listRecords?repo=${did}&collection=${collection}&limit=${limit}`,
  );
}

export async function getRecord<T>(
  did: string,
  collection: string,
  rkey: string,
): Promise<{ uri: string; cid: string; value: T }> {
  const pds = await getPdsEndpoint(did);
  return getJson(
    `${pds}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${collection}&rkey=${rkey}`,
  );
}

/** at://did/collection/rkey → rkey */
export function rkeyFromUri(uri: string): string {
  return uri.split("/").pop() ?? "";
}

/** Build a bsky.app permalink for a feed post at-uri. */
export function bskyPostUrl(handle: string, uri: string): string {
  return `https://bsky.app/profile/${handle}/post/${rkeyFromUri(uri)}`;
}
