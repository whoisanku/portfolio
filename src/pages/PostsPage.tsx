import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowUpRight, Pin } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ErrorMessage from "../components/ErrorMessage";
import Img from "../components/Img";
import Lightbox, { type Gallery } from "../components/Lightbox";
import MediaCarousel from "../components/MediaCarousel";
import { PostCardSkeleton, PostsFeedSkeleton } from "../components/Skeleton";
import VideoPlayer from "../components/VideoPlayer";
import { bskyPostUrl } from "../lib/atproto";
import { OWNER_HANDLE } from "../lib/config";
import { gifEmbed, type Facet, type FeedImage, type FeedPost } from "../lib/feed";
import { postsFeedQuery } from "../lib/queries";

/** How far below the viewport (px) the next page starts loading. */
const AUTOLOAD_MARGIN = "1200px";

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
  const nodes: ReactNode[] = [];
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
  icon: ReactNode;
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
  const gif = post.external ? gifEmbed(post.external.uri) : null;
  const external = gif ? null : post.external;
  const single = post.images.length === 1 ? post.images[0] : null;

  return (
    <article className="post-card group py-7 first:pt-1" data-scroll-anchor={post.cid}>
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
      ) : single ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => onImageClick(post.images, 0)}
            className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line bg-raise"
            aria-label="View image"
          >
            {/* width/height reserve the image's shape before it loads */}
            <Img
              src={single.thumb}
              alt={single.alt || "Post image"}
              width={single.aspectRatio?.width}
              height={single.aspectRatio?.height}
              loading="lazy"
              className="block h-auto max-h-[420px] w-full object-cover"
            />
          </button>
        </div>
      ) : null}

      {/* Bluesky video — custom branded player, autoplays in view */}
      {post.video && <VideoPlayer video={post.video} />}

      {/* Animated GIF (Tenor/Giphy) — plays inline */}
      {gif && post.external && (
        <div
          className="mt-4 w-fit max-w-full overflow-hidden rounded-xl border border-line bg-raise"
          style={
            gif.size
              ? {
                  // Exactly the GIF's box: full width up to its own size, no taller than 360px.
                  width: `min(100%, ${gif.size.width}px, ${(360 * gif.size.width) / gif.size.height}px)`,
                  aspectRatio: `${gif.size.width} / ${gif.size.height}`,
                }
              : undefined
          }
        >
          <Img
            src={post.external.uri}
            alt={post.external.title || "GIF"}
            loading="lazy"
            className={gif.size ? "block h-full w-full object-contain" : "block max-h-[360px] max-w-full"}
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
            <span className="w-24 shrink-0 border-r border-line bg-raise sm:w-28">
              <Img
                src={external.thumb}
                alt=""
                loading="lazy"
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
  const {
    data,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery(postsFeedQuery());
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // One list across pages, de-duplicated (the pinned post also shows up in
  // its natural chronological spot).
  const posts = useMemo(() => {
    const seen = new Set<string>();
    const list: FeedPost[] = [];
    for (const page of data?.pages ?? []) {
      for (const post of page.posts) {
        if (seen.has(post.cid)) continue;
        seen.add(post.cid);
        list.push(post);
      }
    }
    return list;
  }, [data]);

  const openLightbox = useCallback((images: FeedImage[], index: number) => {
    setGallery({
      images: images.map((img) => ({
        src: img.fullsize,
        thumb: img.thumb,
        alt: img.alt,
        aspectRatio: img.aspectRatio,
      })),
      index,
    });
  }, []);
  const closeLightbox = useCallback(() => setGallery(null), []);

  // Back-to-top affordance once the feed scrolls past a screen or so
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep reading without a click: fetch the next page well before the end.
  // A failed page stops the loop until the reader retries.
  const canAutoLoad = Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !canAutoLoad) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { rootMargin: `0px 0px ${AUTOLOAD_MARGIN} 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canAutoLoad, fetchNextPage]);

  if (!data) {
    if (error) {
      return (
        <ErrorMessage
          message="Couldn't load posts from Bluesky. Check your connection and try again."
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      );
    }
    return <PostsFeedSkeleton />;
  }

  return (
    <div>
      <div className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.cid} post={post} onImageClick={openLightbox} />
        ))}
      </div>

      <div ref={sentinelRef} aria-hidden="true" />

      {isFetchingNextPage && (
        <>
          <PostCardSkeleton />
          <span className="sr-only" role="status">Loading more posts…</span>
        </>
      )}

      {isFetchNextPageError && (
        <ErrorMessage
          message="Couldn't load more posts."
          onRetry={() => void fetchNextPage()}
          retrying={isFetchingNextPage}
        />
      )}

      {hasNextPage && !isFetchingNextPage && !isFetchNextPageError && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            className="inline-flex items-center gap-2 border-b border-line pb-0.5 font-mono text-[13px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            Load more
          </button>
        </div>
      )}

      {!hasNextPage && posts.length > 0 && (
        <p className="mt-12 text-center font-display text-[15px] italic text-ink-3">
          — that’s everything —
        </p>
      )}

      {posts.length === 0 && (
        <p className="py-12 text-center font-mono text-xs text-ink-3">No posts yet.</p>
      )}

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        tabIndex={showTop ? undefined : -1}
        className={`pressable fixed right-5 bottom-20 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-ink-3 shadow-[0_4px_18px_rgba(0,0,0,0.12)] transition duration-300 hover:border-accent hover:text-accent ${showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
          }`}
      >
        <ArrowUp size={20} />
      </button>

      <Lightbox gallery={gallery} onClose={closeLightbox} />
    </div>
  );
};

export default PostsPage;
