import type { Agent } from "@atproto/api";
import { motion } from "motion/react";
import {
  Bold,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Send,
  Strikethrough,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAuth } from "../auth/AuthContext";
import { createBlogEntry, readingTimeLabel, updateBlogEntry, whtwndUrl } from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";
import { uploadImageToGrove } from "../lib/grove";
import PublishCoverDialog, { type CoverImage } from "./PublishCoverDialog";

interface BlogEditorProps {
  agent: Agent | null;
  devMode: boolean;
  fullscreen?: boolean;
  onPublished: (urls: { whitewind: string; internal: string }) => void;
  onError: (msg: string) => void;
}

export interface BlogEditorHandle {
  hasUnsavedChanges: () => boolean;
  saveDraft: () => Promise<void>;
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

function estimatePlainTextReadTime(text: string): string {
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
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*\*([\s\S]+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/___([\s\S]+?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([\s\S]+?)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^\w\\])_([^_\n]+?)_(?=[^\w]|$)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^\w\\])\*([^*\n]+?)\*(?=[^\w]|$)/g, "$1<em>$2</em>");
  html = html.replace(/~~([\s\S]+?)~~/g, "<s>$1</s>");
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
        const lastLine = lines[lines.length - 1]?.trim();
        const codeLines = lines.slice(1, lines.length - (lastLine === "```" ? 1 : 0));
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
              content = content.replace(/^-\s\[[ xX]\]\s?/, "");
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

