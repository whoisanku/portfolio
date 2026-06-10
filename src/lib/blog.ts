import type { Agent } from "@atproto/api";
import { getRecord, listRecords, resolveHandle, rkeyFromUri } from "./atproto";
import { BLOG_COLLECTION, OWNER_HANDLE } from "./config";
import type { WhiteWindBlobMetadata } from "./mediaUpload";

/** WhiteWind blog entry record (com.whtwnd.blog.entry). */
export interface BlogEntryRecord {
  $type: string;
  content: string;
  title?: string;
  createdAt?: string;
  visibility?: "public" | "url" | "author";
  isDraft?: boolean;
  theme?: string;
  blobs?: WhiteWindBlobMetadata[];
  ogp?: {
    url: string;
    width?: number;
    height?: number;
  };
}

export interface BlogEntry {
  rkey: string;
  uri: string;
  title: string;
  content: string;
  createdAt?: string;
  isDraft?: boolean;
  visibility?: "public" | "url" | "author";
  ogp?: {
    url: string;
    width?: number;
    height?: number;
  };
}

function isPublic(record: BlogEntryRecord): boolean {
  return !record.isDraft && (record.visibility ?? "public") === "public";
}

function toEntry(uri: string, value: BlogEntryRecord): BlogEntry {
  return {
    rkey: rkeyFromUri(uri),
    uri,
    title: value.title?.trim() || "Untitled",
    content: value.content ?? "",
    createdAt: value.createdAt,
    isDraft: value.isDraft,
    visibility: value.visibility,
    ogp: value.ogp,
  };
}

export async function listBlogEntries(showAll = false): Promise<BlogEntry[]> {
  const did = await resolveHandle(OWNER_HANDLE);
  const { records } = await listRecords<BlogEntryRecord>(did, BLOG_COLLECTION);
  return records
    .filter((r) => showAll || isPublic(r.value))
    .map((r) => toEntry(r.uri, r.value))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getBlogEntry(rkey: string, showAll = false): Promise<BlogEntry> {
  const did = await resolveHandle(OWNER_HANDLE);
  const record = await getRecord<BlogEntryRecord>(did, BLOG_COLLECTION, rkey);
  if (!showAll && !isPublic(record.value)) throw new Error("Post not found");
  return toEntry(record.uri, record.value);
}

/** Markdown blurb → plain-ish text excerpt for list views. */
export function excerpt(markdown: string, length = 180): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → label
    .replace(/[#>*`_~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/** Create a WhiteWind blog entry in the signed-in user's repo. */
export async function createBlogEntry(
  agent: Agent,
  input: {
    title: string;
    content: string;
    visibility?: "public" | "url" | "author";
    isDraft?: boolean;
    theme?: string;
    blobs?: WhiteWindBlobMetadata[];
    ogp?: {
      url: string;
      width?: number;
      height?: number;
    };
  },
): Promise<{ rkey: string }> {
  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: BLOG_COLLECTION,
    validate: false,
    record: {
      $type: BLOG_COLLECTION,
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
      visibility: input.visibility ?? "public",
      ...(input.isDraft ? { isDraft: true } : {}),
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.blobs?.length ? { blobs: input.blobs } : {}),
      ...(input.ogp ? { ogp: input.ogp } : {}),
    } satisfies BlogEntryRecord,
  });
  return { rkey: rkeyFromUri(res.data.uri) };
}
export function whtwndUrl(handle: string, rkey: string): string {
  return `https://whtwnd.com/${handle}/${rkey}`;
}

/** Delete a WhiteWind blog entry in the signed-in user's repo. */
export async function deleteBlogEntry(
  agent: Agent | null,
  rkey: string,
  devMode: boolean,
): Promise<void> {
  if (!agent) {
    if (devMode) {
      // Simulate delete locally/delay in dev mode
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }
    throw new Error("Authentication required to delete a blog post.");
  }

  await agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: BLOG_COLLECTION,
    rkey,
  });
}

/** Update a WhiteWind blog entry in the signed-in user's repo. */
export async function updateBlogEntry(
  agent: Agent | null,
  rkey: string,
  input: {
    title: string;
    content: string;
    visibility?: "public" | "url" | "author";
    isDraft?: boolean;
    theme?: string;
    createdAt?: string;
    blobs?: WhiteWindBlobMetadata[];
    ogp?: {
      url: string;
      width?: number;
      height?: number;
    };
  },
  devMode: boolean,
): Promise<void> {
  if (!agent) {
    if (devMode) {
      // Simulate update locally/delay in dev mode
      await new Promise((resolve) => setTimeout(resolve, 800));
      return;
    }
    throw new Error("Authentication required to update a blog post.");
  }

  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: BLOG_COLLECTION,
    rkey,
    record: {
      $type: BLOG_COLLECTION,
      title: input.title,
      content: input.content,
      createdAt: input.createdAt || new Date().toISOString(),
      visibility: input.visibility ?? "public",
      ...(input.isDraft ? { isDraft: true } : {}),
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.blobs?.length ? { blobs: input.blobs } : {}),
      ...(input.ogp ? { ogp: input.ogp } : {}),
    } satisfies BlogEntryRecord,
  });
}
