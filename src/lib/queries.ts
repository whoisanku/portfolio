/**
 * Every remote read the site makes, as TanStack Query definitions.
 *
 * One client owns the cache, so data survives navigation (going back to the
 * blog or the feed is instant, scroll position intact), identical requests
 * are shared instead of repeated, transient failures retry with backoff, and
 * a background refresh never blanks what's already on screen.
 *
 * A few small, slow-changing results are also written to localStorage and
 * used as the starting point on the next visit (stale-while-revalidate): the
 * page paints from the saved copy and quietly updates if anything changed.
 */
import {
  QueryClient,
  infiniteQueryOptions,
  queryOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { avatarThumbnail } from "./atproto";
import { fetchBlogEntries, fetchBlogEntry, toEntry, type BlogEntry, type BlogEntryRecord } from "./blog";
import { OWNER_HANDLE, PUBLIC_API } from "./config";
import { fetchAuthorPosts } from "./feed";
import { fetchJson, isTransient } from "./http";
import { readJson, removeKey, writeJson } from "./storage";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      // Only failures that might go away on their own are worth another try.
      retry: (failures, err) => failures < 2 && isTransient(err),
      retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 6_000),
    },
  },
});

/* ───────────────────────── Persistence ───────────────────────── */

interface Saved<T> {
  data: T;
  at: number;
}

/** Saved copies older than this aren't worth painting. */
const MAX_SAVED_AGE_MS = 14 * 24 * 60 * 60_000;
/** Keep localStorage well clear of its ~5 MB quota. */
const MAX_SAVED_CHARS = 750_000;

function savedFor<T>(storageKey: string): Saved<T> | null {
  const saved = readJson<Saved<T>>(storageKey);
  if (!saved || typeof saved.at !== "number" || Date.now() - saved.at > MAX_SAVED_AGE_MS) {
    return null;
  }
  return saved;
}

/** Mirror a query's data into localStorage whenever it changes. */
function persist(queryKey: QueryKey, storageKey: string) {
  const hash = JSON.stringify(queryKey);
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.query.queryHash !== hash) return;
    const { data, dataUpdatedAt, status } = event.query.state;
    if (status !== "success" || data === undefined) return;
    const serialized = JSON.stringify({ data, at: dataUpdatedAt } satisfies Saved<unknown>);
    if (serialized.length > MAX_SAVED_CHARS) removeKey(storageKey);
    else writeJson(storageKey, { data, at: dataUpdatedAt });
  });
}

/* ───────────────────────── Blog ───────────────────────── */

const BLOG_ENTRIES_KEY = ["blog", "entries"] as const;
const BLOG_ENTRIES_STORAGE = `cache:blog-entries:${OWNER_HANDLE}`;
persist(BLOG_ENTRIES_KEY, BLOG_ENTRIES_STORAGE);

export const blogEntriesQuery = () =>
  queryOptions({
    queryKey: BLOG_ENTRIES_KEY,
    queryFn: ({ signal }) => fetchBlogEntries(signal),
    initialData: () => savedFor<BlogEntry[]>(BLOG_ENTRIES_STORAGE)?.data,
    initialDataUpdatedAt: () => savedFor<BlogEntry[]>(BLOG_ENTRIES_STORAGE)?.at,
  });

/** The record the /blog/:rkey edge function embedded in the page, if it's this one. */
function bootEntry(rkey: string): BlogEntry | undefined {
  const boot = window.__BLOG_BOOT__;
  const record = boot?.record as { uri?: string; value?: BlogEntryRecord } | undefined;
  if (boot?.rkey !== rkey || !record?.uri || !record.value) return undefined;
  return toEntry(record.uri, record.value);
}

export const blogEntryQuery = (rkey: string) =>
  queryOptions({
    queryKey: ["blog", "entry", rkey] as const,
    queryFn: ({ signal }) => fetchBlogEntry(rkey, signal),
    // Opening a post from the index: the list already holds its full record,
    // so the post renders instantly and only refreshes if the list is stale.
    initialData: () =>
      queryClient.getQueryData<BlogEntry[]>(BLOG_ENTRIES_KEY)?.find((e) => e.rkey === rkey) ??
      bootEntry(rkey),
    initialDataUpdatedAt: () =>
      queryClient.getQueryData<BlogEntry[]>(BLOG_ENTRIES_KEY)?.some((e) => e.rkey === rkey)
        ? queryClient.getQueryState(BLOG_ENTRIES_KEY)?.dataUpdatedAt
        : // The edge copy may be a CDN-cached page; always check it.
          0,
  });

/** After a publish/edit/delete, refetch everything blog-shaped. */
export const invalidateBlog = () => queryClient.invalidateQueries({ queryKey: ["blog"] });

/** Reflect a delete immediately, before the refetch confirms it. */
export function removeBlogEntry(rkey: string) {
  queryClient.setQueryData<BlogEntry[]>(BLOG_ENTRIES_KEY, (prev) =>
    prev?.filter((e) => e.rkey !== rkey),
  );
  queryClient.removeQueries({ queryKey: ["blog", "entry", rkey] });
}

/* ───────────────────────── Posts feed ───────────────────────── */

export const postsFeedQuery = () =>
  infiniteQueryOptions({
    queryKey: ["posts", "feed", OWNER_HANDLE] as const,
    queryFn: ({ pageParam, signal }) => fetchAuthorPosts(OWNER_HANDLE, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.cursor || undefined,
    staleTime: 2 * 60_000,
    // Refreshing a long feed re-requests every loaded page; don't do that
    // just because the tab regained focus.
    refetchOnWindowFocus: false,
  });

export const invalidatePosts = () => queryClient.invalidateQueries({ queryKey: ["posts"] });

/* ───────────────────────── Profiles ───────────────────────── */

const PROFILE_AVATARS_STORAGE = "cache:profile-avatars";

/** Avatar thumbnails for a set of Bluesky accounts, keyed by handle. */
export const profileAvatarsQuery = (actors: string[]) => {
  const queryKey = ["profiles", "avatars", ...actors] as const;
  const storageKey = `${PROFILE_AVATARS_STORAGE}:${actors.join(",")}`;
  return queryOptions({
    queryKey,
    queryFn: async ({ signal }) => {
      const query = actors.map((a) => `actors=${encodeURIComponent(a)}`).join("&");
      const data = await fetchJson<{ profiles?: { handle: string; avatar?: string }[] }>(
        `${PUBLIC_API}/xrpc/app.bsky.actor.getProfiles?${query}`,
        { signal },
      );
      const avatars: Record<string, string> = {};
      for (const p of data.profiles ?? []) if (p.avatar) avatars[p.handle] = avatarThumbnail(p.avatar);
      writeJson(storageKey, { data: avatars, at: Date.now() } satisfies Saved<typeof avatars>);
      return avatars;
    },
    staleTime: 24 * 60 * 60_000,
    initialData: () => savedFor<Record<string, string>>(storageKey)?.data,
    initialDataUpdatedAt: () => savedFor<Record<string, string>>(storageKey)?.at,
  });
};

/* ───────────────────────── Prefetch on intent ───────────────────────── */

/** Warm a route's data when the visitor signals they're about to open it. */
export function prefetchRouteData(path: string) {
  if (path === "/blog") void queryClient.prefetchQuery(blogEntriesQuery());
  else if (path === "/posts") void queryClient.prefetchInfiniteQuery(postsFeedQuery());
  else if (path.startsWith("/blog/")) {
    void queryClient.prefetchQuery(blogEntryQuery(path.slice("/blog/".length)));
  }
}
