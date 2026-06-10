import { RichText } from "@atproto/api";
import { ImagePlus, X } from "lucide-react";
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
  onPublished: (url: string) => void;
  onError: (msg: string) => void;
}

const PostComposer = ({ agent, devMode, onPublished, onError }: PostComposerProps) => {
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
        // Simulate a small delay
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
      // Upload images in parallel
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
    <form onSubmit={publish} className="flex flex-col gap-4">
      {/* Text area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's up?"
          rows={5}
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-[0.95rem] leading-relaxed text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-blue-500/60"
        />
      </div>

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {images.map((img, idx) => (
            <div key={img.preview} className="group relative">
              <img
                src={img.preview}
                alt={img.alt || "Upload preview"}
                className="h-28 w-full rounded-lg border border-zinc-800 object-cover"
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-zinc-300 opacity-0 backdrop-blur-sm transition-opacity hover:text-red-400 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
              {/* ALT badge */}
              <button
                type="button"
                onClick={() =>
                  setEditingAlt(editingAlt === idx ? null : idx)
                }
                className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm transition-colors ${
                  img.alt
                    ? "bg-blue-600/80 text-white"
                    : "bg-black/60 text-zinc-400 hover:text-white"
                }`}
              >
                ALT
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Alt text editor */}
      {editingAlt !== null && images[editingAlt] && (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-zinc-400">
            ALT for image {editingAlt + 1}:
          </span>
          <input
            type="text"
            value={images[editingAlt].alt}
            onChange={(e) => updateAlt(editingAlt, e.target.value)}
            placeholder="Describe this image for accessibility…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
          />
          <button
            type="button"
            onClick={() => setEditingAlt(null)}
            className="text-xs text-blue-500 hover:text-blue-400"
          >
            Done
          </button>
        </div>
      )}

      {/* Toolbar & publish */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Image upload button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={images.length >= MAX_IMAGES}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ImagePlus size={18} />
            <span className="hidden sm:inline">
              {images.length > 0
                ? `${images.length}/${MAX_IMAGES}`
                : "Media"}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => addImages(e.target.files)}
          />

          {/* Character count */}
          <span
            className={`text-xs tabular-nums ${
              remaining < 0
                ? "text-red-400"
                : remaining < 50
                  ? "text-amber-400"
                  : "text-zinc-600"
            }`}
          >
            {remaining}
          </span>
        </div>

        <button
          type="submit"
          disabled={busy || (!agent && !devMode) || !text.trim() || remaining < 0}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Publishing…" : "Publish post"}
        </button>
      </div>
    </form>
  );
};

export default PostComposer;
