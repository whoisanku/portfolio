import type { Agent } from "@atproto/api";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { createBlogEntry, updateBlogEntry, whtwndUrl } from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";
import { uploadImageToGrove } from "../lib/grove";

interface BlogEditorProps {
  agent: Agent | null;
  devMode: boolean;
  onPublished: (urls: { whitewind: string; internal: string }) => void;
  onError: (msg: string) => void;
}

type Visibility = "public" | "url" | "author";

const visibilityOptions: { value: Visibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "url", label: "Unlisted" },
  { value: "author", label: "Private" },
];

type ToolbarAction =
  | {
      icon: typeof Bold;
      label: string;
      command: "bold" | "italic" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList";
    }
  | {
      icon: typeof Bold;
      label: string;
      block: "h1" | "h2" | "h3" | "blockquote";
    }
  | {
      icon: typeof Bold;
      label: string;
      custom: "code" | "checklist" | "divider";
    };

/** Toolbar actions, grouped — groups are separated by a thin rule. */
const toolbarGroups: ToolbarAction[][] = [
  [
    { icon: Heading1, label: "Heading 1", block: "h1" },
    { icon: Heading2, label: "Heading 2", block: "h2" },
    { icon: Heading3, label: "Heading 3", block: "h3" },
  ],
  [
    { icon: Bold, label: "Bold (Ctrl+B)", command: "bold" },
    { icon: Italic, label: "Italic (Ctrl+I)", command: "italic" },
    { icon: Strikethrough, label: "Strikethrough", command: "strikeThrough" },
    { icon: Code, label: "Inline code", custom: "code" },
  ],
  [
    { icon: Quote, label: "Quote", block: "blockquote" },
    { icon: List, label: "Bullet list", command: "insertUnorderedList" },
    { icon: ListOrdered, label: "Numbered list", command: "insertOrderedList" },
    { icon: ListChecks, label: "Checklist", custom: "checklist" },
    { icon: Minus, label: "Divider", custom: "divider" },
  ],
];

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

