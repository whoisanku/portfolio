import type { Agent } from "@atproto/api";
import {
  Bold,
  Code,
  Eye,
  EyeOff,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListChecks,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import Markdown from "react-markdown";
import { createBlogEntry, whtwndUrl } from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";
import { uploadImageForMarkdown } from "../lib/mediaUpload";

interface BlogEditorProps {
  agent: Agent | null;
  devMode: boolean;
  onPublished: (urls: { whitewind: string; internal: string }) => void;
  onError: (msg: string) => void;
  isFullscreen: boolean;
}

type Visibility = "public" | "url" | "author";

interface ToolbarAction {
  icon: typeof Bold;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
}

const toolbarActions: ToolbarAction[] = [
  { icon: Heading1, label: "Heading 1", prefix: "# ", suffix: "", block: true },
  { icon: Heading2, label: "Heading 2", prefix: "## ", suffix: "", block: true },
  { icon: Heading3, label: "Heading 3", prefix: "### ", suffix: "", block: true },
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italic", prefix: "_", suffix: "_" },
  { icon: Strikethrough, label: "Strikethrough", prefix: "~~", suffix: "~~" },
  { icon: Code, label: "Inline code", prefix: "`", suffix: "`" },
  { icon: Quote, label: "Quote", prefix: "> ", suffix: "", block: true },
  { icon: List, label: "Bullet list", prefix: "- ", suffix: "", block: true },
  { icon: ListOrdered, label: "Numbered list", prefix: "1. ", suffix: "", block: true },
  { icon: ListChecks, label: "Checklist", prefix: "- [ ] ", suffix: "", block: true },
  { icon: Minus, label: "Divider", prefix: "\n---\n", suffix: "", block: true },
];

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

const BlogEditor = ({
  agent,
  devMode,
  onPublished,
  onError,
  isFullscreen,
}: BlogEditorProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [isDraft, setIsDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const insertAtCursor = (prefix: string, suffix: string, block?: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);

    let insertion: string;
    if (block && start > 0 && content[start - 1] !== "\n") {
      insertion = `\n${prefix}${selected}${suffix}`;
    } else {
      insertion = `${prefix}${selected}${suffix}`;
    }

    const newContent =
      content.slice(0, start) + insertion + content.slice(end);
    setContent(newContent);

    // Restore cursor position after React re-renders
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + prefix.length + (block && start > 0 && content[start - 1] !== "\n" ? 1 : 0);
      ta.selectionStart = cursorPos + selected.length;
      ta.selectionEnd = cursorPos + selected.length;
    });
  };

  const insertLink = () => {
    const url = prompt("Enter URL:");
    if (!url) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end) || "link text";
    const insertion = `[${selected}](${url})`;
    const newContent =
      content.slice(0, start) + insertion + content.slice(end);
    setContent(newContent);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!agent) {
      if (devMode) {
        setUploadingImage(true);
        try {
          for (const file of Array.from(files)) {
            const url = URL.createObjectURL(file);
            const alt = file.name.replace(/\.[^.]+$/, "");
            const md = `\n![${alt}](${url})\n`;
            setContent((prev) => prev + md);
          }
        } catch (err) {
          onError(err instanceof Error ? err.message : "Failed to read local image");
        } finally {
          setUploadingImage(false);
        }
      }
      return;
    }

    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImageForMarkdown(agent, file);
        const alt = file.name.replace(/\.[^.]+$/, "");
        const md = `\n![${alt}](${url})\n`;
        setContent((prev) => prev + md);
      }
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to upload image",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          insertAtCursor("**", "**");
          break;
        case "i":
          e.preventDefault();
          insertAtCursor("_", "_");
          break;
        case "k":
          e.preventDefault();
          insertLink();
          break;
      }
    }
  };

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || busy) return;

    if (!agent) {
      if (devMode) {
        setBusy(true);
        // Simulate local compile & delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        setBusy(false);
        setTitle("");
        setContent("");
        onPublished({
          whitewind: `https://whtwnd.com/${OWNER_HANDLE}/mock-dev-rkey`,
          internal: `/blog/mock-dev-rkey`,
        });
      }
      return;
    }

    setBusy(true);
    try {
      const { rkey } = await createBlogEntry(agent, {
        title: title.trim(),
        content,
        visibility,
        isDraft,
      });
      setTitle("");
      setContent("");
      onPublished({
        whitewind: whtwndUrl(OWNER_HANDLE, rkey),
        internal: `/blog/${rkey}`,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to publish blog");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={publish} className="flex h-full flex-col gap-0">
      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="border-b border-zinc-800 bg-transparent px-1 py-3 text-2xl font-semibold text-white placeholder-zinc-600 outline-none"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-800 py-2">
        {toolbarActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() =>
              insertAtCursor(action.prefix, action.suffix, action.block)
            }
            title={action.label}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <action.icon size={16} />
          </button>
        ))}

        {/* Link button */}
        <button
          type="button"
          onClick={insertLink}
          title="Insert link (Ctrl+K)"
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <LinkIcon size={16} />
        </button>

        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Upload image"
          disabled={uploadingImage || (!agent && !devMode)}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:animate-pulse disabled:text-blue-400 disabled:opacity-30"
        >
          <ImagePlus size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleImageUpload(e.target.files)}
        />

        {/* Separator */}
        <div className="mx-1 h-5 w-px bg-zinc-800" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? "Hide preview" : "Show preview"}
          className={`rounded-md p-1.5 transition-colors hover:bg-zinc-800 ${
            showPreview ? "text-blue-400" : "text-zinc-500 hover:text-zinc-200"
          }`}
        >
          {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Editor + Preview area */}
      <div
        className={`flex min-h-0 flex-1 ${showPreview ? "gap-0" : ""}`}
      >
        {/* Editor pane */}
        <div
          className={`flex flex-col ${showPreview ? "w-1/2 border-r border-zinc-800" : "w-full"}`}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write in Markdown…"
            className={`admin-editor-textarea flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[0.85rem] leading-relaxed text-zinc-200 placeholder-zinc-600 outline-none ${
              isFullscreen ? "min-h-[60vh]" : "min-h-[340px]"
            }`}
          />
        </div>

        {/* Preview pane */}
        {showPreview && (
          <div
            className={`admin-editor-preview w-1/2 overflow-y-auto px-5 py-3 ${
              isFullscreen ? "max-h-[70vh]" : "max-h-[400px]"
            }`}
          >
            <div className="prose prose-invert prose-zinc max-w-none prose-a:text-blue-400 prose-img:rounded-lg prose-headings:text-white">
              {title && <h1>{title}</h1>}
              <Markdown>{content || "*Nothing to preview yet…*"}</Markdown>
            </div>
          </div>
        )}
      </div>

      {/* Footer: metadata + publish */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Visibility */}
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-400 outline-none transition-colors focus:border-blue-500/60"
          >
            <option value="public">🌐 Public</option>
            <option value="url">🔗 Unlisted</option>
            <option value="author">🔒 Private</option>
          </select>

          {/* Draft toggle */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={isDraft}
              onChange={(e) => setIsDraft(e.target.checked)}
              className="accent-blue-500"
            />
            Draft
          </label>

          <span className="text-[11px] text-zinc-600">
            {wordCount} words · {estimateReadTime(content)}
          </span>

          {uploadingImage && (
            <span className="animate-pulse text-xs text-blue-400">
              Uploading image…
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={busy || (!agent && !devMode) || !title.trim() || !content.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Publishing…"
            : isDraft
              ? "Save draft"
              : "Publish blog"}
        </button>
      </div>
    </form>
  );
};

export default BlogEditor;
