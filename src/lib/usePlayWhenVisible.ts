import { useEffect, type RefObject } from "react";

/**
 * Marks the element `data-playing` while it's on screen, so a looping CSS
 * animation keyed to that attribute only runs while someone can see it.
 * Toggled directly on the element: scrolling it in and out of view never
 * re-renders anything.
 */
export function usePlayWhenVisible(ref: RefObject<Element | null>, margin = "0px") {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => el.toggleAttribute("data-playing", entry.isIntersecting),
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin]);
}
