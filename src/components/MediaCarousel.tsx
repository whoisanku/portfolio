import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { FeedImage } from "../lib/feed";

/**
 * Custom carousel for posts with multiple images — one frame at a time,
 * side arrows, mono counter, and dot indicators in the site's accent.
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

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-line">
      {/* Sliding track */}
      <div
        className="flex transition-transform duration-400 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((image, i) => (
          <button
            key={image.fullsize}
            type="button"
            onClick={() => onImageClick(i)}
            className="h-[300px] w-full shrink-0 cursor-pointer sm:h-[400px]"
          >
            <img
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
        className="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:text-accent"
      >
        <ChevronLeft size={17} className="-translate-x-[1px]" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next image"
        className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:text-accent"
      >
        <ChevronRight size={17} className="translate-x-[1px]" />
      </button>

      {/* Counter */}
      <span className="absolute top-2.5 right-2.5 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] tabular-nums text-white/90 backdrop-blur-sm">
        {index + 1}/{count}
      </span>

      {/* Dots */}
      <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
        {images.map((image, i) => (
          <button
            key={image.fullsize}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to image ${i + 1}`}
            className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
              i === index ? "w-4 bg-accent" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default MediaCarousel;
