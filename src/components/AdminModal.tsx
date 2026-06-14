import { Maximize2, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import BlogEditor, { type BlogEditorHandle } from "./BlogEditor";
import ConfirmDialog from "./ConfirmDialog";
import PostComposer from "./PostComposer";
import { useToast } from "./Toast";

type Tab = "post" | "blog";

function buildWavyPath(width: number): string {
  const amplitude = 2.2;
  const period = 8;
  const cycles = Math.max(2, Math.ceil(width / period));
  const totalWidth = cycles * period;
  const offsetX = (totalWidth - width) / 2;
  let d = `M ${-offsetX} ${amplitude}`;
  for (let i = 0; i < cycles; i++) {
    const x1 = -offsetX + i * period + period / 4;
    const x2 = -offsetX + i * period + (3 * period) / 4;
    const x3 = -offsetX + (i + 1) * period;
    d += ` C ${x1} ${-amplitude}, ${x2} ${amplitude * 3}, ${x3} ${amplitude}`;
  }
  return d;
}

const AdminModal = () => {
  const { agent, modalOpen, closeModal, devMode, editingBlog, setEditingBlog } = useAuth();
  const toast = useToast();
  const [selectedTab, setSelectedTab] = useState<Tab>("post");
  // Editing a blog always forces the blog tab (modal opening is handled by setEditingBlog).
  const tab: Tab = editingBlog ? "blog" : selectedTab;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savingDraftOnClose, setSavingDraftOnClose] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const blogEditorRef = useRef<BlogEditorHandle>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ post: null, blog: null });
  const [tabUnderline, setTabUnderline] = useState<{
    left: number;
    width: number;
    path: string;
  } | null>(null);

  useLayoutEffect(() => {
    if (!modalOpen) return;
    const activeTab = tabRefs.current[tab];
    const tabs = tabsRef.current;
    if (!activeTab || !tabs) return;

    const tabsRect = tabs.getBoundingClientRect();
    const activeRect = activeTab.getBoundingClientRect();
    const shrinkAmount = 6;
    const width = Math.max(18, activeRect.width - shrinkAmount);
    const left = activeRect.left - tabsRect.left + shrinkAmount / 2;
    setTabUnderline((prev) => ({
      left,
      width,
      path: prev && Math.abs(prev.width - width) < 1 ? prev.path : buildWavyPath(width),
    }));
  }, [modalOpen, tab]);

  const finishClose = useCallback(() => {
    setEditingBlog(null);
    setSavingDraftOnClose(false);
    setShowDraftPrompt(false);
    closeModal();
  }, [closeModal, setEditingBlog]);

  const handleClose = useCallback(() => {
    if (savingDraftOnClose || showDraftPrompt) return;

    const shouldOfferDraft =
      tab === "blog" && blogEditorRef.current?.hasUnsavedChanges();

    if (shouldOfferDraft) {
      setShowDraftPrompt(true);
      return;
    }

    finishClose();
  }, [finishClose, savingDraftOnClose, showDraftPrompt, tab]);

  const handleSaveDraftAndClose = useCallback(() => {
    if (savingDraftOnClose) return;

    void (async () => {
      setSavingDraftOnClose(true);
      try {
        await blogEditorRef.current?.saveDraft();
        finishClose();
        toast.info("Draft saved", { description: "Your work is safe." });
      } catch (err) {
        toast.error("Couldn't save draft", {
          description: err instanceof Error ? err.message : undefined,
        });
        setSavingDraftOnClose(false);
        setShowDraftPrompt(false);
      }
    })();
  }, [finishClose, savingDraftOnClose, toast]);

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

  const handlePostPublished = () => {
    finishClose();
    toast.success("Post published");
  };

  const handleBlogPublished = () => {
    finishClose();
    toast.success("Blog published");
  };

  // Publish failures keep the editor open so the draft isn't lost on retry.
  const handleError = (msg: string) => {
    toast.error("Publish failed", { description: msg });
  };

  const modal = (
    <div
      className={`admin-modal-overlay ${isFullscreen ? "is-fullscreen" : ""} ${devMode ? "is-dev-mode" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`admin-modal-content ${isFullscreen ? "admin-modal-fullscreen" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-line px-5 py-2.5">
          <div className="flex items-center gap-5">
            {/* Tabs — same editorial language as the site nav */}
            <div ref={tabsRef} className="relative flex items-center gap-5 pb-2">
              {(["post", "blog"] as const).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    ref={(el) => {
                      tabRefs.current[t] = el;
                    }}
                    type="button"
                    onClick={() => {
                      setSelectedTab(t);
                      if (t === "post" && editingBlog) setEditingBlog(null);
                    }}
                    className="group relative"
                  >
                    <span
                      className={
                        active
                          ? "font-mono text-[12.5px] text-accent"
                          : "font-mono text-[12.5px] text-ink-3 transition-colors group-hover:text-ink"
                      }
                    >
                      {t}
                    </span>
                  </button>
                );
              })}
              {tabUnderline && (
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 h-2 text-accent transition-[left,width] duration-500 ease-out"
                  style={{ left: tabUnderline.left, width: tabUnderline.width }}
                  viewBox={`0 -4 ${tabUnderline.width} 8`}
                  preserveAspectRatio="none"
                >
                  <path
                    d={tabUnderline.path}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
            </div>
            {devMode && (
              <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
                Dev Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Fullscreen toggle — desktop only; mobile is always fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden rounded-lg p-2 text-ink-3 transition-colors hover:bg-raise hover:text-ink sm:block"
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
              disabled={savingDraftOnClose}
              className="rounded-lg p-2 text-ink-3 transition-colors hover:bg-raise hover:text-ink"
              title={savingDraftOnClose ? "Saving draft..." : "Close (Esc)"}
            >
              <X size={18} />
            </button>
          </div>
        </header>



        {/* Content area — centered writing column, wider gutters in fullscreen */}
        <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${isFullscreen ? "px-4 pt-6 pb-0 sm:px-10 sm:pt-9" : "px-4 py-5 sm:px-6"}`}>
          <div className={`flex min-h-0 w-full flex-1 flex-col ${isFullscreen ? `mx-auto ${tab === "post" ? "max-w-2xl" : "max-w-4xl"}` : ""}`}>
          {tab === "post" ? (
            <PostComposer
              agent={agent}
              devMode={devMode}
              fullscreen={isFullscreen}
              onPublished={handlePostPublished}
              onError={handleError}
            />
          ) : (
            <BlogEditor
              key={editingBlog?.rkey ?? "new"}
              ref={blogEditorRef}
              agent={agent}
              devMode={devMode}
              fullscreen={isFullscreen}
              onPublished={handleBlogPublished}
              onError={handleError}
            />
          )}
          </div>
        </div>

        {showDraftPrompt && (
          <ConfirmDialog
            title="Unsaved blog changes"
            description="Save what you wrote as a draft before closing?"
            onDismiss={() => setShowDraftPrompt(false)}
            actions={[
              {
                key: "discard",
                label: "Close without saving",
                onClick: finishClose,
                variant: "danger",
              },
              {
                key: "save-draft",
                label: savingDraftOnClose ? "Saving..." : "Save draft",
                onClick: handleSaveDraftAndClose,
                disabled: savingDraftOnClose,
                variant: "primary",
              },
            ]}
          />
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default AdminModal;