function altFromFileName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeMarkdownAlt(value: string): string {
  return value.replaceAll("[", "").replaceAll("]", "").replace(/\s+/g, " ").trim();
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function textContent(node: Node): string {
  return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * Wrap inline content in a markdown delimiter, moving leading/trailing
 * whitespace outside the markers. `*italic *` is invalid CommonMark (the
 * closing delimiter can't be preceded by a space), which is why italics
 * written in the editor previously didn't render in the published view.
 */
function wrapMark(children: string, marker: string): string {
  if (!children) return "";
  const lead = children.match(/^\s*/)?.[0] ?? "";
  const trail = children.match(/\s*$/)?.[0] ?? "";
  const core = children.slice(lead.length, children.length - trail.length);
  if (!core) return children; // whitespace-only selection
  return `${lead}${marker}${core}${marker}${trail}`;
}

function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const children = Array.from(el.childNodes).map(serializeInline).join("");
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "br":
      return "\n";
    case "strong":
    case "b":
      return wrapMark(children, "**");
    case "em":
    case "i":
      // Single asterisk — `_` breaks mid-word and chokes on snake_case.
      return wrapMark(children, "*");
    case "s":
    case "strike":
    case "del":
      return wrapMark(children, "~~");
    case "code":
      return children.trim() ? `\`${children.trim().replaceAll("`", "\\`")}\`` : "";
    case "a": {
      const href = el.getAttribute("href") ?? "";
      return href ? `[${children || href}](${href})` : children;
    }
    case "img": {
      const img = el as HTMLImageElement;
      const url = img.dataset.finalSrc || img.currentSrc || img.src;
      const alt = sanitizeMarkdownAlt(img.alt);
      return url ? `![${alt}](${url})` : "";
    }
    default:
      return children;
  }
}

function serializeList(list: HTMLElement): string {
  const ordered = list.tagName.toLowerCase() === "ol";
  const items = Array.from(list.children).filter((child) => child.tagName.toLowerCase() === "li");

  return items
    .map((item, index) => {
      const li = item as HTMLElement;
      const marker = li.dataset.checklist === "true" ? "- [ ] " : ordered ? `${index + 1}. ` : "- ";
      return `${marker}${serializeInline(li).replace(/^[☐☑]\s*/, "").trim()}`;
    })
    .join("\n");
}

function serializeImageFigure(figure: HTMLElement): string {
  const img = figure.querySelector("img");
  if (!img) return "";
  const caption = figure.querySelector<HTMLInputElement>("[data-image-alt]");
  const url = img.dataset.finalSrc || img.currentSrc || img.src;
  const alt = sanitizeMarkdownAlt(caption?.value || img.alt);
  return url ? `![${alt}](${url})` : "";
}

function serializeBlock(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return textContent(node);
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (el.dataset.blogImage === "true") return serializeImageFigure(el);

  switch (tag) {
    case "h1":
      return `# ${serializeInline(el).trim()}`;
    case "h2":
      return `## ${serializeInline(el).trim()}`;
    case "h3":
      return `### ${serializeInline(el).trim()}`;
    case "blockquote":
      return serializeInline(el)
        .split("\n")
        .map((line) => `> ${line.trim()}`)
        .join("\n");
    case "ul":
    case "ol":
      return serializeList(el);
    case "hr":
      return "---";
    case "pre":
      return `\`\`\`\n${el.textContent?.trimEnd() ?? ""}\n\`\`\``;
    case "div":
    case "p": {
      const text = serializeInline(el).trim();
      return text;
    }
    default:
      return serializeInline(el).trim();
  }
}

function serializeEditorToMarkdown(editor: HTMLElement): string {
  return normalizeMarkdown(
    Array.from(editor.childNodes)
      .map(serializeBlock)
      .filter(Boolean)
      .join("\n\n"),
  );
}

function editorTextForMetrics(editor: HTMLElement | null): string {
  if (!editor) return "";
  const clone = editor.cloneNode(true) as HTMLElement;
  for (const figure of clone.querySelectorAll("[data-blog-image='true']")) {
    figure.remove();
  }
  return clone.textContent ?? "";
}

function getSelectedHtml(): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";
  const container = document.createElement("div");
  container.appendChild(selection.getRangeAt(0).cloneContents());
  return container.innerHTML;
}

