import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type TouchEvent } from "react";
import { mediaFrameStyle, type FeedImage } from "../lib/feed";
import Img from "./Img";

/** Horizontal travel (px) that counts as a swipe. */
const SWIPE_PX = 40;

/**
 * Custom carousel for posts with multiple images — one frame at a time,
 * side arrows (or a swipe), mono counter, and dot indicators in the site's
 * accent.
 */
const MediaCarousel = ({
  images,
  onImageClick,
}: {
  images: FeedImage[];
  onImageClick: (index: number) => void;
}) => {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  // One frame for every slide, shaped and sized by the first photo (same rule
  // as a single image); the others fill it. Without a ratio, a fixed height.
  const frame = mediaFrameStyle(images[0].aspectRatio);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(t.clientY - start.y)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      className="relative mt-4 overflow-hidden rounded-xl border border-line bg-raise"
      style={frame && { width: frame.width }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${count} images`}
    >
      {/* Sliding track */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((image, i) => (
          <button
            key={image.fullsize}
            type="button"
            onClick={() => onImageClick(i)}
            className={`w-full shrink-0 cursor-zoom-in ${frame ? "" : "h-[300px] sm:h-[400px]"}`}
            style={{ aspectRatio: frame?.aspectRatio }}
            aria-label={`View image ${i + 1} of ${count}`}
            tabIndex={i === index ? undefined : -1}
          >
            <Img
              src={image.thumb}
              alt={image.alt || "Post image"}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Arrows */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous image"
        className="pressable absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-paper/90 text-ink backdrop-blur-sm transition-colors hover:text-accent"
      >
        <ChevronLeft size={17} className="-translate-x-[1px]" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next image"
        className="pressable absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-paper/90 text-ink backdrop-blur-sm transition-colors hover:text-accent"
      >
        <ChevronRight size={17} className="translate-x-[1px]" />
      </button>

      {/* Counter — same chip as the video player's controls */}
      <span className="absolute top-3 right-3 rounded-full bg-paper/90 px-2.5 py-1 font-mono text-[10.5px] tabular-nums text-ink-2 backdrop-blur-sm">
        {index + 1} / {count}
      </span>

      {/* Dots */}
      <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((image, i) => (
          <button
            key={image.fullsize}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to image ${i + 1}`}
            className={`h-1.5 rounded-full cursor-pointer transition-[width,background-color] duration-300 ${
              i === index ? "w-4 bg-accent" : "w-1.5 bg-ink/35 hover:bg-ink/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default MediaCarousel;