const BlogEditor = forwardRef<BlogEditorHandle, BlogEditorProps>(({
  agent,
  devMode,
  fullscreen = false,
  onPublished,
  onError,
}, ref) => {
  const { editingBlog, setEditingBlog } = useAuth();
  // State is hydrated from the entry being edited; AdminModal remounts this
  // component (via key) whenever the edited entry changes.
  const [title, setTitle] = useState(() => editingBlog?.title ?? "");
  const [content, setContent] = useState(() => editingBlog?.content ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    () => editingBlog?.visibility ?? "public",
  );
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [wordCount, setWordCount] = useState(() =>
    editingBlog ? editingBlog.content.split(/\s+/).filter(Boolean).length : 0,
  );
  const [readTime, setReadTime] = useState(() =>
    editingBlog ? readingTimeLabel(editingBlog.content) : "1 min read",
  );
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initialTitleRef = useRef(editingBlog?.title ?? "");
  const initialContentRef = useRef(normalizeMarkdown(editingBlog?.content ?? ""));
  const initialCoverUrlRef = useRef(editingBlog?.ogp?.url ?? "");

  // Cover image
  const [coverImage, setCoverImage] = useState<CoverImage | null>(() =>
    editingBlog?.ogp
      ? {
          url: editingBlog.ogp.url,
          width: editingBlog.ogp.width,
          height: editingBlog.ogp.height,
        }
      : null,
  );
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showCoverPrompt, setShowCoverPrompt] = useState(false);

  // Active toolbar styles
  const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});

  // On small screens the toolbar collapses to a single row (headings + inline
  // formatting); the rest is revealed by the chevron. Always expanded on sm+.
  const [toolbarExpanded, setToolbarExpanded] = useState(false);

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
    setReadTime(estimatePlainTextReadTime(metricText));
  };

  const clearEditor = () => {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setContent("");
    setCoverImage(null);
    setShowCoverPrompt(false);
    setWordCount(0);
    setReadTime("1 min read");
  };

  const currentMarkdown = useCallback(
    () => (editorRef.current ? serializeEditorToMarkdown(editorRef.current) : content),
    [content],
  );

  const currentOgp = useCallback(
    () =>
      coverImage
        ? {
            url: coverImage.url,
            width: coverImage.width,
            height: coverImage.height,
          }
        : undefined,
    [coverImage],
  );

  const hasUnsavedChanges = useCallback(() => {
    const latestContent = normalizeMarkdown(currentMarkdown());
    const latestCover = coverImage?.url ?? "";
    return (
      title !== initialTitleRef.current ||
      latestContent !== initialContentRef.current ||
      latestCover !== initialCoverUrlRef.current
    );
  }, [coverImage, currentMarkdown, title]);

  const saveDraft = useCallback(async () => {
    if (uploadingImage || uploadingCover) {
      throw new Error("Wait for uploads to finish before saving a draft.");
    }

    const latestContent = currentMarkdown();
    const hasDraftContent = title.trim() || latestContent.trim() || coverImage;
    if (!hasDraftContent) return;

    const draftTitle = title.trim() || "Untitled draft";
    const ogp = currentOgp();

    if (!agent) {
      if (devMode) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return;
      }
      throw new Error("Authentication required to save a draft.");
    }

    if (editingBlog) {
      await updateBlogEntry(
        agent,
        editingBlog.rkey,
        {
          title: draftTitle,
          content: latestContent,
          visibility,
          isDraft: true,
          blobs: editingBlog.blobs,
          ogp,
          createdAt: editingBlog.createdAt,
        },
        devMode,
      );
      return;
    }

    await createBlogEntry(agent, {
      title: draftTitle,
      content: latestContent,
      visibility,
      isDraft: true,
      ogp,
    });
  }, [
    agent,
    coverImage,
    currentMarkdown,
    currentOgp,
    devMode,
    editingBlog,
    title,
    uploadingCover,
    uploadingImage,
    visibility,
  ]);

  useImperativeHandle(ref, () => ({ hasUnsavedChanges, saveDraft }), [
    hasUnsavedChanges,
    saveDraft,
  ]);

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

  const publishBlog = useCallback(async () => {
    const latestContent = currentMarkdown();
    if (!title.trim() || !latestContent.trim() || busy || uploadingImage || uploadingCover) return;

    setShowCoverPrompt(false);

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
      const ogp = currentOgp();

      if (editingBlog) {
        await updateBlogEntry(agent, editingBlog.rkey, {
          title: title.trim(),
          content: latestContent,
          visibility,
          isDraft: false,
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
          isDraft: false,
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
  }, [
    agent,
    busy,
    currentMarkdown,
    currentOgp,
    devMode,
    editingBlog,
    onError,
    onPublished,
    setEditingBlog,
    title,
    uploadingCover,
    uploadingImage,
    visibility,
  ]);

  const publish = (e: FormEvent) => {
    e.preventDefault();
    const latestContent = currentMarkdown();
    if (!title.trim() || !latestContent.trim() || busy || uploadingImage || uploadingCover) return;
    setShowCoverPrompt(true);
  };

  const isActionActive = (action: ToolbarAction) => {
    if ("command" in action) return activeStyles[action.command] || false;
    if ("block" in action) return activeStyles[action.block] || false;
    if ("custom" in action) return activeStyles[action.custom] || false;
    return false;
  };

  const publishCoverLabel = coverImage
    ? editingBlog
      ? "Update with cover ->"
      : "Publish with cover ->"
    : editingBlog
      ? "Update without a cover ->"
      : "Share as-is - publish without a cover ->";

  return (
    <form onSubmit={publish} className="flex min-h-0 flex-1 flex-col gap-0">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={
          fullscreen
            ? "bg-transparent px-1 pb-2 font-display text-[30px] leading-tight font-medium text-ink placeholder-ink-3 outline-none sm:text-[40px]"
            : "bg-transparent px-1 pb-2 font-display text-[26px] leading-tight font-medium text-ink placeholder-ink-3 outline-none"
        }
      />

      {/* Toolbar — vertical rail on the left in fullscreen (top pill on small
          screens), slim strip otherwise */}
      <div
        className={
          fullscreen
            ? "order-first mx-auto mb-8 flex max-w-full flex-wrap items-center justify-center rounded-full border border-line bg-raise/50 px-2 py-1 lg:fixed lg:left-5 lg:top-1/2 lg:z-30 lg:mx-0 lg:mb-0 lg:-translate-y-1/2 lg:flex-col lg:flex-nowrap lg:bg-raise/70 lg:px-1.5 lg:py-2 lg:backdrop-blur"
            : "order-first mx-auto mb-5 flex max-w-full flex-wrap items-center justify-center rounded-full border border-line bg-raise/50 px-2 py-1"
        }
      >
        {toolbarGroups.map((group, groupIndex) => {
          // Groups past the first two are "secondary": hidden on mobile until
          // the chevron expands the toolbar, always shown from sm up.
          const secondary = groupIndex >= 2;
          return (
            <div
              key={groupIndex}
              className={`items-center ${
                secondary ? (toolbarExpanded ? "flex" : "hidden sm:flex") : "flex"
              } ${fullscreen ? "lg:flex-col" : ""}`}
            >
              {groupIndex > 0 && (
                <span
                  className={`mx-1.5 h-4 w-px bg-line ${
                    fullscreen ? "lg:mx-0 lg:my-1.5 lg:h-px lg:w-4" : ""
                  }`}
                />
              )}
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
          );
        })}

        <span
          className={`mx-1.5 h-4 w-px bg-line ${
            toolbarExpanded ? "" : "hidden sm:block"
          } ${fullscreen ? "lg:mx-0 lg:my-1.5 lg:h-px lg:w-4" : ""}`}
        />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          title="Insert link (Ctrl+K)"
          className={`rounded-md border border-transparent p-1.5 transition-colors ${
            toolbarExpanded ? "" : "hidden sm:block"
          } ${
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
          className={`rounded-md border border-transparent p-1.5 text-ink-3 transition-colors hover:bg-raise hover:text-ink disabled:animate-pulse disabled:text-accent ${
            toolbarExpanded ? "" : "hidden sm:block"
          }`}
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

        {/* Mobile-only: reveal/hide the secondary tools */}
        <button
          type="button"
          onClick={() => setToolbarExpanded((v) => !v)}
          aria-label={toolbarExpanded ? "Fewer tools" : "More tools"}
          aria-expanded={toolbarExpanded}
          className="ml-1.5 rounded-md border border-transparent p-1.5 text-ink-3 transition-colors hover:bg-raise hover:text-ink sm:hidden"
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              toolbarExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
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
        className={`admin-rich-editor admin-editor-textarea min-h-[200px] flex-1 overflow-y-auto outline-none ${
          fullscreen ? "admin-editor-zen px-1 py-4" : "px-1 py-3"
        }`}
      />

      {/* Footer controls */}
      <div
        className={`flex items-center justify-between gap-2 border-t border-line sm:gap-3 ${
          fullscreen ? "py-4" : "pt-3"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          {/* Visibility — segmented */}
          <div className="relative flex h-9 shrink-0 rounded-lg border border-line p-0.5">
            {visibilityOptions.map((option) => {
              const active = visibility === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setVisibility(option.value)}
                  className={`relative rounded-md h-full flex items-center px-2 sm:px-2.5 font-mono text-[10px] tracking-[0.06em] sm:tracking-[0.08em] uppercase transition-colors ${
                    active ? "text-accent" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="visibility-pill"
                      className="absolute inset-0 rounded bg-raise"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>

          {uploadingImage ? (
            <span className="animate-pulse truncate font-mono text-[11px] text-accent">
              <span className="sm:hidden">Uploading…</span>
              <span className="hidden sm:inline">Uploading to Grove…</span>
            </span>
          ) : (
            <span className="hidden truncate font-mono text-[11px] text-ink-3 min-[420px]:inline">
              {wordCount} words · {readTime}
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
          title={editingBlog ? "Update blog" : "Publish blog"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-5"
        >
          <span className="hidden sm:inline">
            {busy ? "Publishing…" : editingBlog ? "Update blog" : "Publish blog"}
          </span>
          <Send size={16} className={`sm:hidden ${busy ? "animate-pulse" : ""}`} />
        </button>
      </div>

      {showCoverPrompt && (
        <PublishCoverDialog
          coverImage={coverImage}
          uploading={uploadingCover}
          publishing={busy}
          publishLabel={publishCoverLabel}
          onDismiss={() => setShowCoverPrompt(false)}
          onFileSelect={(files) => {
            void handleCoverUpload(files);
          }}
          onRemoveCover={() => setCoverImage(null)}
          onPublish={() => {
            void publishBlog();
          }}
        />
      )}
    </form>
  );
});

export default BlogEditor;
