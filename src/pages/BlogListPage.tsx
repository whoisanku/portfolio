import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { useDialog } from "../components/DialogProvider";
import { useToast } from "../components/Toast";
import { deleteBlogEntry, listBlogEntries, type BlogEntry } from "../lib/blog";

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const Badge = ({ children, accent = false }: { children: ReactNode; accent?: boolean }) => (
  <span
    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase ${
      accent ? "border-accent/30 text-accent" : "border-line text-ink-3"
    }`}
  >
    {children}
  </span>
);

/**
 * Edit/delete live inside the row's <Link>, so both handlers stop the click
 * from navigating. On pointer devices they stay hidden until the row is
 * hovered or focused; touch devices have no hover, so there they're always on.
 */
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
  <div className="flex shrink-0 items-center gap-0.5 transition-opacity duration-200 fine:opacity-0 fine:group-hover:opacity-100 fine:group-focus-within:opacity-100">
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

/**
 * Title on the left, date on the right. The cover lives in the post itself and
 * in the link preview, so the index stays a plain reading list.
 */
const Row = ({
  entry,
  draft = false,
  isAdmin,
  deleting,
  onEdit,
  onDelete,
}: {
  entry: BlogEntry;
  draft?: boolean;
  isAdmin: boolean;
  deleting: boolean;
  onEdit: (entry: BlogEntry) => void;
  onDelete: (rkey: string) => void;
}) => (
  <li>
    <Link
      to={`/blog/${entry.rkey}`}
      className="group flex items-baseline justify-between gap-6 py-5"
    >
      <h2 className="min-w-0 truncate font-display text-[22px] leading-[1.25] font-medium text-ink transition-colors duration-200 group-hover:text-accent">
        {entry.title}
      </h2>
      <div className="flex shrink-0 items-center gap-2.5">
        {draft && <Badge accent>Draft</Badge>}
        {!draft && entry.visibility && entry.visibility !== "public" && (
          <Badge>{entry.visibility}</Badge>
        )}
        {isAdmin && (
          <AdminRowActions
            entry={entry}
            deleting={deleting}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        {entry.createdAt && (
          <time className="font-mono text-[11px] whitespace-nowrap text-ink-3">
            {formatDate(entry.createdAt)}
          </time>
        )}
      </div>
    </Link>
  </li>
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

  const rowProps = {
    isAdmin,
    onEdit: setEditingBlog,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-10">
      {isAdmin && drafts.length > 0 && (
        <section>
          <h2 className="font-mono text-[11px] tracking-[0.16em] text-accent uppercase">
            Drafts ({drafts.length})
          </h2>
          <ul className="flex flex-col">
            {drafts.map((entry) => (
              <Row
                key={entry.rkey}
                entry={entry}
                draft
                deleting={deletingRkey === entry.rkey}
                {...rowProps}
              />
            ))}
          </ul>
        </section>
      )}

      {publicEntries.length > 0 && (
        <section>
          <ul className="flex flex-col">
            {publicEntries.map((entry) => (
              <Row
                key={entry.rkey}
                entry={entry}
                deleting={deletingRkey === entry.rkey}
                {...rowProps}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default BlogListPage;
