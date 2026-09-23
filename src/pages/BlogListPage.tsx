import { Edit3, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import { useDialog } from "../components/DialogProvider";
import { useToast } from "../components/Toast";
import {
  coverUrl,
  deleteBlogEntry,
  excerpt,
  listBlogEntries,
  readingTimeMinutes,
  type BlogEntry,
} from "../lib/blog";

/** Rows shown under the featured post before "Show older posts". */
const PAGE_SIZE = 8;

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

/** Local-time year, so the filter agrees with the dates the rows display. */
const yearOf = (iso?: string) => (iso ? String(new Date(iso).getFullYear()) : undefined);

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
 * Edit/delete live inside the post's <Link>, so both handlers stop the click
 * from navigating. On pointer devices they stay hidden until the post is
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

interface PostProps {
  entry: BlogEntry;
  draft?: boolean;
  isAdmin: boolean;
  deleting: boolean;
  onEdit: (entry: BlogEntry) => void;
  onDelete: (rkey: string) => void;
}

/** Date · reading time, then any status badges and the admin actions. */
const PostMeta = ({
  entry,
  draft = false,
  isAdmin,
  deleting,
  onEdit,
  onDelete,
  long = false,
}: PostProps & { long?: boolean }) => (
  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-ink-3">
    {entry.createdAt && (
      <>
        <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
        <span aria-hidden="true">·</span>
      </>
    )}
    <span>
      {readingTimeMinutes(entry.content)} min{long ? " read" : ""}
    </span>
    {draft && <Badge accent>Draft</Badge>}
    {!draft && entry.visibility && entry.visibility !== "public" && (
      <Badge>{entry.visibility}</Badge>
    )}
    {isAdmin && (
      <AdminRowActions entry={entry} deleting={deleting} onEdit={onEdit} onDelete={onDelete} />
    )}
  </div>
);

const coverImgClass =
  "h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.035]";

/** The newest post, led by its cover at full column width. */
const FeaturedPost = (props: PostProps) => {
  const { entry } = props;
  const cover = coverUrl(entry);
  const blurb = excerpt(entry.content);
  return (
    <Link to={`/blog/${entry.rkey}`} className="group block">
      {cover && (
        <div className="mb-5 aspect-video overflow-hidden rounded-[12px] border border-line bg-raise">
          <img src={cover} alt="" fetchPriority="high" decoding="async" className={coverImgClass} />
        </div>
      )}
      <PostMeta {...props} long />
      <h3 className="mt-2.5 font-display text-[28px] leading-[1.15] font-medium tracking-[-0.01em] text-balance text-ink transition-colors duration-200 group-hover:text-accent sm:text-[34px]">
        {entry.title}
      </h3>
      {blurb && (
        <p className="mt-3 text-[16px] leading-[1.6] text-pretty text-ink-2">{blurb}</p>
      )}
    </Link>
  );
};

/** Title, one-line excerpt and meta on the left; a small cover on the right. */
const PostRow = (props: PostProps) => {
  const { entry } = props;
  const cover = coverUrl(entry);
  const blurb = excerpt(entry.content);
  return (
    <li className="border-t border-line">
      <Link to={`/blog/${entry.rkey}`} className="group flex items-center gap-4 py-5 sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="font-display text-[20px] leading-[1.3] font-medium text-ink transition-colors duration-200 group-hover:text-accent">
            {entry.title}
          </h3>
          {blurb && <p className="truncate text-[14px] leading-[1.5] text-ink-2">{blurb}</p>}
          <PostMeta {...props} />
        </div>
        {cover && (
          <div className="h-[60px] w-[84px] shrink-0 overflow-hidden rounded-[8px] border border-line bg-raise sm:h-[76px] sm:w-[112px]">
            <img src={cover} alt="" loading="lazy" decoding="async" className={coverImgClass} />
          </div>
        )}
      </Link>
    </li>
  );
};

const YearFilter = ({
  years,
  value,
  onChange,
}: {
  years: string[];
  value: string | null;
  onChange: (year: string | null) => void;
}) => (
  <div role="group" aria-label="Filter by year" className="flex shrink-0 gap-1.5">
    {[null, ...years].map((year) => {
      const active = year === value;
      return (
        <button
          key={year ?? "all"}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(year)}
          className={`pressable h-8 rounded-full border px-3 font-mono text-[11.5px] ${
            active
              ? "border-ink bg-ink text-paper"
              : "border-line text-ink-2 hover:border-ink-3 hover:text-ink"
          }`}
        >
          {year ?? "All"}
        </button>
      );
    })}
  </div>
);

const BlogListPage = () => {
  const [entries, setEntries] = useState<BlogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { agent, status, devMode, setEditingBlog } = useAuth();
  const { confirm } = useDialog();
  const toast = useToast();
  const [deletingRkey, setDeletingRkey] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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
  const [featured, ...rest] = entries.filter((e) => !e.isDraft);

  if (drafts.length === 0 && !featured) {
    return (
      <div className="section-label">
        <span>No blogs yet</span>
      </div>
    );
  }

  const postProps = (entry: BlogEntry) => ({
    entry,
    isAdmin,
    deleting: deletingRkey === entry.rkey,
    onEdit: setEditingBlog,
    onDelete: handleDelete,
  });

  const years = [...new Set(rest.map((e) => yearOf(e.createdAt)).filter((y) => y !== undefined))];
  // A year that just lost its last post (deleted) falls back to showing all.
  const activeYear = year && years.includes(year) ? year : null;
  const filtered = activeYear ? rest.filter((e) => yearOf(e.createdAt) === activeYear) : rest;
  // Paging only applies to the full list; a single year is short enough to show whole.
  const visible = activeYear || showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const olderCount = filtered.length - visible.length;

  return (
    <div className="space-y-16">
      {isAdmin && drafts.length > 0 && (
        <section>
          <h2 className="mb-2 font-mono text-[11px] tracking-[0.16em] text-accent uppercase">
            Drafts ({drafts.length})
          </h2>
          <ul className="flex flex-col">
            {drafts.map((entry) => (
              <PostRow key={entry.rkey} draft {...postProps(entry)} />
            ))}
          </ul>
        </section>
      )}

      {featured && (
        <section>
          <h2 className="section-label mb-5">
            <span>Latest</span>
          </h2>
          <FeaturedPost {...postProps(featured)} />
        </section>
      )}

      {rest.length > 0 && (
        <section>
          {/* flex-auto (not flex-1) so the label keeps its width and the
              chips wrap under it on narrow screens instead of crushing it */}
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-3">
            <h2 className="section-label flex-auto">
              <span>More writing</span>
            </h2>
            {years.length > 1 && (
              <YearFilter years={years} value={activeYear} onChange={setYear} />
            )}
          </div>
          <ul className="flex flex-col">
            {visible.map((entry) => (
              <PostRow key={entry.rkey} {...postProps(entry)} />
            ))}
          </ul>
          {olderCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="pressable mt-4 h-12 w-full rounded-[10px] border border-line font-mono text-[12.5px] text-ink-2 hover:border-ink-3 hover:text-ink"
            >
              Show {olderCount} older {olderCount === 1 ? "post" : "posts"}
            </button>
          )}
        </section>
      )}
    </div>
  );
};

export default BlogListPage;
