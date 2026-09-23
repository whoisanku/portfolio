/**
 * Loading placeholders shaped like the content they stand in for, so the
 * page keeps its layout while data loads and nothing jumps when it lands.
 * Screen readers get a single "Loading…" status instead of the shapes.
 */
const Bar = ({ className, width }: { className: string; width?: string }) => (
  <div className={`skeleton rounded-md ${className}`} style={width ? { width } : undefined} />
);

const Status = ({ label }: { label: string }) => <span className="sr-only">{label}</span>;

/** Blog index: featured cover + title, then a few rows. */
export const BlogListSkeleton = () => (
  <div className="space-y-16" role="status" aria-busy="true">
    <Status label="Loading blogs…" />
    <section aria-hidden="true">
      <Bar className="mb-5 h-3 w-16" />
      <div className="skeleton mb-5 aspect-video rounded-[12px]" />
      <Bar className="h-3 w-40" />
      <Bar className="mt-3.5 h-8 w-4/5" />
      <Bar className="mt-4 h-4 w-full" />
      <Bar className="mt-2 h-4 w-2/3" />
    </section>
    <section aria-hidden="true">
      <Bar className="mb-4 h-3 w-28" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 border-t border-line py-5 sm:gap-6">
          <div className="flex flex-1 flex-col gap-2">
            <Bar className="h-5 w-3/4" />
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3 w-32" />
          </div>
          <div className="skeleton h-[60px] w-[84px] shrink-0 rounded-[8px] sm:h-[76px] sm:w-[112px]" />
        </div>
      ))}
    </section>
  </div>
);

/** A single post: back link, title, meta line, paragraphs. */
export const BlogPostSkeleton = () => (
  <div role="status" aria-busy="true">
    <Status label="Loading post…" />
    <div aria-hidden="true">
      <Bar className="mb-8 h-3.5 w-20" />
      <Bar className="h-10 w-11/12" />
      <Bar className="mt-3 h-10 w-2/3" />
      <Bar className="mt-5 mb-10 h-3.5 w-56" />
      {[100, 96, 88, 100, 72].map((w, i) => (
        <Bar key={i} className="mt-3 h-4" width={`${w}%`} />
      ))}
    </div>
  </div>
);

/** Posts feed: date rule, two lines of text, a stat row. */
export const PostCardSkeleton = ({ withMedia = false }: { withMedia?: boolean }) => (
  <div className="py-7 first:pt-1" aria-hidden="true">
    <div className="flex items-center gap-3">
      <Bar className="h-3 w-14" />
      <span className="wavy-rule flex-1" />
    </div>
    <Bar className="mt-4 h-4 w-full" />
    <Bar className="mt-2 h-4 w-3/5" />
    {withMedia && <div className="skeleton mt-4 h-[220px] rounded-xl" />}
    <div className="mt-4 flex gap-6">
      <Bar className="h-3.5 w-8" />
      <Bar className="h-3.5 w-8" />
      <Bar className="h-3.5 w-8" />
    </div>
  </div>
);

export const PostsFeedSkeleton = ({ count = 3 }: { count?: number }) => (
  <div role="status" aria-busy="true">
    <Status label="Loading posts…" />
    {Array.from({ length: count }, (_, i) => (
      <PostCardSkeleton key={i} withMedia={i === 1} />
    ))}
  </div>
);
