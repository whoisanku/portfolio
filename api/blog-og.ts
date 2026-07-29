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

interface BlogEntryRecord {
  content?: string;
  title?: string;
  createdAt?: string;
  visibility?: "public" | "url" | "author";
  isDraft?: boolean;
  ogp?: { url?: string; width?: number; height?: number };
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

async function fetchEntry(
  rkey: string,
  signal: AbortSignal,
): Promise<BlogEntryRecord | null> {
  const did = await resolveDid(signal);
  const pds = await getPdsEndpoint(did, signal);
  const record = await getJson<{ value: BlogEntryRecord }>(
    `${pds}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${BLOG_COLLECTION}&rkey=${encodeURIComponent(rkey)}`,
    signal,
  );
  return record.value ?? null;
}

/** Mirrors isPublic() in src/lib/blog.ts — drafts must not leak into previews. */
function isPublic(record: BlogEntryRecord): boolean {
  return !record.isDraft && (record.visibility ?? "public") === "public";
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

/** Cover image, falling back to the first inline image like the blog index does. */
function coverUrl(record: BlogEntryRecord): string {
  if (record.ogp?.url) return record.ogp.url;
  const inline = (record.content ?? "").match(/!\[.*?\]\((.*?)\)/);
  return inline?.[1] ?? DEFAULT_IMAGE;
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
 * Swap the shell's site-wide tags for this post's. Anything not listed here
 * (charset, viewport, fonts, the theme script) is left untouched.
 */
export function injectMeta(html: string, meta: Meta): string {
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[\s\S]*?>/i, "")
    .replace(/<meta\s+property="og:[\s\S]*?>/gi, "")
    .replace(/<meta\s+name="twitter:[\s\S]*?>/gi, "");

  return stripped.includes("</head>")
    ? stripped.replace("</head>", `  ${buildTags(meta)}\n</head>`)
    : stripped;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rkey = url.searchParams.get("rkey")?.trim() ?? "";

  const shellRes = await fetch(new URL("/index.html", url.origin));
  const shell = await shellRes.text();

  // The shell is always a valid response; per-post tags are the enhancement.
  const fallback = () =>
    new Response(shell, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
      },
    });

  if (!rkey) return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const record = await fetchEntry(rkey, controller.signal);
    if (!record || !isPublic(record)) return fallback();

    const content = record.content ?? "";
    const html = injectMeta(shell, {
      title: record.title?.trim() || "Untitled",
      description:
        excerpt(content) || "Ankit Bhandari - loves designing and software development.",
      image: coverUrl(record),
      imageWidth: record.ogp?.url ? record.ogp.width : undefined,
      imageHeight: record.ogp?.url ? record.ogp.height : undefined,
      url: `${url.origin}/blog/${rkey}`,
      publishedAt: record.createdAt,
    });

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
      },
    });
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}
