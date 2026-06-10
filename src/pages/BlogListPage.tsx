import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { excerpt, listBlogEntries, type BlogEntry } from "../lib/blog";

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const BlogListPage = () => {
  const [entries, setEntries] = useState<BlogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBlogEntries()
      .then(setEntries)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load blogs"),
      );
  }, []);

  if (error) return <ErrorMessage message={error} />;
  if (!entries) return <Loader label="Loading blogs…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-center text-2xl font-medium text-white">Blogs</h1>
      {entries.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">No blog posts yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.rkey}>
              <Link
                to={`/blog/${entry.rkey}`}
                className="group block rounded-lg px-4 py-4 transition-colors hover:bg-zinc-900/80"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-medium text-zinc-100 group-hover:text-blue-400">
                    {entry.title}
                  </h2>
                  <time className="shrink-0 text-xs text-zinc-500">
                    {formatDate(entry.createdAt)}
                  </time>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500">
                  {excerpt(entry.content)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BlogListPage;
