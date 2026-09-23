/**
 * The site favicon, drawn from the owner's current Bluesky avatar.
 *
 * There is no static icon to keep in sync: this function reads the profile,
 * fetches the avatar's thumbnail, and wraps it in a circular SVG so the tab
 * icon matches the round avatar used across the site. Being a URL rather than
 * something swapped in by JavaScript, it's what browsers, bookmarks and
 * search engines all see.
 *
 * Like blog-og.ts this runs on the edge and is dependency-free; the handle
 * mirrors OWNER_HANDLE in src/lib/config.ts.
 */

export const config = { runtime: "edge" };

const OWNER_HANDLE = "anku.bsky.social";
const PUBLIC_API = "https://public.api.bsky.app";

/** Upstream reads are best-effort: a slow Bluesky must not stall the icon. */
const UPSTREAM_TIMEOUT_MS = 2500;

/** Shown only while Bluesky can't be reached; cached briefly so it recovers. */
const FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#2a5fd0"/></svg>';

function circleSvg(mime: string, base64: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>' +
    `<image href="data:${mime};base64,${base64}" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#c)"/>` +
    "</svg>"
  );
}

function toBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 0x8000) {
    binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

async function fetchImage(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Avatar fetch failed (${res.status})`);
  return { mime: res.headers.get("content-type") ?? "image/jpeg", bytes: await res.arrayBuffer() };
}

async function loadAvatar(signal: AbortSignal) {
  const res = await fetch(
    `${PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(OWNER_HANDLE)}`,
    { signal },
  );
  if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);
  const { avatar } = (await res.json()) as { avatar?: string };
  if (!avatar) throw new Error("Profile has no avatar");

  // The thumbnail preset is a few KB instead of the full-size original;
  // fall back to the original if the CDN doesn't serve it.
  const thumb = avatar.replace("/img/avatar/", "/img/avatar_thumbnail/");
  try {
    return await fetchImage(thumb, signal);
  } catch {
    return await fetchImage(avatar, signal);
  }
}

export default async function handler(): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const { mime, bytes } = await loadAvatar(controller.signal);
    return new Response(circleSvg(mime, toBase64(bytes)), {
      headers: {
        "content-type": "image/svg+xml",
        // A new avatar shows up within the hour; stale copies serve instantly meanwhile.
        "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response(FALLBACK_SVG, {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=60, s-maxage=60",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
