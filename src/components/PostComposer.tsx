import { RichText } from "@atproto/api";
import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { OWNER_HANDLE } from "../lib/config";
import { uploadImage, type UploadedImage } from "../lib/mediaUpload";
import type { Agent } from "@atproto/api";

const MAX_POST_LENGTH = 300;
const MAX_IMAGES = 4;

interface ImageAttachment {
  file: File;
  preview: string;
  alt: string;
  uploaded?: UploadedImage;
}

interface PostComposerProps {
  agent: Agent | null;
  devMode: boolean;
  fullscreen?: boolean;
  onPublished: (url: string) => void;
  onError: (msg: string) => void;
}

/** Circular character budget — fills with accent, turns red only past the limit. */
const CharRing = ({ used }: { used: number }) => {
  const remaining = MAX_POST_LENGTH - used;
  const over = remaining < 0;
  const r = 8;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, used / MAX_POST_LENGTH);

  return (
    <span
      className="flex items-center gap-1.5"
      title={`${remaining} characters left`}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth="2"
        />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={over ? "#ef4444" : "var(--accent-ink)"}
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      {remaining <= 50 && (
        <span
          className={`font-mono text-[11px] tabular-nums ${
            over ? "text-red-500" : "text-ink-3"
          }`}
        >
          {remaining}
        </span>
      )}
    </span>
  );
};

const PostComposer = ({ agent, devMode, fullscreen = false, onPublished, onError }: PostComposerProps) => {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [editingAlt, setEditingAlt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_POST_LENGTH - text.length;

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const available = MAX_IMAGES - images.length;
    const toAdd = Array.from(files).slice(0, available);
    setImages((prev) => [
      ...prev,
      ...toAdd.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        alt: "",
      })),
    ]);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
    if (editingAlt === idx) setEditingAlt(null);
  };

  const updateAlt = (idx: number, alt: string) => {
    setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, alt } : img)));
  };

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;

    if (!agent) {
      if (devMode) {
        setBusy(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
        setBusy(false);
        setText("");
        setImages([]);
        onPublished(
          `https://bsky.app/profile/${OWNER_HANDLE}/post/mock-dev-rkey`,
        );
      }
      return;
    }

    setBusy(true);
    try {
      const uploaded = await Promise.all(
        images.map((img) => uploadImage(agent, img.file)),
      );

      const rt = new RichText({ text: text.trim() });
      await rt.detectFacets(agent);

      const embed =
        uploaded.length > 0
          ? {
              $type: "app.bsky.embed.images" as const,
              images: uploaded.map((u, i) => ({
                alt: images[i].alt || "",
                image: u.blob,
                aspectRatio: { width: u.width, height: u.height },
              })),
            }
          : undefined;

      const res = await agent.post({
        text: rt.text,
        facets: rt.facets,
        embed,
        createdAt: new Date().toISOString(),
      });

      const rkey = res.uri.split("/").pop();
      setText("");
      setImages([]);
      onPublished(
        `https://bsky.app/profile/${OWNER_HANDLE}/post/${rkey}`,
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={publish} className="flex min-h-0 flex-1 flex-col gap-0">
      {/* Writing surface — bare paper, no box */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's up?"
        autoFocus
        className={`min-h-[160px] w-full flex-1 resize-none bg-transparent px-1 py-2 leading-relaxed text-ink placeholder-ink-3 outline-none ${
          fullscreen ? "text-[17px]" : "text-[16px]"
        }`}
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 ${editingAlt === null ? "mb-4" : ""}`}>
          {images.map((img, idx) => (
            <div key={img.preview} className="group relative">
              <img
                src={img.preview}
                alt={img.alt || "Upload preview"}
                className="h-28 w-full rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                aria-label="Remove image"
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={() => setEditingAlt(editingAlt === idx ? null : idx)}
                className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase backdrop-blur-sm transition-colors ${
                  img.alt
                    ? "bg-accent/90 text-white"
                    : "bg-black/60 text-zinc-300 hover:text-white"
                }`}
              >
                alt
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Alt text editor */}
      {editingAlt !== null && images[editingAlt] && (
        <div className="mt-3 mb-4 flex items-center gap-2 rounded-lg border border-line bg-raise px-3 py-2">
          <span className="shrink-0 font-mono text-[11px] text-ink-2">
            alt · image {editingAlt + 1}
          </span>
          <input
            type="text"
            value={images[editingAlt].alt}
            onChange={(e) => updateAlt(editingAlt, e.target.value)}
            placeholder="Describe this image for accessibility…"
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder-ink-3 outline-none"
          />
          <button
            type="button"
            onClick={() => setEditingAlt(null)}
            className="shrink-0 font-mono text-[11px] text-accent hover:opacity-80"
          >
            done
          </button>
        </div>
      )}

      {/* Footer */}
      <div
        className={`flex items-center justify-between gap-3 border-t border-line ${
          fullscreen ? "py-4" : "pt-3"
        }`}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={images.length >= MAX_IMAGES}
          className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 font-mono text-[12px] text-ink-3 transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ImagePlus size={15} />
          {images.length > 0 ? `media ${images.length}/${MAX_IMAGES}` : "media"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => addImages(e.target.files)}
        />

        <div className="flex items-center gap-4">
          <CharRing used={text.length} />
          <button
            type="submit"
            disabled={busy || (!agent && !devMode) || !text.trim() || remaining < 0}
            title="Publish"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-5"
          >
            <span className="hidden sm:inline">{busy ? "Publishing…" : "Publish"}</span>
            <Send size={16} className={`sm:hidden ${busy ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </div>
    </form>
  );
};

export default PostComposer;
