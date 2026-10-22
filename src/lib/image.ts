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
const HOSTS = new Set(["api.grove.storage", "cdn.bsky.app"]);
const QUALITY = 75;

/**
 * The endpoint only exists on Vercel; every other build serves from
 * localhost. The inline profile script in index.html mirrors this check.
 */
export const OPTIMIZER_ENABLED =
  import.meta.env.PROD &&
  !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

/** `sizes` for an image spanning the 660px layout column (604px of content). */
export const COLUMN_SIZES = "(max-width: 660px) calc(100vw - 56px), 604px";

function optimizable(url: string): boolean {
  if (!OPTIMIZER_ENABLED) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/** One optimized variant. `width` must be one of WIDTHS. */
export const optimizedUrl = (url: string, width: number) =>
  `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=${QUALITY}`;

/** A single fixed-width variant, or the original where the optimizer can't help. */
export function optimizedSrc(url: string, width: (typeof WIDTHS)[number]): string {
  return optimizable(url) ? optimizedUrl(url, width) : url;
}

/**
 * Have the optimizer make every variant of a just-published image now, so
 * its first readers don't each wait on a cold transform (seconds, for the
 * big widths). AVIF only: what nearly every browser asks for. If the
 * optimizer's cache is per region, this warms the one serving the publisher.
 */
export function warmOptimizedImage(url: string) {
  if (!optimizable(url)) return;
  for (const width of WIDTHS) {
    void fetch(optimizedUrl(url, width), {
      headers: { Accept: "image/avif,image/webp,*/*" },
      priority: "low",
    }).catch(() => {});
  }
}

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

/** An image as it will paint: the file this device loaded, at its real pixel size. */
export interface PreparedImage {
  src: string;
  width: number;
  height: number;
}

const preparing = new Map<string, Promise<PreparedImage | null>>();
const prepared = new Map<string, PreparedImage | null>();

/**
 * Download and decode an image before it's shown, picking the same variant
 * an <img> with responsiveImage(url, sizes) would (so a <link rel=preload>
 * of that srcset is reused), and learn what actually arrived. That matters
 * because the optimizer never upscales: a 500px screenshot asked for at
 * 1280w arrives 500px wide, and drawn from the srcset the browser would
 * shrink it to 500/1280 of the slot. Null if it can't be loaded.
 */
export function prepareImage(url: string, sizes: string): Promise<PreparedImage | null> {
  const key = `${sizes} ${url}`;
  let job = preparing.get(key);
  if (!job) {
    job = load(url, sizes).then((image) => {
      prepared.set(key, image);
      return image;
    });
    preparing.set(key, job);
  }
  return job;
}

/** What prepareImage() came back with, once it has. */
export const preparedImage = (url: string, sizes: string): PreparedImage | null | undefined =>
  prepared.get(`${sizes} ${url}`);

async function load(url: string, sizes: string): Promise<PreparedImage | null> {
  const { src, srcSet } = responsiveImage(url, sizes);
  const picked = new Image();
  picked.sizes = sizes;
  if (srcSet) picked.srcset = srcSet;
  picked.src = src;
  // Then the chosen file again, from cache, without the srcset: its natural
  // size is the file's own rather than one scaled by a width descriptor.
  const plain = new Image();
  try {
    await picked.decode();
    plain.src = picked.currentSrc || src;
    await plain.decode();
  } catch {
    return null;
  }
  return { src: plain.src, width: plain.naturalWidth, height: plain.naturalHeight };
}

/* ───────────────────────── Cloudinary ─────────────────────────
   Project screenshots and press logos live on Cloudinary, which resizes via
   a transformation segment in the URL path. */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

/**
 * Add a transformation to a Cloudinary delivery URL (merged into the first
 * transformation segment when there is one). Other URLs pass through as-is.
 */
export function cloudinary(url: string, transformation: string): string {
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  const [, base, rest] = match;
  const [first, ...others] = rest.split("/");
  // A leading segment like "f_auto,q_auto" is a transformation, not a folder.
  if (/^[a-z]{1,3}_[^/]*(,[a-z]{1,3}_[^/]*)*$/.test(first) && others.length > 0) {
    return `${base}${first},${transformation}/${others.join("/")}`;
  }
  return `${base}${transformation}/${rest}`;
}
