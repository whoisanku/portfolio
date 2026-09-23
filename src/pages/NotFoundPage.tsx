import { useEffect } from "react";
import { Link } from "react-router-dom";

/** Any path the site doesn't have. */
const NotFoundPage = () => {
  useEffect(() => {
    document.title = "Not found · Ankit Bhandari";
    return () => {
      document.title = "Ankit Bhandari";
    };
  }, []);

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="font-display text-[28px] leading-tight text-ink">Nothing here.</p>
      <p className="text-[14.5px] text-ink-2">That page doesn&rsquo;t exist, or it moved.</p>
      <Link to="/" className="font-mono text-[12.5px] text-accent hover:underline">
        ← back home
      </Link>
    </div>
  );
};

export default NotFoundPage;