function getSelectedText(): string {
  return window.getSelection()?.toString() ?? "";
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function imageFigureHtml(url: string, previewUrl: string, alt: string): string {
  const safeAlt = escapeHtml(alt);
  return `
    <figure class="blog-image-block" data-blog-image="true" contenteditable="false">
      <div class="blog-image-frame">
        <img src="${escapeHtml(previewUrl)}" data-final-src="${escapeHtml(url)}" alt="${safeAlt}" />
        <button type="button" class="blog-image-remove" data-remove-image="true" title="Remove image">×</button>
      </div>
      <input data-image-alt="true" value="${safeAlt}" placeholder="Caption or alt text" />
    </figure>
    <p><br></p>
  `;
}

function parseInlineMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^\w\\])_([^_]+)_(?=[^\w]|$)/g, "$1<em>$2</em>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.*?)~~/g, "<s>$1</s>");
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  return html;
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return "<p><br></p>";
  const normalized = markdown.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const blocks = normalized.split("\n\n");

  return blocks
    .map((block) => {
      block = block.trim();
      if (!block) return "";

      if (block.startsWith("```")) {
        const lines = block.split("\n");
        const codeLines = lines.slice(1, lines.length - (lines[lines.length - 1] === "```" ? 1 : 0));
        return `<pre>${escapeHtml(codeLines.join("\n"))}</pre>`;
      }

      if (block.startsWith("# ")) {
        return `<h1>${parseInlineMarkdown(block.slice(2))}</h1>`;
      }
      if (block.startsWith("## ")) {
        return `<h2>${parseInlineMarkdown(block.slice(3))}</h2>`;
      }
      if (block.startsWith("### ")) {
        return `<h3>${parseInlineMarkdown(block.slice(4))}</h3>`;
      }

      if (block === "---") {
        return "<hr>";
      }

      const imgMatch = block.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        const alt = imgMatch[1];
        const url = imgMatch[2];
        return imageFigureHtml(url, url, alt).trim();
      }

      if (block.startsWith(">")) {
        const lines = block.split("\n").map((line) => line.replace(/^>\s?/, ""));
        return `<blockquote>${parseInlineMarkdown(lines.join("\n"))}</blockquote>`;
      }

      const lines = block.split("\n");
      const firstLine = lines[0].trim();
      const isChecklist = firstLine.startsWith("- [ ] ") || firstLine.startsWith("- [x] ");
      const isUnordered = firstLine.startsWith("- ") || firstLine.startsWith("* ");
      const isOrdered = /^\d+\.\s/.test(firstLine);

      if (isChecklist || isUnordered || isOrdered) {
        const tag = isOrdered ? "ol" : "ul";
        const itemsHtml = lines
          .map((line) => {
            let content = line.trim();
            let checklistAttr = "";
            let markerPrefix = "";

            if (isChecklist) {
              const isChecked = content.startsWith("- [x] ");
              content = content.replace(/^-\s\[[ x]\]\s?/, "");
              checklistAttr = ' data-checklist="true"';
              markerPrefix = isChecked ? "☑ " : "☐ ";
            } else if (isUnordered) {
              content = content.replace(/^[-*]\s?/, "");
            } else if (isOrdered) {
              content = content.replace(/^\d+\.\s?/, "");
            }

            return `<li${checklistAttr}>${markerPrefix}${parseInlineMarkdown(content)}</li>`;
          })
          .join("");
        return `<${tag}>${itemsHtml}</${tag}>`;
      }

      return `<p>${parseInlineMarkdown(block)}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

const isLikelyImageUrl = (value: string) => /^https?:\/\/\S+/i.test(value.trim());

const BlogEditor = ({
  agent,
  devMode,
  onPublished,
  onError,
}: BlogEditorProps) => {
  const { editingBlog, setEditingBlog } = useAuth();
  // State is hydrated from the entry being edited; AdminModal remounts this
  // component (via key) whenever the edited entry changes.
  const [title, setTitle] = useState(() => editingBlog?.title ?? "");
  const [content, setContent] = useState(() => editingBlog?.content ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    () => editingBlog?.visibility ?? "public",
  );
  const [isDraft, setIsDraft] = useState(() => editingBlog?.isDraft ?? false);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [wordCount, setWordCount] = useState(() =>
    editingBlog ? editingBlog.content.split(/\s+/).filter(Boolean).length : 0,
  );
  const [readTime, setReadTime] = useState(() =>
    editingBlog ? estimateReadTime(editingBlog.content) : "1 min read",
  );
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cover image
  const [coverImage, setCoverImage] = useState<{
    url: string;
    width?: number;
    height?: number;
  } | null>(() =>
    editingBlog?.ogp
      ? {
          url: editingBlog.ogp.url,
          width: editingBlog.ogp.width,
          height: editingBlog.ogp.height,
        }
      : null,
  );
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState("");
  // Cover controls stay collapsed so the writing area keeps the room.
  const [coverOpen, setCoverOpen] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Active toolbar styles
  const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});

  const updateActiveStyles = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const styles: Record<string, boolean> = {};

    const commands = ["bold", "italic", "strikeThrough", "insertUnorderedList", "insertOrderedList"] as const;
    commands.forEach((cmd) => {
      try {
        styles[cmd] = document.queryCommandState(cmd);
      } catch {
        styles[cmd] = false;
      }
    });

    try {
      const blockVal = document.queryCommandValue("formatBlock");
      if (blockVal) {
        const normalized = blockVal.toLowerCase().replace(/[<>]/g, "");
        styles[normalized] = true;
      }
    } catch {
      /* queryCommandValue unsupported for this selection */
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.getRangeAt(0).startContainer;
      while (node && node !== editor) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          if (tag === "code") styles["code"] = true;
          if (tag === "a") styles["link"] = true;
          if (tag === "blockquote") styles["blockquote"] = true;
          if (el.dataset.checklist === "true") styles["checklist"] = true;
        }
        node = node.parentNode;
      }
    }

    setActiveStyles(styles);
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveStyles();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const syncContentFromDom = () => {
    const editor = editorRef.current;
    if (!editor) return;

    setContent(serializeEditorToMarkdown(editor));
    const metricText = editorTextForMetrics(editor);
    setWordCount(metricText.split(/\s+/).filter(Boolean).length);
    setReadTime(estimateReadTime(metricText));
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setContent("");
    setCoverImage(null);
    setWordCount(0);
    setReadTime("1 min read");
  };

  const focusEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    const currentNode = selection?.rangeCount ? selection.getRangeAt(0).commonAncestorContainer : null;
    if (selection && currentNode && editor.contains(currentNode)) return;

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const runToolbarAction = (action: ToolbarAction) => {
    focusEditor();

    if ("command" in action) {
      exec(action.command);
    } else if ("block" in action) {
      exec("formatBlock", action.block);
    } else if (action.custom === "divider") {
      exec("insertHTML", "<hr><p><br></p>");
    } else if (action.custom === "checklist") {
      exec("insertHTML", '<ul><li data-checklist="true">☐ </li></ul><p><br></p>');
    } else if (action.custom === "code") {
      const selected = getSelectedHtml() || escapeHtml(getSelectedText()) || "code";
      exec("insertHTML", `<code>${selected}</code>`);
    }

    syncContentFromDom();
    setTimeout(updateActiveStyles, 10);
  };

  const insertLink = () => {
    focusEditor();
    const url = prompt("Enter URL:");
    if (!url) return;

    if (!getSelectedText()) {
      exec("insertHTML", `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    } else {
      exec("createLink", url);
    }
    syncContentFromDom();
    setTimeout(updateActiveStyles, 10);
  };

  const insertImageBlock = (url: string, alt: string) => {
    focusEditor();
    exec("insertHTML", imageFigureHtml(url, url, alt));
    syncContentFromDom();
  };

  /** Inline images upload straight to Grove — permanent URL, no PDS blobs. */
  const handleImageUpload = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    setUploadingImage(true);
    try {
      for (const file of selectedFiles) {
        const { url } = await uploadImageToGrove(file);
        insertImageBlock(url, altFromFileName(file));
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const uploaded = await uploadImageToGrove(file);
      setCoverImage(uploaded);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to upload cover image");
    } finally {
      setUploadingCover(false);
    }
  };

  /** Cover from a pasted URL (markdown-style) — probed for dimensions. */
  const applyCoverUrl = () => {
    const url = coverUrlInput.trim();
    if (!isLikelyImageUrl(url)) {
      onError("Enter a valid image URL (https://…)");
      return;
    }
    setCoverImage({ url });
    setCoverUrlInput("");
    const probe = new Image();
    probe.onload = () =>
      setCoverImage((prev) =>
        prev && prev.url === url
          ? { ...prev, width: probe.naturalWidth, height: probe.naturalHeight }
          : prev,
      );
    probe.onerror = () => {
      setCoverImage((prev) => (prev && prev.url === url ? null : prev));
      onError("That URL doesn't load as an image.");
    };
    probe.src = url;
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const removeButton = target.closest<HTMLButtonElement>("[data-remove-image='true']");
    if (!removeButton) return;

    const figure = removeButton.closest<HTMLElement>("[data-blog-image='true']");
    figure?.remove();
    syncContentFromDom();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;

    switch (e.key.toLowerCase()) {
      case "b":
        e.preventDefault();
        exec("bold");
        break;
      case "i":
        e.preventDefault();
        exec("italic");
        break;
      case "k":
        e.preventDefault();
        insertLink();
        break;
      default:
        return;
    }
    syncContentFromDom();
  };

  // Mount-only DOM hydration: render the edited entry's markdown into the
  // contentEditable. Entry switches remount this component via key.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (editingBlog && editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(editingBlog.content);
    }
  }, [editingBlog]);

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    const latestContent = editorRef.current ? serializeEditorToMarkdown(editorRef.current) : content;
    if (!title.trim() || !latestContent.trim() || busy || uploadingImage || uploadingCover) return;

    if (!agent) {
      if (devMode) {
        setBusy(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        setBusy(false);
        setTitle("");
        clearEditor();

        const finalRkey = editingBlog ? editingBlog.rkey : "mock-dev-rkey";
        setEditingBlog(null);

        onPublished({
          whitewind: `https://whtwnd.com/${OWNER_HANDLE}/${finalRkey}`,
          internal: `/blog/${finalRkey}`,
        });
      }
      return;
    }

    setBusy(true);
    try {
      const ogp = coverImage
        ? {
            url: coverImage.url,
            width: coverImage.width,
            height: coverImage.height,
          }
        : undefined;

      if (editingBlog) {
        await updateBlogEntry(agent, editingBlog.rkey, {
          title: title.trim(),
          content: latestContent,
          visibility,
          isDraft,
          // Keep legacy PDS blob refs alive for images uploaded pre-Grove.
          blobs: editingBlog.blobs,
          ogp,
          createdAt: editingBlog.createdAt,
        }, devMode);

        const rkey = editingBlog.rkey;
        setTitle("");
        clearEditor();
        setEditingBlog(null);
        onPublished({
          whitewind: whtwndUrl(OWNER_HANDLE, rkey),
          internal: `/blog/${rkey}`,
        });
      } else {
        const { rkey } = await createBlogEntry(agent, {
          title: title.trim(),
          content: latestContent,
          visibility,
          isDraft,
          ogp,
        });
        setTitle("");
        clearEditor();
        onPublished({
          whitewind: whtwndUrl(OWNER_HANDLE, rkey),
          internal: `/blog/${rkey}`,
        });
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to publish blog");
    } finally {
      setBusy(false);
    }
  };

  const isActionActive = (action: ToolbarAction) => {
    if ("command" in action) return activeStyles[action.command] || false;
    if ("block" in action) return activeStyles[action.block] || false;
    if ("custom" in action) return activeStyles[action.custom] || false;
    return false;
  };

  return (
    <form onSubmit={publish} className="flex min-h-0 flex-1 flex-col gap-0">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="border-b border-line bg-transparent px-1 py-3 font-display text-2xl font-medium text-ink placeholder-ink-3 outline-none"
      />

      {/* Cover — one quiet row; expands only when needed so writing stays the hero */}
      <div className="border-b border-line px-1 py-2">
        {coverImage ? (
          <div className="flex items-center gap-3">
            <img
              src={coverImage.url}
              alt="Cover"
              className="h-10 w-16 shrink-0 rounded-md border border-line object-cover"
            />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-3">
              {coverImage.url}
            </span>
            <button
              type="button"
              onClick={() => coverFileRef.current?.click()}
              className="shrink-0 font-mono text-[11px] text-ink-3 transition-colors hover:text-accent"
            >
              replace
            </button>
            <button
              type="button"
              onClick={() => setCoverImage(null)}
              className="shrink-0 font-mono text-[11px] text-ink-3 transition-colors hover:text-ink"
            >
              remove
            </button>
          </div>
        ) : coverOpen ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => coverFileRef.current?.click()}
              disabled={uploadingCover}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-dashed border-line px-3 py-1.5 font-mono text-[11px] text-ink-3 transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
            >
              {uploadingCover ? (
                <span className="animate-pulse">uploading…</span>
              ) : (
                <>
                  <Upload size={11} /> upload
                </>
              )}
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line px-2.5">
              <Link2 size={11} className="shrink-0 text-ink-3" />
              <input
                type="text"
                value={coverUrlInput}
                onChange={(e) => setCoverUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoverUrl();
                  }
                }}
                placeholder="or paste an image URL…"
                className="min-w-0 flex-1 bg-transparent py-1.5 font-mono text-[11px] text-ink placeholder-ink-3 outline-none"
              />
              {coverUrlInput.trim() && (
                <button
                  type="button"
                  onClick={applyCoverUrl}
                  className="shrink-0 font-mono text-[11px] text-accent hover:opacity-80"
                >
                  add
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCoverOpen(false);
                setCoverUrlInput("");
              }}
              aria-label="Close cover options"
              className="shrink-0 rounded-md p-1 text-ink-3 transition-colors hover:bg-raise hover:text-ink"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCoverOpen(true)}
            className="flex items-center gap-1.5 py-0.5 font-mono text-[11px] text-ink-3 transition-colors hover:text-accent"
          >
            <ImagePlus size={11} /> add cover
          </button>
        )}
        <input
          ref={coverFileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            void handleCoverUpload(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center border-b border-line py-2">
        {toolbarGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center">
            {groupIndex > 0 && <span className="mx-1.5 h-4 w-px bg-line" />}
            {group.map((action) => {
              const active = isActionActive(action);
              return (
                <button
                  key={action.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runToolbarAction(action)}
                  title={action.label}
                  className={`rounded-md border border-transparent p-1.5 transition-colors ${
                    active
                      ? "toolbar-btn-active"
                      : "text-ink-3 hover:bg-raise hover:text-ink"
                  }`}
                >
                  <action.icon size={16} />
                </button>
              );
            })}
          </div>
        ))}

        <span className="mx-1.5 h-4 w-px bg-line" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          title="Insert link (Ctrl+K)"
          className={`rounded-md border border-transparent p-1.5 transition-colors ${
            activeStyles["link"]
              ? "toolbar-btn-active"
              : "text-ink-3 hover:bg-raise hover:text-ink"
          }`}
        >
          <LinkIcon size={16} />
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Insert image (uploads to Grove)"
          disabled={uploadingImage}
          className="rounded-md border border-transparent p-1.5 text-ink-3 transition-colors hover:bg-raise hover:text-ink disabled:animate-pulse disabled:text-accent"
        >
          <ImagePlus size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleImageUpload(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {/* Writing surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write…"
        onInput={() => {
          syncContentFromDom();
          updateActiveStyles();
        }}
        onClick={(e) => {
          handleEditorClick(e);
          updateActiveStyles();
        }}
        onKeyUp={updateActiveStyles}
        onKeyDown={(e) => {
          handleEditorKeyDown(e);
          setTimeout(updateActiveStyles, 10);
        }}
        className="admin-rich-editor admin-editor-textarea min-h-[200px] flex-1 overflow-y-auto px-3 py-4 outline-none"
      />

      {/* Footer controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Visibility — segmented */}
          <div className="flex rounded-lg border border-line p-0.5">
            {visibilityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setVisibility(option.value)}
                className={`rounded-md px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors ${
                  visibility === option.value
                    ? "bg-raise text-accent"
                    : "text-ink-3 hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Draft — toggle switch */}
          <button
            type="button"
            onClick={() => setIsDraft(!isDraft)}
            className="flex items-center gap-2"
            aria-pressed={isDraft}
          >
            <span
              className={`relative h-4 w-7 rounded-full transition-colors duration-200 ${
                isDraft ? "bg-accent" : "bg-line"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0 h-3 w-3 rounded-full bg-paper transition-transform duration-200 ${
                  isDraft ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            <span className="font-mono text-[11px] text-ink-3">Draft</span>
          </button>

          <span className="font-mono text-[11px] text-ink-3">
            {wordCount} words · {readTime}
          </span>

          {uploadingImage && (
            <span className="animate-pulse font-mono text-[11px] text-accent">
              Uploading to Grove…
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={
            busy ||
            uploadingImage ||
            uploadingCover ||
            (!agent && !devMode) ||
            !title.trim() ||
            !content.trim()
          }
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Publishing…" : isDraft ? "Save draft" : editingBlog ? "Update blog" : "Publish blog"}
        </button>
      </div>
    </form>
  );
};

export default BlogEditor;
