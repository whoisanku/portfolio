import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUpRight, Pin } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import BackToTop from "../components/BackToTop";
import ErrorMessage from "../components/ErrorMessage";
import Img from "../components/Img";
import Lightbox, { type Gallery } from "../components/Lightbox";
import MediaCarousel from "../components/MediaCarousel";
import { PostCardSkeleton, PostsFeedSkeleton } from "../components/Skeleton";
import VideoPlayer from "../components/VideoPlayer";
import { bskyPostUrl } from "../lib/atproto";
import { OWNER_HANDLE } from "../lib/config";
import { gifEmbed, mediaFrameStyle, type Facet, type FeedImage, type FeedPost } from "../lib/feed";
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
  const frame = mediaFrameStyle(single?.aspectRatio);

  return (
    <article className="post-card group py-7 first:pt-1" data-scroll-anchor={post.cid}>
      {/* Date line — handwritten, like the section labels, with a snake rule; arrow appears on hover */}
      <header className="flex items-center gap-3">
        {post.pinned && (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
            <Pin size={11} />
            Pinned
          </span>
        )}
        <time className="font-hand text-[18px] leading-[1.1] font-medium tracking-[0.01em] whitespace-nowrap text-ink-3">
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
          {/* The photo's own ratio, as wide as fits under the height cap (see
              mediaFrameRatio) — the frame is reserved before the image loads.
              Posts without a recorded ratio fall back to the image's natural
              size under the same cap. */}
          <button
            type="button"
            onClick={() => onImageClick(post.images, 0)}
            className={`block cursor-zoom-in overflow-hidden rounded-xl border border-line bg-raise ${
              frame ? "" : "w-fit max-w-full"
            }`}
            aria-label="View image"
            style={frame}
          >
            <Img
              src={single.thumb}
              alt={single.alt || "Post image"}
              loading="lazy"
              className={
                frame
                  ? "block h-full w-full object-cover"
                  : "block h-auto max-h-[440px] w-auto max-w-full"
              }
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

      {/* Link card — the site's banner flush against the card's edge at the
          standard OG ratio (1.91:1), title and description, and an "open" bar
          along the bottom. Beside the text from `sm` up (200px, one-line
          title and description so the banner sets the height); on top on a
          phone, where the text gets two lines each. Hover only touches the
          bar: it tints, "open" takes the accent and its arrow nudges out. */}
      {external && (
        <a
          href={external.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link mt-4 flex flex-col overflow-hidden rounded-xl border border-line bg-raise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-row"
        >
          {external.thumb && (
            <span className="block aspect-[1.91/1] w-full shrink-0 overflow-hidden border-b border-line bg-paper sm:w-[200px] sm:border-r sm:border-b-0">
              <Img src={external.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-col px-3.5 pt-3">
              <span className="line-clamp-2 font-display text-[16px] leading-snug font-medium text-ink sm:line-clamp-1">
                {external.title || external.uri}
              </span>
              {external.description && (
                <span className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-2 sm:line-clamp-1">
                  {external.description}
                </span>
              )}
            </span>
            <span className="mt-3 flex items-center justify-between gap-3 border-t border-line px-3.5 py-2 font-mono text-[11px] text-ink-3 transition-colors duration-200 group-active/link:bg-ink/[0.04] sm:mt-auto fine:group-hover/link:bg-ink/[0.04]">
              <span className="min-w-0 truncate">{hostnameOf(external.uri) ?? external.uri}</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 transition-colors duration-200 fine:group-hover/link:text-accent">
                open
                <ArrowUpRight
                  size={11}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="transition-transform duration-[250ms] ease-out fine:group-hover/link:translate-x-0.5 fine:group-hover/link:-translate-y-0.5"
                />
              </span>
            </span>
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

      <BackToTop />

      <Lightbox gallery={gallery} onClose={closeLightbox} />
    </div>
  );
};

export default PostsPage;
