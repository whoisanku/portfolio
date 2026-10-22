/**
 * Per-post link previews for /blog/:rkey.
 *
 * The site is a client-rendered SPA, so social crawlers (Bluesky's cardyb,
 * X, Discord, Slack, LinkedIn) only ever saw the static tags in index.html —
 * every blog link previewed as the generic portfolio card. This function sits
 * in front of /blog/:rkey (see vercel.json), reads the WhiteWind record the
 * page is about to render, and rewrites the <head> with that post's title,
 * excerpt and cover before handing the same shell to the browser.
 *
 * Humans and crawlers get byte-identical HTML — no user-agent sniffing — and
 * React hydrates over it exactly as it does on every other route.
 *
 * The record it fetched is also embedded in the page (window.__BLOG_BOOT__,
 * with the resolved DID and PDS), so a visitor landing on a post sees it
 * without the browser repeating the same three lookups. The app still
 * refreshes it in the background: this HTML may be a CDN-cached copy.
 *
 * It serves /blog too (?view=list): the shell keeps its site-wide tags, and
 * the public entries are embedded the same way, so the index paints without
 * waiting on the handle → DID → PDS → listRecords chain.
 *
 * Either way the cover the page leads with is preloaded from the <head>, so
 * it downloads alongside the app's code rather than after it. A post's
 * body images are too: the page holds its text until they're in.
 *
 * Deliberately dependency-free: this runs on the edge runtime, and anything it
 * imported from src/ would have to stay edge-safe forever. The markdown and
 * visibility helpers below mirror src/lib/blog.ts, which is the source of truth.
 */

export const config = { runtime: "edge" };

const OWNER_HANDLE = "anku.bsky.social";
const BLOG_COLLECTION = "com.whtwnd.blog.entry";
const PUBLIC_API = "https://public.api.bsky.app";
const SITE_NAME = "Ankit Bhandari";
const TWITTER_CREATOR = "@whoisanku";
const DEFAULT_IMAGE =
  "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/v1781422920/portfolio/og-image";

/** Upstream reads are best-effort: a slow PDS must not stall the page. */
const UPSTREAM_TIMEOUT_MS = 2500;

/** listRecords page size; a shorter page is the last. Mirrors src/lib/blog.ts. */
const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

/**
 * Mirrors src/lib/image.ts: the widths and source hosts vercel.json lets
 * /_vercel/image serve, and the `sizes` of an image spanning the column.
 */
const IMAGE_WIDTHS = [256, 384, 640, 828, 1280, 1920];
const IMAGE_HOSTS = new Set(["api.grove.storage", "cdn.bsky.app"]);
const IMAGE_QUALITY = 75;
const COLUMN_SIZES = "(max-width: 660px) calc(100vw - 56px), 604px";
/** Enough for any post here; keeps a picture-heavy one from bloating the <head>. */
const MAX_BODY_PRELOADS = 12;

interface BlogEntryRecord {
  content?: string;
  title?: string;
  createdAt?: string;
  visibility?: "public" | "url" | "author";
  isDraft?: boolean;
  ogp?: { url?: string; width?: number; height?: number };
}

interface Identity {
  did: string;
  pds: string;
}

interface Meta {
  title: string;
  description: string;
  image: string;
  imageWidth?: number;
  imageHeight?: number;
  url: string;
  publishedAt?: string;
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
  return (await res.json()) as T;
}

async function resolveDid(signal: AbortSignal): Promise<string> {
  const { did } = await getJson<{ did: string }>(
    `${PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(OWNER_HANDLE)}`,
    signal,
  );
  return did;
}

async function getPdsEndpoint(did: string, signal: AbortSignal): Promise<string> {
  const url = did.startsWith("did:web:")
    ? `https://${did.slice("did:web:".length)}/.well-known/did.json`
    : `https://plc.directory/${did}`;
  const doc = await getJson<{
    service?: { id: string; type: string; serviceEndpoint: string }[];
  }>(url, signal);
  const pds = doc.service?.find(
    (s) => s.id.endsWith("#atproto_pds") || s.type === "AtprotoPersonalDataServer",
  )?.serviceEndpoint;
  if (!pds) throw new Error(`No PDS found for ${did}`);
  return pds;
}

/** Isolates are reused between requests; the owner's identity barely changes. */
const IDENTITY_TTL_MS = 10 * 60_000;
let identityCache: { value: Identity; at: number } | null = null;

async function ownerIdentity(signal: AbortSignal): Promise<Identity> {
  if (identityCache && Date.now() - identityCache.at < IDENTITY_TTL_MS) {
    return identityCache.value;
  }
  const did = await resolveDid(signal);
  const pds = await getPdsEndpoint(did, signal);
  identityCache = { value: { did, pds }, at: Date.now() };
  return identityCache.value;
}

