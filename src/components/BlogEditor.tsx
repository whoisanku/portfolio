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
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createBlogEntry, updateBlogEntry, whtwndUrl } from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";
import { useAuth } from "../auth/AuthContext";
import {
  uploadImageForBlog,
  getImageDimensions,
  type WhiteWindBlobMetadata,
} from "../lib/mediaUpload";

interface BlogEditorProps {
  agent: Agent | null;
  devMode: boolean;
  onPublished: (urls: { whitewind: string; internal: string }) => void;
  onError: (msg: string) => void;
  isFullscreen: boolean;
}

type Visibility = "public" | "url" | "author";

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

const toolbarActions: ToolbarAction[] = [
  { icon: Heading1, label: "Heading 1", block: "h1" },
  { icon: Heading2, label: "Heading 2", block: "h2" },
  { icon: Heading3, label: "Heading 3", block: "h3" },
  { icon: Bold, label: "Bold", command: "bold" },
  { icon: Italic, label: "Italic", command: "italic" },
  { icon: Strikethrough, label: "Strikethrough", command: "strikeThrough" },
  { icon: Code, label: "Inline code", custom: "code" },
  { icon: Quote, label: "Quote", block: "blockquote" },
  { icon: List, label: "Bullet list", command: "insertUnorderedList" },
  { icon: ListOrdered, label: "Numbered list", command: "insertOrderedList" },
  { icon: ListChecks, label: "Checklist", custom: "checklist" },
  { icon: Minus, label: "Divider", custom: "divider" },
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
      return children ? `**${children}**` : "";
    case "em":
    case "i":
      return children ? `_${children}_` : "";
    case "s":
    case "strike":
    case "del":
      return children ? `~~${children}~~` : "";
    case "code":
      return children ? `\`${children.replaceAll("`", "\\`")}\`` : "";
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
      return `${marker}${serializeInline(li).replace(/^☐\s*/, "").trim()}`;
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

// Helper to check if node tag name or ancestors match formatting selectors
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
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
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
              content = content.replace(/^[-\*]\s?/, "");
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

const BlogEditor = ({
  agent,
  devMode,
  onPublished,
  onError,
  isFullscreen,
}: BlogEditorProps) => {
  const { editingBlog, setEditingBlog } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [isDraft, setIsDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState("1 min read");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageBlobByUrlRef = useRef<Record<string, WhiteWindBlobMetadata>>({});
  const previewObjectUrlsRef = useRef<string[]>([]);

  // Cover image states
  const [coverImage, setCoverImage] = useState<{
    url: string;
    previewUrl?: string;
    width?: number;
    height?: number;
    metadata?: WhiteWindBlobMetadata;
  } | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Active toolbar styles
  const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});

  const updateActiveStyles = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const styles: Record<string, boolean> = {};

    // Standard commands
    const commands = ["bold", "italic", "strikeThrough", "insertUnorderedList", "insertOrderedList"] as const;
    commands.forEach((cmd) => {
      try {
        styles[cmd] = document.queryCommandState(cmd);
      } catch {
        styles[cmd] = false;
      }
    });

    // formatBlock values (h1, h2, h3, blockquote)
    try {
      const blockVal = document.queryCommandValue("formatBlock");
      if (blockVal) {
        const normalized = blockVal.toLowerCase().replace(/[<>]/g, "");
        styles[normalized] = true;
      }
    } catch {}

    // Custom tag styling (code, link, checklist)
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.getRangeAt(0).startContainer;
      while (node && node !== editor) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          if (tag === "code") {
            styles["code"] = true;
          }
          if (tag === "a") {
            styles["link"] = true;
          }
          if (tag === "blockquote") {
            styles["blockquote"] = true;
          }
          if (el.dataset.checklist === "true" || (tag === "li" && el.dataset.checklist === "true")) {
            styles["checklist"] = true;
          }
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

  const registerPreviewObjectUrl = (url: string) => {
    previewObjectUrlsRef.current.push(url);
  };

  const clearImages = () => {
    for (const url of previewObjectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewObjectUrlsRef.current = [];
    imageBlobByUrlRef.current = {};
  };

  useEffect(() => {
    return () => clearImages();
  }, []);

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

  const insertImageBlock = (url: string, previewUrl: string, alt: string) => {
    focusEditor();
    exec("insertHTML", imageFigureHtml(url, previewUrl, alt));
    syncContentFromDom();
  };

  const handleImageUpload = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    if (!agent) {
      if (devMode) {
        setUploadingImage(true);
        try {
          for (const file of selectedFiles) {
            const url = URL.createObjectURL(file);
            registerPreviewObjectUrl(url);
            insertImageBlock(url, url, altFromFileName(file));
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
      for (const file of selectedFiles) {
        const previewUrl = URL.createObjectURL(file);
        registerPreviewObjectUrl(previewUrl);
        const uploaded = await uploadImageForBlog(agent, file);
        imageBlobByUrlRef.current[uploaded.url] = uploaded.metadata;
        insertImageBlock(uploaded.url, previewUrl, altFromFileName(file));
      }
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Failed to upload image",
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!agent) {
      if (devMode) {
        setUploadingCover(true);
        try {
          const url = URL.createObjectURL(file);
          registerPreviewObjectUrl(url);
          const dims = await getImageDimensions(file).catch(() => ({ width: 1200, height: 630 }));
          setCoverImage({ url, previewUrl: url, ...dims });
        } catch (err) {
          onError(err instanceof Error ? err.message : "Failed to read local cover image");
        } finally {
          setUploadingCover(false);
        }
      }
      return;
    }

    setUploadingCover(true);
    try {
      const localPreviewUrl = URL.createObjectURL(file);
      registerPreviewObjectUrl(localPreviewUrl);
      const uploaded = await uploadImageForBlog(agent, file);
      const dims = await getImageDimensions(file).catch(() => ({ width: 1200, height: 630 }));
      setCoverImage({
        url: uploaded.url,
        previewUrl: localPreviewUrl,
        width: dims.width,
        height: dims.height,
        metadata: uploaded.metadata,
      });
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
    const img = figure?.querySelector("img");
    const finalUrl = img?.dataset.finalSrc || img?.getAttribute("src") || "";
    const previewUrl = img?.getAttribute("src") || "";

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
      previewObjectUrlsRef.current = previewObjectUrlsRef.current.filter(
        (candidate) => candidate !== previewUrl,
      );
    }
    if (finalUrl) delete imageBlobByUrlRef.current[finalUrl];
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

  useEffect(() => {
    if (editingBlog) {
      setTitle(editingBlog.title);
      setVisibility(editingBlog.visibility || "public");
      setIsDraft(editingBlog.isDraft || false);
      if (editorRef.current) {
        editorRef.current.innerHTML = markdownToHtml(editingBlog.content);
      }
      setContent(editingBlog.content);

      if (editingBlog.ogp) {
        setCoverImage({
          url: editingBlog.ogp.url,
          width: editingBlog.ogp.width,
          height: editingBlog.ogp.height,
        });
      } else {
        setCoverImage(null);
      }

      const metricText = editingBlog.content;
      setWordCount(metricText.split(/\s+/).filter(Boolean).length);
      setReadTime(estimateReadTime(metricText));
    } else {
      setTitle("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      setContent("");
      setCoverImage(null);
      setWordCount(0);
      setReadTime("1 min read");
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
        clearImages();
        setCoverImage(null);
        
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
      const imageUrls = Array.from(latestContent.matchAll(/!\[[^\]]*\]\(([^)]*)\)/g), (match) => match[1] ?? "");
      const blobs = imageUrls
        .map((url) => imageBlobByUrlRef.current[url])
        .filter((blob): blob is WhiteWindBlobMetadata => Boolean(blob));

      if (coverImage?.metadata) {
        blobs.push(coverImage.metadata);
      }

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
          blobs,
          ogp,
          createdAt: editingBlog.createdAt,
        }, devMode);

        const rkey = editingBlog.rkey;
        setTitle("");
        clearEditor();
        clearImages();
        setCoverImage(null);
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
          blobs,
          ogp,
        });
        setTitle("");
        clearEditor();
        clearImages();
        setCoverImage(null);
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
    if ("command" in action) {
      return activeStyles[action.command] || false;
    }
    if ("block" in action) {
      return activeStyles[action.block] || false;
    }
    if ("custom" in action) {
      return activeStyles[action.custom] || false;
    }
    return false;
  };

  return (
    <form onSubmit={publish} className="flex h-full flex-col gap-0">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="border-b border-zinc-800 bg-transparent px-1 py-3 text-2xl font-semibold text-white placeholder-zinc-600 outline-none"
      />

      {/* Cover Image Upload Area */}
      <div className="border-b border-zinc-800 py-3 px-1">
        {coverImage ? (
          <div className="cover-upload-preview group">
            <img src={coverImage.previewUrl || coverImage.url} alt="Cover Preview" />
            <div className="cover-upload-overlay">
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                className="cover-remove-btn"
              >
                Remove Cover Image
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => coverFileRef.current?.click()}
            className="cover-upload-zone"
          >
            {uploadingCover ? (
              <span className="text-sm text-blue-400 animate-pulse">
                Uploading cover image...
              </span>
            ) : (
              <>
                <ImagePlus className="mb-2 text-zinc-500" size={24} />
                <span className="text-xs text-zinc-400 font-medium">
                  Add Cover / Thumbnail Image (Optional)
                </span>
                <span className="text-[10px] text-zinc-600 mt-1">
                  Drag & drop or click to upload
                </span>
              </>
            )}
          </div>
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

      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-800 py-2">
        {toolbarActions.map((action) => {
          const active = isActionActive(action);
          return (
            <button
              key={action.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runToolbarAction(action)}
              title={action.label}
              className={`rounded-md p-1.5 transition-colors border border-transparent ${
                active
                  ? "toolbar-btn-active"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <action.icon size={16} />
            </button>
          );
        })}

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          title="Insert link (Ctrl+K)"
          className={`rounded-md p-1.5 transition-colors border border-transparent ${
            activeStyles["link"]
              ? "toolbar-btn-active"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          }`}
        >
          <LinkIcon size={16} />
        </button>

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
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleImageUpload(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write..."
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
        className={`admin-rich-editor admin-editor-textarea min-h-0 flex-1 overflow-y-auto px-3 py-4 text-zinc-200 outline-none ${
          isFullscreen ? "min-h-[60vh]" : "min-h-[340px]"
        }`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-400 outline-none transition-colors focus:border-blue-500/60"
          >
            <option value="public">Public</option>
            <option value="url">Unlisted</option>
            <option value="author">Private</option>
          </select>

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
            {wordCount} words - {readTime}
          </span>

          {uploadingImage && (
            <span className="animate-pulse text-xs text-blue-400">
              Uploading image...
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={
            busy ||
            uploadingImage ||
            (!agent && !devMode) ||
            !title.trim() ||
            !content.trim()
          }
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Publishing..."
            : isDraft
              ? "Save draft"
              : "Publish blog"}
        </button>
      </div>
    </form>
  );
};

export default BlogEditor;
