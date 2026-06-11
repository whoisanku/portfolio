import { ArrowUpRight, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { bskyPostUrl } from "../lib/atproto";
import { OWNER_HANDLE } from "../lib/config";
import { fetchAuthorPosts, type FeedPost } from "../lib/feed";

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

const PostCard = ({
  post,
  onImageClick,
}: {
  post: FeedPost;
  onImageClick: (src: string) => void;
}) => (
  <article className="group border-b border-line py-8 first:pt-2 last:border-b-0">
    {/* Author */}
    <header className="flex items-center gap-3">
      {post.author.avatar ? (
        <img
          src={post.author.avatar}
          alt={post.author.displayName || post.author.handle}
          loading="lazy"
          className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-raise">
          <User size={14} className="text-ink-3" />
        </span>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[13.5px] leading-tight font-semibold text-ink">
          {post.author.displayName || post.author.handle}
        </span>
        <span className="truncate font-mono text-[11px] text-ink-3">
          @{post.author.handle}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <time className="font-mono text-[11px] text-ink-3">
          {formatDate(post.createdAt)}
        </time>
        <a
          href={bskyPostUrl(OWNER_HANDLE, post.uri)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open on Bluesky"
          title="Open on Bluesky"
          className="rounded-md p-1 text-ink-3 opacity-0 transition-all group-hover:opacity-100 hover:text-accent focus-visible:opacity-100"
        >
          <ArrowUpRight size={14} />
        </a>
      </div>
    </header>

    {/* Body */}
    {post.text && (
      <p className="mt-3.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
        {post.text}
      </p>
    )}

    {post.images.length > 0 && (
      <div
        className={`mt-4 grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {post.images.map((image) => (
          <button
            key={image.fullsize}
            type="button"
            onClick={() => onImageClick(image.fullsize)}
            className="overflow-hidden rounded-xl border border-line transition-colors hover:border-accent/50"
          >
            <img
              src={image.thumb}
              alt={image.alt || "Post image"}
              loading="lazy"
              className="h-full max-h-[420px] w-full object-cover"
            />
          </button>
        ))}
      </div>
    )}

    {post.external && (
      <a
        href={post.external.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-xl border border-line bg-raise px-4 py-3.5 transition-colors hover:border-accent"
      >
        <span className="block truncate font-display text-[15.5px] font-medium text-ink">
          {post.external.title || post.external.uri}
        </span>
        {post.external.description && (
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-ink-3">
            {post.external.description}
          </span>
        )}
        {hostnameOf(post.external.uri) && (
          <span className="mt-1.5 block truncate font-mono text-[10.5px] text-ink-3">
            {hostnameOf(post.external.uri)}
          </span>
        )}
      </a>
    )}

    {/* Engagement — flush with the avatar/text edge */}
    <footer className="mt-4 flex items-center gap-6 font-mono text-[13px] text-ink-3">
      <Stat icon={<LikeIcon />} count={post.likeCount} />
      <Stat icon={<RepostIcon />} count={post.repostCount} />
      <Stat icon={<ReplyIcon />} count={post.replyCount} />
    </footer>
  </article>
);

const PostsPage = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const requested = useRef(false);

  const loadPage = useCallback(async (pageCursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchAuthorPosts(OWNER_HANDLE, pageCursor);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.cid));
        return [...prev, ...page.posts.filter((p) => !seen.has(p.cid))];
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
          <PostCard key={post.cid} post={post} onImageClick={setLightbox} />
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

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Full size"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PostsPage;