async function fetchEntry(
  rkey: string,
  signal: AbortSignal,
): Promise<{ identity: Identity; uri: string; value: BlogEntryRecord } | null> {
  const identity = await ownerIdentity(signal);
  const params = new URLSearchParams({
    repo: identity.did,
    collection: BLOG_COLLECTION,
    rkey,
  });
  const record = await getJson<{ uri?: string; value?: BlogEntryRecord }>(
    `${identity.pds}/xrpc/com.atproto.repo.getRecord?${params}`,
    signal,
  );
  if (!record.uri || !record.value) return null;
  return { identity, uri: record.uri, value: record.value };
}

interface RepoRecord {
  uri: string;
  value: BlogEntryRecord;
}

/** Every public entry, paged the way fetchBlogEntries() in src/lib/blog.ts does. */
async function fetchPublicEntries(
  signal: AbortSignal,
): Promise<{ identity: Identity; records: RepoRecord[] }> {
  const identity = await ownerIdentity(signal);
  const records: RepoRecord[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      repo: identity.did,
      collection: BLOG_COLLECTION,
      limit: String(PAGE_LIMIT),
    });
    if (cursor) params.set("cursor", cursor);
    const res = await getJson<{ cursor?: string; records?: RepoRecord[] }>(
      `${identity.pds}/xrpc/com.atproto.repo.listRecords?${params}`,
      signal,
    );
    const batch = res.records ?? [];
    records.push(...batch);
    cursor = res.cursor;
    if (!cursor || batch.length < PAGE_LIMIT) break;
  }
  return { identity, records: records.filter((r) => isPublic(r.value)) };
}

/** Mirrors isPublic() in src/lib/blog.ts: listed in the index. */
function isPublic(record: BlogEntryRecord): boolean {
  return !record.isDraft && (record.visibility ?? "public") === "public";
}

/**
 * Mirrors isViewableByLink() in src/lib/blog.ts: public and unlisted posts
 * open from a shared link; drafts and private posts must not leak into
 * previews (or the embedded record).
 */
function isViewableByLink(record: BlogEntryRecord): boolean {
  return !record.isDraft && (record.visibility ?? "public") !== "author";
}

/** Mirrors markdownToPlainText() in src/lib/blog.ts. */
function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~#>`-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(markdown: string, length = 180): string {
  const text = markdownToPlainText(markdown);
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/** The post's own cover, else its first inline image, like the blog index shows. */
function recordCover(record: BlogEntryRecord): string | undefined {
  if (record.ogp?.url) return record.ogp.url;
  return (record.content ?? "").match(/!\[.*?\]\((.*?)\)/)?.[1];
}

/** Cover image for link previews, falling back to the site's. */
function coverUrl(record: BlogEntryRecord): string {
  return recordCover(record) ?? DEFAULT_IMAGE;
}

/** Mirrors imageUrls() in src/lib/blog.ts: the post's inline images, in order. */
function imageUrls(markdown: string): string[] {
  return Array.from(markdown.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g), (m) => m[1]);
}

/**
 * A <link> that starts an image downloading with the HTML. Its srcset and
 * sizes are exactly what the page asks for (responsiveImage() and
 * prepareImage() in src/lib/image.ts), so the browser reuses this download.
 * No href: a browser that can't read imagesrcset then skips the preload
 * instead of fetching a size the page might not pick. Only the image the
 * page leads with outranks the app's own code.
 */
