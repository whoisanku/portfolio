import { ChevronLeft, ExternalLink, Trash2, Edit3 } from "lucide-react";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { Link, useParams, useNavigate } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { getBlogEntry, whtwndUrl, deleteBlogEntry, type BlogEntry } from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";
import { useAuth } from "../auth/AuthContext";

const BlogPostView = ({ rkey }: { rkey: string }) => {
  const [entry, setEntry] = useState<BlogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { agent, status, devMode, setEditingBlog } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = status === "signed-in";

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    setIsDeleting(true);
    try {
      await deleteBlogEntry(agent, rkey, devMode);
      navigate("/blog");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
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
    <article className="mx-auto max-w-2xl">
      <Link
        to="/blog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-blue-400"
      >
        <ChevronLeft size={16} /> All blogs
      </Link>

      {entry.ogp?.url && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <img
            src={entry.ogp.url}
            alt={entry.title}
            className="w-full object-cover max-h-[380px]"
          />
        </div>
      )}

      <h1 className="text-3xl font-semibold text-white">{entry.title}</h1>
      <div className="mt-2 mb-8 flex items-center justify-between gap-3 text-sm text-zinc-500">
        <div className="flex items-center gap-3 flex-wrap">
          {entry.createdAt && (
            <time>
              {new Date(entry.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
          <a
            href={whtwndUrl(OWNER_HANDLE, entry.rkey)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-blue-400"
          >
            WhiteWind <ExternalLink size={12} />
          </a>
          {entry.isDraft && (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400 border border-amber-500/20">
              Draft
            </span>
          )}
          {entry.visibility && entry.visibility !== "public" && (
            <span className="rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border border-zinc-500/20">
              {entry.visibility}
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditingBlog(entry)}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-blue-400 transition-colors"
              title="Edit post"
            >
              <Edit3 size={12} />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Delete post"
            >
              <Trash2 size={12} />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      <div className="prose prose-invert prose-zinc max-w-none prose-a:text-blue-400 prose-img:rounded-lg">
        <Markdown>{entry.content}</Markdown>
      </div>
    </article>
  );
};

const BlogPostPage = () => {
  const { rkey } = useParams<{ rkey: string }>();
  if (!rkey) return <ErrorMessage message="Post not found." />;
  // key resets the view's state when navigating between posts
  return <BlogPostView key={rkey} rkey={rkey} />;
};

export default BlogPostPage;
