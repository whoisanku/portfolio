/**
 * Responsive images through Vercel's Image Optimization API.
 *
 * Grove serves every upload at the size it was uploaded (up to 2048px), so a
 * phone showing a 390px-wide cover would download the whole file. On Vercel,
 * /_vercel/image resizes and re-encodes (AVIF/WebP) on demand and caches the
 * result at the edge; the browser picks the smallest variant that fills the
 * slot from `srcset` + `sizes`.
 *
 * WIDTHS and HOSTS must match "images" in vercel.json: the endpoint rejects
 * any other width or source host. Anything it can't serve (legacy PDS blob
 * URLs, other hosts, local dev where /_vercel/image doesn't exist) falls back
 * to the original URL.
 */
const WIDTHS = [256, 384, 640, 828, 1280, 1920];
const HOSTS = new Set(["api.grove.storage"]);
const QUALITY = 75;

/** The endpoint only exists on Vercel; every other build serves from localhost. */
const ENABLED =
  import.meta.env.PROD &&
  !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

/** `sizes` for an image spanning the 660px layout column (604px of content). */
export const COLUMN_SIZES = "(max-width: 660px) calc(100vw - 56px), 604px";

function optimizable(url: string): boolean {
  if (!ENABLED) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && HOSTS.has(hostname);
  } catch {
    return false;
  }
}

const optimizedUrl = (url: string, width: number) =>
  `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=${QUALITY}`;

/**
 * `src`, `srcSet` and `sizes` to spread onto an <img>. `sizes` is the
 * rendered width, exactly as the HTML attribute takes it.
 */
export function responsiveImage(
  url: string,
  sizes: string,
): { src: string; srcSet?: string; sizes?: string } {
  if (!optimizable(url)) return { src: url };
  return {
    src: optimizedUrl(url, 1280),
    srcSet: WIDTHS.map((w) => `${optimizedUrl(url, w)} ${w}w`).join(", "),
    sizes,
  };
}
