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
  <article className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 backdrop-blur-sm">
    <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-zinc-200">
      {post.text}
    </p>

    {post.images.length > 0 && (
      <div
        className={`mt-3 grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {post.images.map((image) => (
          <button
            key={image.fullsize}
            type="button"
            onClick={() => onImageClick(image.fullsize)}
            className="overflow-hidden rounded-md border border-zinc-800"
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
        className="mt-3 block rounded-md border border-zinc-800 p-3 transition-colors hover:border-blue-500/50"
      >
        <span className="block truncate text-sm font-medium text-zinc-200">
          {post.external.title || post.external.uri}
        </span>
        {post.external.description && (
          <span className="mt-1 line-clamp-2 block text-xs text-zinc-500">
            {post.external.description}
          </span>
        )}
      </a>
    )}

    <footer className="mt-4 flex items-center gap-5 text-xs text-zinc-500">
      <time>{formatDate(post.createdAt)}</time>
      <span className="inline-flex items-center gap-1">
        <Heart size={13} /> {post.likeCount}
      </span>
      <span className="inline-flex items-center gap-1">
        <Repeat2 size={14} /> {post.repostCount}
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageCircle size={13} /> {post.replyCount}
      </span>
      <a
        href={bskyPostUrl(OWNER_HANDLE, post.uri)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open on Bluesky"
        className="ml-auto transition-colors hover:text-blue-400"
      >
        <ExternalLink size={13} />
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
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-center text-2xl font-medium text-white">Posts</h1>

      {error && <ErrorMessage message={error} />}

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.cid} post={post} onImageClick={setLightbox} />
        ))}
      </div>

      {loading && <Loader label="Loading posts…" />}

      {!loading && cursor && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => loadPage(cursor)}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-blue-500/60 hover:text-blue-400"
          >
            Load more
          </button>
        </div>
      )}

      {!loading && !cursor && posts.length > 0 && (
        <p className="mt-8 text-center text-xs text-zinc-600">
          You’ve reached the end.
        </p>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
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
