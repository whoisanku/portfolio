/**
 * The owner's Bluesky avatar.
 *
 * An inline script in index.html starts the profile fetch and loads the image
 * while the app bundle is still downloading, and main.tsx holds the first
 * render until it's in. So the avatar paints on the first frame with the rest
 * of the page, rather than a stand-in painting first and being swapped out.
 *
 * Resolves to null if the profile has no avatar or Bluesky can't be reached.
 */
declare global {
  interface Window {
    __ownerAvatar?: Promise<string | null>;
  }
}

/** Longest the first render waits, counted from navigation start. */
const RENDER_WAIT_CAP_MS = 3000;

export const ownerAvatar: Promise<string | null> =
  window.__ownerAvatar ?? Promise.resolve(null);

let loaded: string | null = null;
void ownerAvatar.then((url) => {
  loaded = url;
});

/** The avatar if it has already loaded, for a synchronous first render. */
export const loadedOwnerAvatar = (): string | null => loaded;

/**
 * Settles once the avatar has loaded or failed, or once the cap has passed.
 * The cap keeps a slow or unreachable Bluesky from holding the whole site.
 */
export const avatarSettled: Promise<void> = Promise.race([
  ownerAvatar.then(() => undefined),
  new Promise<void>((resolve) =>
    setTimeout(resolve, Math.max(0, RENDER_WAIT_CAP_MS - performance.now())),
  ),
]);
