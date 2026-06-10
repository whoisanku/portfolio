import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { useAuth } from "../auth/AuthContext";
import { excerpt, listBlogEntries, deleteBlogEntry, type BlogEntry } from "../lib/blog";

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

function getCoverUrl(entry: BlogEntry): string | undefined {
  if (entry.ogp?.url) return entry.ogp.url;
  const match = entry.content.match(/!\[.*?\]\((.*?)\)/);
  return match ? match[1] : undefined;
}

const BlogListPage = () => {
  const [entries, setEntries] = useState<BlogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { agent, status, devMode } = useAuth();
  const [deletingRkey, setDeletingRkey] = useState<string | null>(null);

  const isAdmin = status === "signed-in";

  const handleDelete = async (rkey: string) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    setDeletingRkey(rkey);
    try {
      await deleteBlogEntry(agent, rkey, devMode);
      setEntries((prev) => (prev ? prev.filter((e) => e.rkey !== rkey) : null));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeletingRkey(null);
    }
  };

  useEffect(() => {
    listBlogEntries()
      .then(setEntries)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load blogs"),
      );
  }, []);

  if (error) return <ErrorMessage message={error} />;
  if (!entries) return <Loader label="Loading blogs…" />;

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="mb-6 text-2xl font-medium text-white">Blogs</h1>
        <p className="text-sm text-zinc-500">No blog posts yet.</p>
      </div>
    );
  }

  const featured = entries[0];
  const featuredCover = getCoverUrl(featured);
  const others = entries.slice(1);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-white">
        Blogs
      </h1>

      {/* Featured Blog Post Card */}
      <div className="mb-10">
        <Link
          to={`/blog/${featured.rkey}`}
          className="group block overflow-hidden rounded-2xl border border-zinc-800/85 bg-zinc-950/40 p-1.5 transition-all duration-300 hover:border-zinc-700/60 hover:bg-zinc-900/30 hover:shadow-lg hover:shadow-blue-500/5"
        >
          {featuredCover && (
            <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-zinc-900">
              <img
                src={featuredCover}
                alt={featured.title}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                Latest Post
              </span>
              <div className="flex items-center gap-3">
                <time className="text-xs text-zinc-500">
                  {formatDate(featured.createdAt)}
                </time>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(featured.rkey);
                    }}
                    disabled={deletingRkey === featured.rkey}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete post"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <h2 className="mt-3 text-xl font-bold text-zinc-100 transition-colors group-hover:text-blue-400 md:text-2xl">
              {featured.title}
            </h2>
            <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-zinc-400">
              {excerpt(featured.content, 240)}
            </p>
          </div>
        </Link>
      </div>

      {/* Other Blog Posts List */}
      {others.length > 0 && (
        <div className="space-y-4">
          <h3 className="border-b border-zinc-800 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            More Articles
          </h3>
          <ul className="flex flex-col gap-2.5">
            {others.map((entry) => {
              const cover = getCoverUrl(entry);
              return (
                <li key={entry.rkey}>
                  <Link
                    to={`/blog/${entry.rkey}`}
                    className="group flex gap-5 rounded-2xl border border-transparent p-4 transition-all duration-300 hover:border-zinc-800/80 hover:bg-zinc-900/40 hover:shadow-md"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <time className="text-xs text-zinc-500">
                          {formatDate(entry.createdAt)}
                        </time>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(entry.rkey);
                            }}
                            disabled={deletingRkey === entry.rkey}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Delete post"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <h4 className="mt-1.5 text-base font-semibold text-zinc-100 transition-colors group-hover:text-blue-400 line-clamp-1">
                        {entry.title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                        {excerpt(entry.content, 140)}
                      </p>
                    </div>

                    {cover && (
                      <div className="h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/60">
                        <img
                          src={cover}
                          alt={entry.title}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BlogListPage;
