import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * "‹ All blogs" above a post. Rendered outside the post's loading states
 * (by the page and by the route fallback alike), so it's a real link from
 * the first frame instead of a placeholder that pulses on every visit.
 */
const BlogBackLink = () => (
  <Link
    to="/blog"
    className="mb-8 inline-flex items-center gap-1 font-mono text-[12.5px] text-ink-3 transition-colors hover:text-accent"
  >
    <ChevronLeft size={14} /> All blogs
  </Link>
);

export default BlogBackLink;
