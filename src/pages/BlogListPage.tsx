import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { deleteBlogEntry, excerpt, listBlogEntries, type BlogEntry } from "../lib/blog";

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

const Badge = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
  <span
    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase ${
      accent ? "border-accent/30 text-accent" : "border-line text-ink-3"
    }`}
  >
    {children}
  </span>
);

const AdminRowActions = ({
  entry,
  deleting,
  onEdit,
  onDelete,
}: {
  entry: BlogEntry;
  deleting: boolean;
  onEdit: (entry: BlogEntry) => void;
  onDelete: (rkey: string) => void;
}) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(entry);
      }}
      className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-raise hover:text-accent"
      title="Edit post"
    >
      <Edit3 size={14} />
    </button>
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(entry.rkey);
      }}
      disabled={deleting}
      className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-raise hover:text-red-500 disabled:opacity-50"
      title="Delete post"
    >
      <Trash2 size={14} />
    </button>
  </div>
);

const BlogListPage = () => {
  const [entries, setEntries] = useState<BlogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { agent, status, devMode, setEditingBlog } = useAuth();
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
    if (status === "loading") return;

    listBlogEntries(isAdmin)
      .then(setEntries)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load blogs"),
      );
  }, [status, isAdmin]);

  if (error) return <ErrorMessage message={error} />;
  if (!entries) return <Loader label="Loading blogs…" />;

  const drafts = entries.filter((e) => e.isDraft);
  const publicEntries = entries.filter((e) => !e.isDraft);

  if (drafts.length === 0 && publicEntries.length === 0) {
    return (
      <div>
        <div className="section-label mb-9">
          <span>Blog</span>
        </div>
        <p className="py-10 text-center font-mono text-xs text-ink-3">
          No blog posts yet.
        </p>
      </div>
    );
  }

  const hasPublic = publicEntries.length > 0;
  const featured = hasPublic ? publicEntries[0] : null;
  const featuredCover = featured ? getCoverUrl(featured) : undefined;
  const others = hasPublic ? publicEntries.slice(1) : [];

  return (
    <div>
      <div className="section-label mb-9">
        <span>Blog</span>
      </div>

      {/* Drafts (admin only) */}
      {isAdmin && drafts.length > 0 && (
        <div className="mb-12">
          <div className="section-label mb-5">
            <span className="!text-accent">Drafts ({drafts.length})</span>
          </div>
          <ul className="flex flex-col gap-3">
            {drafts.map((draft) => {
              const cover = getCoverUrl(draft);
              return (
                <li key={draft.rkey}>
                  <Link
                    to={`/blog/${draft.rkey}`}
                    className="group flex gap-5 rounded-[10px] border border-dashed border-line bg-raise/60 p-4 transition-colors duration-200 hover:border-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <time className="font-mono text-[11px] text-ink-3">
                            {formatDate(draft.createdAt)}
                          </time>
                          <Badge accent>Draft</Badge>
                          {draft.visibility && draft.visibility !== "public" && (
                            <Badge>{draft.visibility}</Badge>
                          )}
                        </div>
                        <AdminRowActions
                          entry={draft}
                          deleting={deletingRkey === draft.rkey}
                          onEdit={setEditingBlog}
                          onDelete={handleDelete}
                        />
                      </div>
                      <h4 className="mt-1.5 line-clamp-1 font-display text-[18px] font-medium text-ink transition-colors group-hover:text-accent">
                        {draft.title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-3">
                        {excerpt(draft.content, 140)}
                      </p>
                    </div>

                    {cover && (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line md:h-20 md:w-20">
                        <img
                          src={cover}
                          alt={draft.title}
                          className="h-full w-full object-cover"
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

      {/* Featured (latest) post */}
      {featured && (
        <div className="mb-12">
          <Link
            to={`/blog/${featured.rkey}`}
            className="group block overflow-hidden rounded-[10px] border border-line bg-raise transition-colors duration-200 hover:border-accent"
          >
            {featuredCover && (
              <div className="aspect-[16/9] w-full overflow-hidden border-b border-line">
                <img
                  src={featuredCover}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge accent>Latest</Badge>
                  {featured.visibility && featured.visibility !== "public" && (
                    <Badge>{featured.visibility}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <time className="font-mono text-[11px] text-ink-3">
                    {formatDate(featured.createdAt)}
                  </time>
                  {isAdmin && (
                    <AdminRowActions
                      entry={featured}
                      deleting={deletingRkey === featured.rkey}
                      onEdit={setEditingBlog}
                      onDelete={handleDelete}
                    />
                  )}
                </div>
              </div>
              <h2 className="mt-3 font-display text-[26px] leading-[1.2] font-medium text-ink transition-colors group-hover:text-accent">
                {featured.title}
              </h2>
              <p className="mt-2.5 line-clamp-3 text-[14px] leading-relaxed text-ink-2">
                {excerpt(featured.content, 240)}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Other posts — editorial rows */}
      {others.length > 0 && (
        <div className="flex flex-col">
          {others.map((entry) => {
            const cover = getCoverUrl(entry);
            return (
              <Link
                key={entry.rkey}
                to={`/blog/${entry.rkey}`}
                className="group flex gap-5 border-b border-line py-6 first:border-t"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="font-mono text-[11px] text-ink-3">
                        {formatDate(entry.createdAt)}
                      </time>
                      {entry.visibility && entry.visibility !== "public" && (
                        <Badge>{entry.visibility}</Badge>
                      )}
                    </div>
                    {isAdmin && (
                      <AdminRowActions
                        entry={entry}
                        deleting={deletingRkey === entry.rkey}
                        onEdit={setEditingBlog}
                        onDelete={handleDelete}
                      />
                    )}
                  </div>
                  <h4 className="mt-1.5 line-clamp-1 font-display text-[20px] font-medium text-ink transition-colors group-hover:text-accent">
                    {entry.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-3">
                    {excerpt(entry.content, 140)}
                  </p>
                </div>

                {cover && (
                  <div className="h-16 w-16 shrink-0 self-center overflow-hidden rounded-lg border border-line md:h-20 md:w-20">
                    <img
                      src={cover}
                      alt={entry.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlogListPage;
