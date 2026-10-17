/**
 * The site's hand-rolled glides (the avatar's hero ↔ topbar move, the nav
 * underline) run as Web Animations on `transform` alone. The browser hands
 * those to the compositor, so they stay smooth on a slow phone even while the
 * next page is still rendering on the main thread — exactly when a
 * JS-driven animation (one frame computed in script at a time) would stall.
 */

/** Same curve as --ease-out in index.css. */
export const GLIDE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
