/**
 * The owner's Bluesky profile: avatar and display name.
 *
 * An inline script in index.html starts the profile fetch and loads the avatar
 * image while the app bundle is still downloading, and main.tsx holds the
 * first render until it's in. So the avatar and name paint on the first frame
 * with the rest of the page, rather than stand-ins painting first and being
 * swapped out.
 *
 * Either field is null if the profile lacks it or Bluesky can't be reached.
 */
export interface OwnerProfile {
  /** Set only once the image has loaded, so it never paints half-drawn. */
  avatar: string | null;
  displayName: string | null;
}

declare global {
  interface Window {
    __ownerProfile?: Promise<OwnerProfile>;
  }
}

/** Longest the first render waits, counted from navigation start. */
const RENDER_WAIT_CAP_MS = 3000;

const EMPTY: OwnerProfile = { avatar: null, displayName: null };

export const ownerProfile: Promise<OwnerProfile> =
  window.__ownerProfile ?? Promise.resolve(EMPTY);

let loaded: OwnerProfile = EMPTY;
void ownerProfile.then((profile) => {
  loaded = profile;
});

/** The profile if it has already loaded, for a synchronous first render. */
export const loadedOwnerProfile = (): OwnerProfile => loaded;

/**
 * Settles once the profile has loaded or failed, or once the cap has passed.
 * The cap keeps a slow or unreachable Bluesky from holding the whole site.
 */
export const profileSettled: Promise<void> = Promise.race([
  ownerProfile.then(() => undefined),
  new Promise<void>((resolve) =>
    setTimeout(resolve, Math.max(0, RENDER_WAIT_CAP_MS - performance.now())),
  ),
]);
