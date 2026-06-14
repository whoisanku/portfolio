import { ArrowUpRight, Clock3, Edit3, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { useDialog } from "../components/DialogProvider";
import { useToast } from "../components/Toast";
import {
  deleteBlogEntry,
  excerpt,
  listBlogEntries,
  readingTimeLabel,
  type BlogEntry,
} from "../lib/blog";

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

const Badge = ({ children, accent = false }: { children: ReactNode; accent?: boolean }) => (
  <span
    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase ${
      accent ? "border-accent/30 text-accent" : "border-line text-ink-3"
    }`}
  >
    {children}
  </span>
);

const BlogMeta = ({ entry }: { entry: BlogEntry }) => (
  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3">
    {entry.createdAt && <time>{formatDate(entry.createdAt)}</time>}
    <span className="inline-flex items-center gap-1">
      <Clock3 size={11} />
      {readingTimeLabel(entry.content)}
    </span>
    {entry.visibility && entry.visibility !== "public" && <Badge>{entry.visibility}</Badge>}
  </div>
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
  <div className="flex shrink-0 items-center gap-1">
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(entry);
      }}
      className="rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-raise hover:text-accent"
      title="Edit post"
      aria-label={`Edit ${entry.title}`}
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
      aria-label={`Delete ${entry.title}`}
    >
      <Trash2 size={14} />
    </button>
  </div>
);

const BlogListPage = () => {
  const [entries, setEntries] = useState<BlogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { agent, status, devMode, setEditingBlog } = useAuth();
  const { confirm } = useDialog();
  const toast = useToast();
  const [deletingRkey, setDeletingRkey] = useState<string | null>(null);

  const isAdmin = status === "signed-in";

  const handleDelete = async (rkey: string) => {
    const ok = await confirm({
      title: "Delete this blog post?",
      description: "This permanently removes it from WhiteWind and your site. This can't be undone.",
      confirmLabel: "Delete post",
      danger: true,
    });
    if (!ok) return;
    setDeletingRkey(rkey);
    try {
      await deleteBlogEntry(agent, rkey, devMode);
      setEntries((prev) => (prev ? prev.filter((e) => e.rkey !== rkey) : null));
      toast.success("Blog deleted");
    } catch (err) {
      toast.error("Couldn't delete post", {
        description: err instanceof Error ? err.message : undefined,
      });
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
  if (!entries) return <Loader label="Loading blogs..." />;

  const drafts = entries.filter((e) => e.isDraft);
  const publicEntries = entries.filter((e) => !e.isDraft);

  if (drafts.length === 0 && publicEntries.length === 0) {
    return (
      <div className="section-label">
        <span>No blogs yet</span>
      </div>
    );
  }


  return (
    <div className="space-y-10">
      {isAdmin && drafts.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-mono text-[11px] tracking-[0.16em] text-accent uppercase">
              Drafts ({drafts.length})
            </h2>
          </div>
          <ul className="flex flex-col gap-2">
            {drafts.map((draft) => {
              const cover = getCoverUrl(draft);
              return (
                <li key={draft.rkey}>
                  <Link
                    to={`/blog/${draft.rkey}`}
                    className="group flex min-w-0 max-w-full gap-4 rounded-[8px] border border-dashed border-line bg-raise/45 p-3 transition-colors duration-200 hover:border-accent hover:bg-raise"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Badge accent>Draft</Badge>
                          <BlogMeta entry={draft} />
                        </div>
                        <AdminRowActions
                          entry={draft}
                          deleting={deletingRkey === draft.rkey}
                          onEdit={setEditingBlog}
                          onDelete={handleDelete}
                        />
                      </div>
                      <h3 className="mt-2 line-clamp-1 font-display text-[18px] font-medium leading-snug text-ink transition-colors group-hover:text-accent">
                        {draft.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-3">
                        {excerpt(draft.content, 130)}
                      </p>
                    </div>

                    {cover && (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-line md:h-[72px] md:w-[72px]">
                        <img src={cover} alt={draft.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {publicEntries.length > 0 && (
        <section className="flex flex-col">
          {publicEntries.map((entry) => {
            const cover = getCoverUrl(entry);
            return (
              <Link
                key={entry.rkey}
                to={`/blog/${entry.rkey}`}
                className="project-row group"
              >
                <div className="project-row-text">
                  <div className="flex items-center justify-between gap-3">
                    <BlogMeta entry={entry} />
                    {isAdmin && (
                      <AdminRowActions
                        entry={entry}
                        deleting={deletingRkey === entry.rkey}
                        onEdit={setEditingBlog}
                        onDelete={handleDelete}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="line-clamp-1 font-display text-[22px] leading-[1.2] font-medium transition-colors duration-200 group-hover:text-accent">
                      {entry.title}
                    </h2>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-ink-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100"
                    />
                  </div>
                  <p className="line-clamp-2 text-pretty text-[13.5px] leading-[1.55] text-ink-2">
                    {excerpt(entry.content, 145)}
                  </p>
                </div>

                {cover && (
                  <div className="project-row-screenshot">
                    <img
                      src={cover}
                      alt={entry.title}
                      className="project-row-screenshot-img transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default BlogListPage;
