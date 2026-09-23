/**
 * The owner's Bluesky profile: avatar and display name.
 *
 * The avatar sits in the first thing anyone sees, so it should paint with
 * the page instead of popping in after it:
 *
 * - An inline script in index.html requests the profile (and starts the
 *   avatar download) while the app bundle is still loading.
 * - The last profile seen is kept in localStorage. Repeat visits paint with
 *   it immediately — the image is in the HTTP cache — and pick up a changed
 *   avatar or name in the background.
 * - A first visit holds the first render (main.tsx) until the avatar has
 *   loaded, but never longer than a short cap, so a slow or unreachable
 *   Bluesky can't hold up the site. If it arrives after the cap, it fades in.
 *
 * Either field is null if the profile lacks it or Bluesky can't be reached.
 */
import { useSyncExternalStore } from "react";
import { OWNER_HANDLE, PUBLIC_API } from "./config";
import { optimizedSrc } from "./image";
import { readJson, writeJson } from "./storage";

export interface OwnerProfile {
  /** Original avatar URL on cdn.bsky.app — render it via ownerAvatarSrc(). */
  avatar: string | null;
  displayName: string | null;
}

interface RawProfile {
  avatar?: string;
  displayName?: string;
}

declare global {
  interface Window {
    /** Started by the inline script in index.html. */
    __ownerProfileRequest?: Promise<RawProfile | null>;
  }
}

/** Mirrors PROFILE_KEY in the inline script in index.html. */
const STORAGE_KEY = `owner-profile:${OWNER_HANDLE}`;

/** Longest a first visit waits for the avatar, counted from navigation start. */
const FIRST_VISIT_CAP_MS = 1500;
/** With a saved profile the image is normally in the HTTP cache already. */
const CACHED_CAP_MS = 400;

const EMPTY: OwnerProfile = { avatar: null, displayName: null };

/**
 * The avatar at 256px (plenty for the 72px hero at 3x) through Vercel's
 * image optimizer instead of Bluesky's 1000px original. The inline script
 * in index.html builds the same URL so its preload is reused.
 */
export const ownerAvatarSrc = (avatar: string) => optimizedSrc(avatar, 256);

function normalize(raw: RawProfile | null): OwnerProfile | null {
  if (!raw) return null;
  return {
    avatar: raw.avatar || null,
    displayName: raw.displayName?.trim() || null,
  };
}

function isProfile(value: unknown): value is OwnerProfile {
  const v = value as OwnerProfile | null;
  return !!v && "avatar" in v && "displayName" in v;
}

/* ───────────────────────── Store ───────────────────────── */

const saved = readJson<OwnerProfile>(STORAGE_KEY);
let current: OwnerProfile = isProfile(saved) ? saved : EMPTY;
const listeners = new Set<() => void>();

function publish(next: OwnerProfile) {
  if (next.avatar === current.avatar && next.displayName === current.displayName) return;
  current = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The owner's profile; re-renders when a fresher copy arrives. */
export const useOwnerProfile = (): OwnerProfile =>
  useSyncExternalStore(subscribe, () => current);

/* ───────────────────────── Loading ───────────────────────── */

/** Resolves once the image is in (or has failed); never rejects. */
function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

const request: Promise<RawProfile | null> =
  window.__ownerProfileRequest ??
  fetch(`${PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(OWNER_HANDLE)}`)
    .then((res) => (res.ok ? (res.json() as Promise<RawProfile>) : null))
    .catch(() => null);

/** Settles when the network profile is in the store (with its avatar loaded). */
const fresh: Promise<void> = request.then(async (raw) => {
  const profile = normalize(raw);
  if (!profile) return; // offline / Bluesky down: keep whatever we had
  writeJson(STORAGE_KEY, profile);
  // Swap only once the new image can paint in one go.
  if (profile.avatar && profile.avatar !== current.avatar) {
    await preload(ownerAvatarSrc(profile.avatar));
  }
  publish(profile);
});

const cap = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms - performance.now())));

/**
 * Settles when the first render may go ahead: the avatar is ready, or the
 * cap has passed. main.tsx waits on this.
 */
export const profileSettled: Promise<void> = current.avatar
  ? Promise.race([preload(ownerAvatarSrc(current.avatar)), cap(CACHED_CAP_MS)])
  : Promise.race([fresh, cap(FIRST_VISIT_CAP_MS)]);
