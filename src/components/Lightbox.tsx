import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import type { AspectRatio } from "../lib/feed";
import { useScrollLock } from "../lib/useScrollLock";

export interface LightboxImage {
  /** Full-resolution image. */
  src: string;
  /** The small version already on the page; shown instantly while `src` loads. */
  thumb?: string;
  alt?: string;
  aspectRatio?: AspectRatio;
}

export interface Gallery {
  images: LightboxImage[];
  index: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;
/** Horizontal travel (px) that counts as a swipe to the next/previous image. */
const SWIPE_PX = 50;

const controlClass =
  "pressable flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

const spinner = (
  <span
    className="absolute inset-0 m-auto h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white/90"
    aria-label="Loading image"
  />
);

/**
 * One image. Once its shape is known (from the post, or measured off the
 * thumbnail) the frame is sized to fill the viewport at that aspect ratio;
 * the thumbnail paints it immediately and the full size fades in over it.
 */
const Frame = ({ image }: { image: LightboxImage }) => {
  const [fullLoaded, setFullLoaded] = useState(false);
  const [measured, setMeasured] = useState<AspectRatio>();
  const ratio = image.aspectRatio ?? measured;
  const thumb = image.thumb && image.thumb !== image.src ? image.thumb : undefined;

  const measure = (img: HTMLImageElement | null) => {
    if (!img || img.naturalWidth === 0) return;
    setMeasured((prev) => prev ?? { width: img.naturalWidth, height: img.naturalHeight });
  };

  const onFullRef = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) {
      setFullLoaded(true);
      measure(img);
    }
  };

  const full = (className: string) => (
    <img
      ref={onFullRef}
      src={image.src}
      alt={image.alt || "Full size"}
      onLoad={(e) => {
        setFullLoaded(true);
        measure(e.currentTarget);
      }}
      draggable={false}
      className={`rounded-lg object-contain select-none shadow-[0_24px_64px_rgba(0,0,0,0.5)] transition-opacity duration-300 ease-out ${className} ${
        fullLoaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );

  if (!ratio) {
    // Shape unknown until something loads: let the image size itself.
    return (
      <div className="relative flex min-h-24 min-w-24 items-center justify-center">
        {thumb && (
          <img
            src={thumb}
            alt=""
            aria-hidden="true"
            className="hidden"
            ref={(img) => {
              if (img?.complete) measure(img);
            }}
            onLoad={(e) => measure(e.currentTarget)}
          />
        )}
        {!fullLoaded && spinner}
        {full("max-h-[78vh] max-w-full")}
      </div>
    );
  }

  const aspect = ratio.width / ratio.height;
  return (
    <div
      className="relative"
      style={{
        aspectRatio: `${ratio.width} / ${ratio.height}`,
        width: `min(calc(100vw - 2rem), calc(78vh * ${aspect}))`,
      }}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full rounded-lg object-contain select-none"
        />
      ) : (
        !fullLoaded && spinner
      )}
      {full("absolute inset-0 h-full w-full")}
    </div>
  );
};

const LightboxView = ({ gallery, onClose }: { gallery: Gallery; onClose: () => void }) => {
  const prefersReduced = useReducedMotion();
  const { images } = gallery;
  const count = images.length;
  const [index, setIndex] = useState(gallery.index);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useScrollLock(true);

  // Keyboard: Escape closes, arrows page through a gallery.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) go(-1);
      else if (e.key === "ArrowRight" && count > 1) go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go, onClose]);

  // Take focus while open; hand it back to whatever opened the lightbox.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  // Warm the neighbours so paging through feels instant.
  useEffect(() => {
    if (count < 2) return;
    for (const i of [index + 1, index - 1]) {
      const neighbour = images[(i + count) % count];
      if (neighbour) new Image().src = neighbour.src;
    }
  }, [count, images, index]);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || count < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const image = images[index];

  return (
    <m.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={count > 1 ? `Image ${index + 1} of ${count}` : "Image"}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 outline-none backdrop-blur-md"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      <m.div
        onClick={(e) => e.stopPropagation()}
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        <Frame key={image.src} image={image} />
      </m.div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={`${controlClass} absolute top-4 right-4`}
      >
        <X size={18} />
      </button>

      {count > 1 && (
        <div
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => go(-1)} className={controlClass} aria-label="Previous image">
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center gap-2">
            <span className="rounded-full border border-white/5 bg-black/65 px-3 py-1 font-mono text-xs tabular-nums text-white/90 shadow-sm backdrop-blur-sm">
              {index + 1} / {count}
            </span>
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 cursor-pointer rounded-full transition-[width,background-color] duration-300 ${
                    i === index ? "w-5 bg-accent" : "w-2 bg-white/40 hover:bg-white/75"
                  }`}
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={i === index || undefined}
                />
              ))}
            </div>
          </div>

          <button type="button" onClick={() => go(1)} className={controlClass} aria-label="Next image">
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </m.div>
  );
};

/** Fullscreen image viewer. Pass `null` to close it (with its exit fade). */
const Lightbox = ({ gallery, onClose }: { gallery: Gallery | null; onClose: () => void }) =>
  createPortal(
    <AnimatePresence>
      {gallery && <LightboxView key="lightbox" gallery={gallery} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  );

export default Lightbox;
