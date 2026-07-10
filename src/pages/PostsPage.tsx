import { ArrowUp, ArrowUpRight, Pin, ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import MediaCarousel from "../components/MediaCarousel";
import VideoPlayer from "../components/VideoPlayer";
import { bskyPostUrl } from "../lib/atproto";
import { OWNER_HANDLE } from "../lib/config";
import { fetchAuthorPosts, type Facet, type FeedPost, type FeedImage } from "../lib/feed";

const formatDate = (iso: string) => {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

const hostnameOf = (uri: string): string | null => {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const facetHref = (facet: Facet): string | null => {
  for (const f of facet.features) {
    if (f.$type === "app.bsky.richtext.facet#mention" && f.did)
      return `https://bsky.app/profile/${f.did}`;
    if (f.$type === "app.bsky.richtext.facet#link" && f.uri) return f.uri;
    if (f.$type === "app.bsky.richtext.facet#tag" && f.tag)
      return `https://bsky.app/hashtag/${encodeURIComponent(f.tag)}`;
  }
  return null;
};

/** Post text with mentions, links and hashtags resolved from facets
    (UTF-8 byte ranges) into accent-colored anchors. */
const RichText = ({ text, facets }: { text: string; facets?: Facet[] }) => {
  if (!facets?.length) return <>{text}</>;

  const bytes = new TextEncoder().encode(text);
  const decoder = new TextDecoder();
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
  for (const facet of sorted) {
    const { byteStart, byteEnd } = facet.index;
    if (byteStart < cursor || byteEnd > bytes.length) continue;
    if (byteStart > cursor) {
      nodes.push(decoder.decode(bytes.slice(cursor, byteStart)));
    }
    const segment = decoder.decode(bytes.slice(byteStart, byteEnd));
    const href = facetHref(facet);
    nodes.push(
      href ? (
        <a
          key={`${byteStart}-${byteEnd}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline-offset-4 hover:underline"
        >
          {segment}
        </a>
      ) : (
        segment
      ),
    );
    cursor = byteEnd;
  }
  if (cursor < bytes.length) nodes.push(decoder.decode(bytes.slice(cursor)));

  return <>{nodes}</>;
};

/** Tenor/Giphy embeds arrive as external links — render those inline as GIFs. */
const isGifEmbed = (uri: string): boolean => {
  try {
    const { hostname, pathname } = new URL(uri);
    return (
      /\.gif$/i.test(pathname) ||
      hostname.endsWith("tenor.com") ||
      hostname.endsWith("giphy.com")
    );
  } catch {
    return false;
  }
};

/* Hand-drawn stat icons — single hairline stroke, same weight as the rules. */
const statIconProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const LikeIcon = () => (
  <svg {...statIconProps} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
  </svg>
);

/* Repost loop */
const RepostIcon = () => (
  <svg {...statIconProps} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

/* Round speech bubble with a corner tail */
const ReplyIcon = () => (
  <svg {...statIconProps} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
  </svg>
);


const Stat = ({
  icon,
  count,
}: {
  icon: React.ReactNode;
  count: number;
}) => (
  <span className="inline-flex items-center gap-1.5">
    {icon}
    {count}
  </span>
);

const PostCard = memo(({
  post,
  onImageClick,
}: {
  post: FeedPost;
  onImageClick: (images: FeedImage[], index: number) => void;
}) => {
  const gif = post.external && isGifEmbed(post.external.uri) ? post.external : null;
  const external = gif ? null : post.external;

  return (
    <article className="post-card group py-7 first:pt-1">
      {/* Date line — quiet mono with a snake rule, arrow appears on hover */}
      <header className="flex items-center gap-3">
        {post.pinned && (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
            <Pin size={11} />
            Pinned
          </span>
        )}
        <time className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
          {formatDate(post.createdAt)}
        </time>
        <span className="wavy-rule flex-1" aria-hidden="true" />
        <a
          href={bskyPostUrl(OWNER_HANDLE, post.uri)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open on Bluesky"
          title="Open on Bluesky"
          className="rounded-md p-1 text-ink-3 opacity-0 transition group-hover:opacity-100 hover:text-accent focus-visible:opacity-100"
        >
          <ArrowUpRight size={14} />
        </a>
      </header>

      {/* Body */}
      {post.text && (
        <p className="mt-3 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
          <RichText text={post.text} facets={post.facets} />
        </p>
      )}

      {post.images.length > 1 ? (
        <MediaCarousel images={post.images} onImageClick={(index) => onImageClick(post.images, index)} />
      ) : post.images.length === 1 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => onImageClick(post.images, 0)}
            className="cursor-pointer overflow-hidden rounded-xl border border-line"
          >
            <img
              src={post.images[0].thumb}
              alt={post.images[0].alt || "Post image"}
              loading="lazy"
              decoding="async"
              className="h-full max-h-[420px] w-full object-cover"
            />
          </button>
        </div>
      ) : null}

      {/* Bluesky video — custom branded player, autoplays in view */}
      {post.video && <VideoPlayer video={post.video} />}

      {/* Animated GIF (Tenor/Giphy) — plays inline */}
      {gif && (
        <div className="mt-4 w-fit max-w-full overflow-hidden rounded-xl border border-line">
          <img
            src={gif.uri}
            alt={gif.title || "GIF"}
            loading="lazy"
            decoding="async"
            className="block max-h-[360px] max-w-full"
          />
        </div>
      )}

      {external && (
        <a
          href={external.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-stretch overflow-hidden rounded-xl border border-line bg-raise transition-colors hover:border-accent"
        >
          {external.thumb && (
            <span className="w-24 shrink-0 border-r border-line sm:w-28">
              <img
                src={external.thumb}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </span>
          )}
          <span className="min-w-0 px-4 py-3.5">
            <span className="block truncate font-display text-[15.5px] font-medium text-ink">
              {external.title || external.uri}
            </span>
            {external.description && (
              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-3">
                {external.description}
              </span>
            )}
            {hostnameOf(external.uri) && (
              <span className="mt-1.5 block truncate font-mono text-[10.5px] text-ink-3">
                {hostnameOf(external.uri)}
              </span>
            )}
          </span>
        </a>
      )}

      {/* Engagement */}
      <footer className="mt-4 flex items-center gap-6 font-mono text-[13px] text-ink-3">
        <Stat icon={<LikeIcon />} count={post.likeCount} />
        <Stat icon={<RepostIcon />} count={post.repostCount} />
        <Stat icon={<ReplyIcon />} count={post.replyCount} />
      </footer>
    </article>
  );
});

PostCard.displayName = "PostCard";

const PostsPage = () => {
  const prefersReduced = useReducedMotion();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    images: FeedImage[];
    index: number;
  } | null>(null);
  const [lightboxLoaded, setLightboxLoaded] = useState(false);
  const requested = useRef(false);

  const openLightbox = useCallback((images: FeedImage[], index: number) => {
    setLightboxLoaded(false);
    setLightbox({ images, index });
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
      } else if (e.key === "ArrowLeft" && lightbox.images.length > 1) {
        setLightboxLoaded(false);
        setLightbox((prev) =>
          prev
            ? {
              ...prev,
              index: (prev.index - 1 + prev.images.length) % prev.images.length,
            }
            : null,
        );
      } else if (e.key === "ArrowRight" && lightbox.images.length > 1) {
        setLightboxLoaded(false);
        setLightbox((prev) =>
          prev
            ? {
              ...prev,
              index: (prev.index + 1) % prev.images.length,
            }
            : null,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox]);

  // Back-to-top affordance once the feed scrolls past a screen or so
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadPage = useCallback(async (pageCursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchAuthorPosts(OWNER_HANDLE, pageCursor);
      setPosts((prev) => {
        // dedupe across pages AND within one (the pinned post also shows
        // up in its natural chronological spot)
        const seen = new Set(prev.map((p) => p.cid));
        const fresh: FeedPost[] = [];
        for (const p of page.posts) {
          if (seen.has(p.cid)) continue;
          seen.add(p.cid);
          fresh.push(p);
        }
        return [...prev, ...fresh];
      });
      setCursor(page.cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    loadPage();
  }, [loadPage]);

  return (
    <div>
      {error && <ErrorMessage message={error} />}

      <div className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.cid} post={post} onImageClick={openLightbox} />
        ))}
      </div>

      {loading && <Loader label="Loading posts…" />}

      {!loading && cursor && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => loadPage(cursor)}
            className="border-b border-line pb-0.5 font-mono text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            Load more
          </button>
        </div>
      )}

      {!loading && !cursor && posts.length > 0 && (
        <p className="mt-12 text-center font-display text-[15px] italic text-ink-3">
          — that’s everything —
        </p>
      )}

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`pressable fixed right-5 bottom-20 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-ink-3 shadow-[0_4px_18px_rgba(0,0,0,0.12)] transition duration-300 hover:border-accent hover:text-accent ${showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
          }`}
      >
        <ArrowUp size={20} />
      </button>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
            onClick={() => setLightbox(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Active Image Container — centered modal, scales in from 0.96 */}
            <motion.div
              className="relative flex max-h-[78vh] max-w-full items-center justify-center"
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
            {!lightboxLoaded && (
              <span
                className="absolute h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white/90"
                aria-label="Loading image"
              />
            )}
            <img
              src={lightbox.images[lightbox.index].fullsize}
              alt={lightbox.images[lightbox.index].alt || "Full size"}
              onLoad={() => setLightboxLoaded(true)}
              className={`max-h-[78vh] max-w-full rounded-lg object-contain transition-opacity duration-350 ease-out select-none shadow-[0_24px_64px_rgba(0,0,0,0.5)] ${lightboxLoaded ? "opacity-100" : "opacity-0"
                }`}
              onClick={(e) => e.stopPropagation()}
            />
            </motion.div>

            {/* Bottom Controls Bar */}
            <div
              className="absolute bottom-6 left-1/2 z-55 flex -translate-x-1/2 items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
            {lightbox.images.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxLoaded(false);
                    setLightbox((prev) =>
                      prev
                        ? {
                          ...prev,
                          index: (prev.index - 1 + prev.images.length) % prev.images.length,
                        }
                        : null,
                    );
                  }}
                  className="pressable flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-accent focus:outline-none"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Counter & Dots Stack */}
                <div className="flex flex-col items-center gap-2">
                  {/* Counter */}
                  <span className="rounded-full bg-black/65 px-3 py-1 font-mono text-xs tabular-nums text-white/90 backdrop-blur-sm border border-white/5 shadow-sm">
                    {lightbox.index + 1} / {lightbox.images.length}
                  </span>

                  {/* Dots */}
                  <div className="flex gap-2">
                    {lightbox.images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setLightboxLoaded(false);
                          setLightbox((prev) => (prev ? { ...prev, index: i } : null));
                        }}
                        className={`h-2 rounded-full cursor-pointer transition-[width,background-color] duration-300 ${i === lightbox.index ? "w-5 bg-accent" : "w-2 bg-white/40 hover:bg-white/75"
                          }`}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxLoaded(false);
                    setLightbox((prev) =>
                      prev
                        ? {
                          ...prev,
                          index: (prev.index + 1) % prev.images.length,
                        }
                        : null,
                    );
                  }}
                  className="pressable flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-accent focus:outline-none"
                  aria-label="Next image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostsPage;
