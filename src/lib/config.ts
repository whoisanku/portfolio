/**
 * Site-wide configuration.
 *
 * OWNER_HANDLE drives everything: the posts feed, the blog repo and the
 * admin OAuth login are all bound to this single Bluesky account.
 */
export const OWNER_HANDLE = "anku.bsky.social";

/** WhiteWind blog lexicon — entries are readable/editable on whtwnd.com too. */
export const BLOG_COLLECTION = "com.whtwnd.blog.entry";

/** OAuth scope required to write posts and blog entries. */
export const OAUTH_SCOPE = "atproto transition:generic";

/** Public AppView for unauthenticated reads (feed, profiles). */
export const PUBLIC_API = "https://public.api.bsky.app";

export const HANDLE_RESOLVER = "https://bsky.social";
