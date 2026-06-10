import { ExternalLink, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { bskyPostUrl } from "../lib/atproto";
import { OWNER_HANDLE } from "../lib/config";
import { fetchAuthorPosts, type FeedPost } from "../lib/feed";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const PostCard = ({
  post,
  onImageClick,
}: {
  post: FeedPost;
  onImageClick: (src: string) => void;
}) => (
  <article className="border-b border-line py-7 first:border-t">
    <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
      {post.text}
    </p>

    {post.images.length > 0 && (
      <div
        className={`mt-4 grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {post.images.map((image) => (
          <button
            key={image.fullsize}
            type="button"
            onClick={() => onImageClick(image.fullsize)}
            className="overflow-hidden rounded-lg border border-line"
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
    )}

    {post.external && (
      <a
        href={post.external.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-lg border border-line bg-raise p-3.5 transition-colors hover:border-accent"
      >
        <span className="block truncate font-display text-[15px] font-medium text-ink">
          {post.external.title || post.external.uri}
        </span>
        {post.external.description && (
          <span className="mt-1 line-clamp-2 block text-xs text-ink-3">
            {post.external.description}
          </span>
        )}
      </a>
    )}

    <footer className="mt-5 flex items-center gap-5 font-mono text-[11.5px] text-ink-3">
      <time>{formatDate(post.createdAt)}</time>
      <span className="inline-flex items-center gap-1.5">
        <Heart size={12} /> {post.likeCount}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Repeat2 size={13} /> {post.repostCount}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <MessageCircle size={12} /> {post.replyCount}
      </span>
      <a
        href={bskyPostUrl(OWNER_HANDLE, post.uri)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open on Bluesky"
        className="ml-auto transition-colors hover:text-accent"
      >
        <ExternalLink size={12} />
      </a>
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
      <div className="section-label mb-9">
        <span>Posts</span>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="flex flex-col">
        {posts.map((post) => (
          <PostCard key={post.cid} post={post} onImageClick={setLightbox} />
        ))}
      </div>

      {loading && <Loader label="Loading posts…" />}

      {!loading && cursor && (
        <div className="mt-8 flex justify-center">
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
        <p className="mt-10 text-center font-mono text-[11px] text-ink-3">
          You’ve reached the end.
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
