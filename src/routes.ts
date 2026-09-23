import { lazy } from "react";
import { prefetchRouteData } from "./lib/queries";

/**
 * The blog post page carries the markdown renderer (~50 KB gzipped), so it's
 * split out and loaded on demand. Everything else is small enough to ship
 * with the first bundle and navigate without a network hop.
 */
export const loadBlogPostPage = () => import("./pages/BlogPostPage");
export const BlogPostPage = lazy(loadBlogPostPage);

/** Start loading a route's code and data ahead of the click. */
export function preloadRoute(path: string) {
  if (path.startsWith("/blog/")) void loadBlogPostPage();
  prefetchRouteData(path);
}

/**
 * Spread onto a link: hovering, focusing or touching it is a strong enough
 * signal to start fetching what the next page needs, which usually makes
 * the navigation itself instant.
 */
export const prefetchOnIntent = (path: string) => {
  const preload = () => preloadRoute(path);
  return { onMouseEnter: preload, onFocus: preload, onTouchStart: preload };
};

/** Run `task` once the browser has nothing better to do. Returns a canceller. */
export function whenIdle(task: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(task, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(task, 1500);
  return () => clearTimeout(id);
}
