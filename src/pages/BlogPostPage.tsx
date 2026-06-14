import { ChevronLeft, Clock3, Edit3, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { useAuth } from "../auth/AuthContext";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { useDialog } from "../components/DialogProvider";
import { useToast } from "../components/Toast";
import {
  deleteBlogEntry,
  getBlogEntry,
  readingTimeLabel,
  whtwndUrl,
  type BlogEntry,
} from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";

const BlogPostView = ({ rkey }: { rkey: string }) => {
  const [entry, setEntry] = useState<BlogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { agent, status, devMode, setEditingBlog } = useAuth();
  const { confirm } = useDialog();
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = status === "signed-in";

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete this blog post?",
      description: "This permanently removes it from WhiteWind and your site. This can't be undone.",
      confirmLabel: "Delete post",
      danger: true,
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await deleteBlogEntry(agent, rkey, devMode);
      toast.success("Blog deleted");
      navigate("/blog");
    } catch (err) {
      toast.error("Couldn't delete post", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;
    getBlogEntry(rkey, isAdmin)
      .then((result) => {
        if (!cancelled) setEntry(result);
      })
      .catch(() => {
        if (!cancelled) setError("Post not found.");
      });
    return () => {
      cancelled = true;
    };
  }, [rkey, status, isAdmin]);

  if (error) return <ErrorMessage message={error} />;
  if (!entry) return <Loader label="Loading post…" />;

  return (
    <article>
      <Link
        to="/blog"
        className="mb-8 inline-flex items-center gap-1 font-mono text-[12.5px] text-ink-3 transition-colors hover:text-accent"
      >
        <ChevronLeft size={14} /> All blogs
      </Link>

      {entry.ogp?.url && (
        <div className="mb-9 overflow-hidden rounded-[10px] border border-line">
          <img
            src={entry.ogp.url}
            alt={entry.title}
            className="max-h-[380px] w-full object-cover"
          />
        </div>
      )}

      <h1 className="font-display text-[34px] leading-[1.15] font-medium tracking-[-0.01em] text-balance text-ink sm:text-[40px]">
        {entry.title}
      </h1>
      <div className="mt-3 mb-10 flex items-center justify-between gap-3 font-mono text-[12px] text-ink-3">
        <div className="flex flex-wrap items-center gap-4">
          {entry.createdAt && (
            <time>
              {new Date(entry.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock3 size={12} />
            {readingTimeLabel(entry.content)}
          </span>
          <a
            href={whtwndUrl(OWNER_HANDLE, entry.rkey)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-accent"
          >
            WhiteWind <ExternalLink size={11} />
          </a>
          {entry.isDraft && (
            <span className="rounded-full border border-accent/30 px-2 py-0.5 text-[9px] tracking-[0.14em] text-accent uppercase">
              Draft
            </span>
          )}
          {entry.visibility && entry.visibility !== "public" && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[9px] tracking-[0.14em] text-ink-3 uppercase">
              {entry.visibility}
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingBlog(entry)}
              className="inline-flex items-center gap-1 text-xs text-ink-3 transition-colors hover:text-accent"
              title="Edit post"
            >
              <Edit3 size={12} />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 text-xs text-red-500 transition-colors hover:text-red-400 disabled:opacity-50"
              title="Delete post"
            >
              <Trash2 size={12} />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      <div className="prose blog-prose max-w-none prose-img:rounded-lg prose-img:border prose-img:border-line">
        <Markdown remarkPlugins={[remarkGfm]}>{entry.content}</Markdown>
      </div>
    </article>
  );
};

const BlogPostPage = ({ rkey: rkeyOverride }: { rkey?: string } = {}) => {
  const { rkey: routeRkey } = useParams<{ rkey: string }>();
  const rkey = rkeyOverride ?? routeRkey;
  if (!rkey) return <ErrorMessage message="Post not found." />;
  // key resets the view's state when navigating between posts
  return <BlogPostView key={rkey} rkey={rkey} />;
};

export default BlogPostPage;
