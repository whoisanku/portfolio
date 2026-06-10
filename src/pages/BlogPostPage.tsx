import { ChevronLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { getBlogEntry, whtwndUrl, type BlogEntry } from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";

const BlogPostView = ({ rkey }: { rkey: string }) => {
  const [entry, setEntry] = useState<BlogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBlogEntry(rkey)
      .then((result) => {
        if (!cancelled) setEntry(result);
      })
      .catch(() => {
        if (!cancelled) setError("Post not found.");
      });
    return () => {
      cancelled = true;
    };
  }, [rkey]);

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

      <h1 className="text-3xl font-semibold text-white">{entry.title}</h1>
      <div className="mt-2 mb-8 flex items-center gap-3 text-sm text-zinc-500">
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
