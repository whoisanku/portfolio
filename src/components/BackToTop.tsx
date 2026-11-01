import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Scroll depth (px) past which the button shows — about a screen in. */
const SHOW_AFTER = 600;

/**
 * Floating "back to top" button for long pages (posts feed, blog posts).
 * Rises in once the reader is a screen or so down; sits above the chat
 * bubble in the bottom-right corner.
 */
const BackToTop = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > SHOW_AFTER);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      tabIndex={show ? undefined : -1}
      className={`pressable fixed right-5 bottom-20 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-ink-3 shadow-[0_4px_18px_rgba(0,0,0,0.12)] transition duration-300 hover:border-accent hover:text-accent ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ArrowUp size={20} />
    </button>
  );
};

export default BackToTop;
