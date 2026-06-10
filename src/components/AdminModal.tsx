import { LogOut, Maximize2, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import BlogEditor from "./BlogEditor";
import PostComposer from "./PostComposer";

type Tab = "post" | "blog";

interface Published {
  kind: Tab;
  url: string;
  internalUrl?: string;
}

const AdminModal = () => {
  const { agent, modalOpen, closeModal, signOut, devMode, editingBlog, setEditingBlog } = useAuth();
  const [selectedTab, setSelectedTab] = useState<Tab>("post");
  // Editing a blog always forces the blog tab (modal opening is handled by setEditingBlog).
  const tab: Tab = editingBlog ? "blog" : selectedTab;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<Published | null>(null);

  const handleClose = useCallback(() => {
    setEditingBlog(null);
    closeModal();
  }, [closeModal, setEditingBlog]);

  // Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          handleClose();
        }
      }
    },
    [handleClose, isFullscreen],
  );

  useEffect(() => {
    if (modalOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [modalOpen, handleKeyDown]);

  if (!modalOpen) return null;
  if (!agent && !devMode) return null;

  const handlePostPublished = (url: string) => {
    setPublished({ kind: "post", url });
    setError(null);
  };

  const handleBlogPublished = (urls: { whitewind: string; internal: string }) => {
    setPublished({
      kind: "blog",
      url: urls.whitewind,
      internalUrl: urls.internal,
    });
    setError(null);
  };

  const handleError = (msg: string) => {
    setError(msg);
    setPublished(null);
  };

  const modal = (
    <div className="admin-modal-overlay" onClick={handleClose}>
      <div
        className={`admin-modal-content ${isFullscreen ? "admin-modal-fullscreen" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line px-5 py-2.5">
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex gap-1 rounded-lg border border-line p-0.5 bg-raise">
              {(["post", "blog"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedTab(t);
                    if (t === "post" && editingBlog) setEditingBlog(null);
                    setError(null);
                    setPublished(null);
                  }}
                  className={`rounded-md px-3.5 py-1 text-xs font-medium capitalize transition-all ${
                    tab === t
                      ? "bg-paper text-accent shadow-sm"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {devMode && (
              <span className="rounded-md border border-accent/30 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
                Dev Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Sign out */}
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-ink-3 transition-colors hover:bg-raise hover:text-red-500"
              title="Sign out"
            >
              <LogOut size={14} /> Sign out
            </button>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="rounded-lg p-2 text-ink-3 transition-colors hover:bg-raise hover:text-ink"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 size={16} />
              ) : (
                <Maximize2 size={16} />
              )}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-ink-3 transition-colors hover:bg-raise hover:text-ink"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>



        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "post" ? (
            <PostComposer
              agent={agent}
              devMode={devMode}
              onPublished={handlePostPublished}
              onError={handleError}
            />
          ) : (
            <BlogEditor
              key={editingBlog?.rkey ?? "new"}
              agent={agent}
              devMode={devMode}
              onPublished={handleBlogPublished}
              onError={handleError}
              isFullscreen={isFullscreen}
            />
          )}

          {/* Error */}
          {error && (
            <p className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Success */}
          {published && (
            <p className="mt-4 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              Published!{" "}
              <a
                href={published.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on{" "}
                {published.kind === "post" ? "Bluesky" : "WhiteWind"}
              </a>
              {published.internalUrl && (
                <>
                  {" · "}
                  <Link
                    to={published.internalUrl}
                    className="underline"
                    onClick={handleClose}
                  >
                    View on this site
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default AdminModal;