function imagePreload(url: string, { lead = false } = {}): string {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    hostname = parsed.hostname;
  } catch {
    return "";
  }
  const priority = lead ? ` fetchpriority="high"` : "";
  if (!IMAGE_HOSTS.has(hostname)) {
    return `<link rel="preload" as="image" href="${escapeAttr(url)}"${priority} />`;
  }
  const srcset = IMAGE_WIDTHS.map(
    (w) => `/_vercel/image?url=${encodeURIComponent(url)}&w=${w}&q=${IMAGE_QUALITY} ${w}w`,
  ).join(", ");
  return `<link rel="preload" as="image" imagesrcset="${escapeAttr(srcset)}" imagesizes="${COLUMN_SIZES}"${priority} />`;
}

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildTags(meta: Meta): string {
  const usingRecordCover = meta.imageWidth != null && meta.imageHeight != null;
  return [
    `<title>${escapeAttr(meta.title)} · ${SITE_NAME}</title>`,
    `<link rel="canonical" href="${escapeAttr(meta.url)}" />`,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(meta.url)}" />`,
    `<meta property="og:image" content="${escapeAttr(meta.image)}" />`,
    `<meta property="og:image:secure_url" content="${escapeAttr(meta.image)}" />`,
    // og:image:type is deliberately omitted: covers are re-encoded on upload
    // (webp or jpeg depending on what compressed smaller), so any hardcoded
    // type would be a lie half the time. Crawlers sniff the real one.
    ...(usingRecordCover
      ? [
          `<meta property="og:image:width" content="${meta.imageWidth}" />`,
          `<meta property="og:image:height" content="${meta.imageHeight}" />`,
        ]
      : []),
    `<meta property="og:image:alt" content="${escapeAttr(meta.title)}" />`,
    ...(meta.publishedAt
      ? [`<meta property="article:published_time" content="${escapeAttr(meta.publishedAt)}" />`]
      : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(meta.image)}" />`,
    `<meta name="twitter:image:alt" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:creator" content="${TWITTER_CREATOR}" />`,
  ].join("\n    ");
}

/**
 * JSON that's safe inside an inline <script>: nothing in it can close the
 * tag or start an HTML comment, and the JS line separators are escaped.
 */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

/** Hand the fetched records to the app (read by src/lib/queries.ts). */
function bootScript(
  boot: { identity: Identity } & ({ rkey: string; record: RepoRecord } | { entries: RepoRecord[] }),
): string {
  return `<script>window.__BLOG_BOOT__=${scriptJson(boot)};</script>`;
}

/** Append to the shell's <head>, leaving its own tags as they are. */
function injectHead(html: string, extraHead: string): string {
  // A replacer function, so `$&`-style patterns in post text stay literal.
  return html.includes("</head>") ? html.replace("</head>", () => `  ${extraHead}\n</head>`) : html;
}

/**
 * Swap the shell's site-wide tags for this post's. Anything not listed here
 * (charset, viewport, fonts, the theme script) is left untouched.
 */
export function injectMeta(html: string, meta: Meta, extraHead = ""): string {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[\s\S]*?>/i, "")
    .replace(/<meta\s+property="og:[\s\S]*?>/gi, "")
    .replace(/<meta\s+name="twitter:[\s\S]*?>/gi, "");
  return injectHead(stripped, `${buildTags(meta)}\n  ${extraHead}`);
}

const newestFirst = (a: RepoRecord, b: RepoRecord) =>
  (b.value.createdAt ?? "").localeCompare(a.value.createdAt ?? "");

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const listView = url.searchParams.get("view") === "list";
  const rkey = url.searchParams.get("rkey")?.trim() ?? "";

  const shellRes = await fetch(new URL("/index.html", url.origin));
  const shell = await shellRes.text();

  const page = (html: string) =>
    new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
      },
    });
  // The shell is always a valid response; tags and data are the enhancement.
  const fallback = () => page(shell);

  if (!listView && !rkey) return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    if (listView) {
      const { identity, records } = await fetchPublicEntries(controller.signal);
      // The index leads with the newest post's cover.
      const featured = records.toSorted(newestFirst)[0];
      const cover = featured && recordCover(featured.value);
      return page(
        injectHead(
          shell,
          [cover && imagePreload(cover, { lead: true }), bootScript({ identity, entries: records })]
            .filter(Boolean)
            .join("\n  "),
        ),
      );
    }

    const entry = await fetchEntry(rkey, controller.signal);
    if (!entry || !isViewableByLink(entry.value)) return fallback();

    const record = entry.value;
    const content = record.content ?? "";
    const html = injectMeta(
      shell,
      {
        title: record.title?.trim() || "Untitled",
        description:
          excerpt(content) || "Ankit Bhandari - loves designing and software development.",
        image: coverUrl(record),
        imageWidth: record.ogp?.url ? record.ogp.width : undefined,
        imageHeight: record.ogp?.url ? record.ogp.height : undefined,
        url: `${url.origin}/blog/${rkey}`,
        publishedAt: record.createdAt,
      },
      // The post page shows only a real cover up top, never an inline image.
      // It holds its text until its images are in, so fetch them all now.
      [
        record.ogp?.url && imagePreload(record.ogp.url, { lead: true }),
        ...imageUrls(content)
          .filter((src) => src !== record.ogp?.url)
          .slice(0, MAX_BODY_PRELOADS)
          .map((src) => imagePreload(src)),
        bootScript({ identity: entry.identity, rkey, record: { uri: entry.uri, value: record } }),
      ]
        .filter(Boolean)
        .join("\n  "),
    );

    return page(html);
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}
