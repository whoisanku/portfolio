import type { Agent } from "@atproto/api";
import { getRecord, listRecords, resolveHandle, rkeyFromUri } from "./atproto";
import { BLOG_COLLECTION, OWNER_HANDLE } from "./config";

/** WhiteWind blog entry record (com.whtwnd.blog.entry). */
export interface BlogEntryRecord {
  $type: string;
  content: string;
  title?: string;
  createdAt?: string;
  visibility?: "public" | "url" | "author";
  isDraft?: boolean;
  theme?: string;
}

export interface BlogEntry {
  rkey: string;
  uri: string;
  title: string;
  content: string;
  createdAt?: string;
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
  };
}

export async function listBlogEntries(): Promise<BlogEntry[]> {
  const did = await resolveHandle(OWNER_HANDLE);
  const { records } = await listRecords<BlogEntryRecord>(did, BLOG_COLLECTION);
  return records
    .filter((r) => isPublic(r.value))
    .map((r) => toEntry(r.uri, r.value))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function getBlogEntry(rkey: string): Promise<BlogEntry> {
  const did = await resolveHandle(OWNER_HANDLE);
  const record = await getRecord<BlogEntryRecord>(did, BLOG_COLLECTION, rkey);
  if (!isPublic(record.value)) throw new Error("Post not found");
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
  },
): Promise<{ rkey: string }> {
  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.assertDid,
    collection: BLOG_COLLECTION,
    record: {
      $type: BLOG_COLLECTION,
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
      visibility: input.visibility ?? "public",
      ...(input.isDraft ? { isDraft: true } : {}),
      ...(input.theme ? { theme: input.theme } : {}),
    } satisfies BlogEntryRecord,
  });
  return { rkey: rkeyFromUri(res.data.uri) };
}

export function whtwndUrl(handle: string, rkey: string): string {
  return `https://whtwnd.com/${handle}/${rkey}`;
}
