import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { readJson, writeJson } from "../lib/storage";

const STORAGE_KEY = "scroll-positions";
/** How long a Back navigation holds its position while the page settles. */
const RESTORE_WINDOW_MS = 1500;
/** Pause in scrolling after which the reading position is noted. */
const SETTLE_MS = 120;
/** The reader scrolling on their own ends a restore. */
const INPUT_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * Where the reader was on a history entry: the pixel offset, plus the first
 * item on screen (elements marked `data-scroll-anchor`) and its distance
 * from the top of the viewport. Restoring to the item stays exact even when
 * heights above it differ from when it was saved (feed cards that skip
 * rendering off screen, images still loading).
 */
interface Position {
  y: number;
  anchor?: string;
  offset?: number;
}

const positions = new Map<string, Position>(
  Object.entries(readJson<Record<string, Position>>(STORAGE_KEY, "session") ?? {}),
);

function firstVisibleAnchor(): Pick<Position, "anchor" | "offset"> {
  for (const el of document.querySelectorAll<HTMLElement>("[data-scroll-anchor]")) {
    const { top, bottom } = el.getBoundingClientRect();
    if (bottom > 0) return { anchor: el.dataset.scrollAnchor, offset: top };
  }
  return {};
}

/** Scroll to a saved position: to its on-screen item if present, else the offset. */
function apply({ y, anchor, offset = 0 }: Position) {
  const el = anchor && document.querySelector(`[data-scroll-anchor="${CSS.escape(anchor)}"]`);
  if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - offset);
  else window.scrollTo(0, y);
}

/**
 * Scroll restoration for the SPA, the way a normal site behaves: a new page
 * starts at the top, Back/Forward return to where you were, and query-string
 * updates on the same page leave the scroll alone. (The browser can't do
 * this itself for client-side navigations, and React Router's
 * <ScrollRestoration> needs a data router.)
 */
const ScrollManager = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef(location.key);
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // Remember each history entry's position as the reader moves: the offset
  // on every scroll event (a Map write is cheap, and synchronous so it can
  // never land on the entry that replaced it), the on-screen item once
  // scrolling pauses.
  useEffect(() => {
    let settleTimer = 0;
    const record = () => {
      const key = keyRef.current;
      positions.set(key, { ...positions.get(key), y: window.scrollY });
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (keyRef.current !== key) return;
        positions.set(key, { y: window.scrollY, ...firstVisibleAnchor() });
      }, SETTLE_MS);
    };
    const save = () => writeJson(STORAGE_KEY, Object.fromEntries(positions), "session");
    window.addEventListener("scroll", record, { passive: true });
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(settleTimer);
      window.removeEventListener("scroll", record);
      window.removeEventListener("pagehide", save);
    };
  }, []);

  useLayoutEffect(() => {
    // Replacing the entry without leaving the page (a filter written to the
    // query string) isn't a page change: stay put.
    const samePage = navigationType === "REPLACE" && pathRef.current === location.pathname;
    pathRef.current = location.pathname;
    keyRef.current = location.key;
    if (samePage) {
      positions.set(location.key, { y: window.scrollY, ...firstVisibleAnchor() });
      return;
    }

    const saved = navigationType === "POP" ? positions.get(location.key) : undefined;
    if (!saved || (saved.y === 0 && !saved.anchor)) {
      // Pushes (and entries with nothing saved) start at the top.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      return;
    }

    // Back/Forward: return to the saved spot, and hold it while the page
    // settles (data arriving, images decoding, feed cards swapping their
    // estimated height for the real one) — until the reader takes over.
    apply(saved);
    const observer = new ResizeObserver(() => apply(saved));
    observer.observe(document.body);
    const stop = () => {
      observer.disconnect();
      clearTimeout(timer);
      for (const type of INPUT_EVENTS) window.removeEventListener(type, stop);
    };
    const timer = setTimeout(stop, RESTORE_WINDOW_MS);
    for (const type of INPUT_EVENTS) {
      window.addEventListener(type, stop, { passive: true, once: true });
    }
    return stop;
  }, [location.key, location.pathname, navigationType]);

  return null;
};

export default ScrollManager;
