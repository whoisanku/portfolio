import { useEffect } from "react";

/**
 * Stop the page scrolling behind an overlay. Counted, so overlays that stack
 * (a confirm dialog over the editor, a lightbox over a modal) don't unlock
 * the page when the first one closes. <html> keeps `scrollbar-gutter:
 * stable`, so hiding the scrollbar doesn't shift the layout.
 */
let locks = 0;
let previous = "";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) document.body.style.overflow = previous;
    };
  }, [active]);
}
