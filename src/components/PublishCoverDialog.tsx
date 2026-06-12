import { Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

export interface CoverImage {
  url: string;
  width?: number;
  height?: number;
}

interface PublishCoverDialogProps {
  coverImage: CoverImage | null;
  uploading: boolean;
  publishing: boolean;
  publishLabel: string;
  onDismiss: () => void;
  onFileSelect: (files: FileList | null) => void;
  onRemoveCover: () => void;
  onPublish: () => void;
}

const PublishCoverDialog = ({
  coverImage,
  uploading,
  publishing,
  publishLabel,
  onDismiss,
  onFileSelect,
  onRemoveCover,
  onPublish,
}: PublishCoverDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!uploading && !publishing) onFileSelect(event.dataTransfer.files);
  };

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-paper/85 px-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-cover-title"
        aria-describedby="publish-cover-description"
        className="w-full max-w-md rounded-[10px] border border-line bg-paper p-4 shadow-2xl shadow-ink/10"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="publish-cover-title"
          className="font-display text-[20px] font-medium text-ink"
        >
          Add a cover image?
        </h2>
        <p
          id="publish-cover-description"
          className="mt-2 text-sm leading-relaxed text-ink-2"
        >
          Covers stand out in your index and in link previews when shared. You
          can also publish without one.
        </p>

        <div
          className="mt-4"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {coverImage && !uploading ? (
            <div className="group relative overflow-hidden rounded-lg border border-line">
              <img
                src={coverImage.url}
                alt="Cover preview"
                className="aspect-video w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/45 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={openPicker}
                  className="rounded-lg bg-paper px-3 py-2 font-mono text-[11px] text-ink transition-colors hover:text-accent"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={onRemoveCover}
                  className="rounded-lg bg-paper px-3 py-2 font-mono text-[11px] text-ink transition-colors hover:text-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading || publishing}
              className={`flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg transition-colors ${
                dragging
                  ? "bg-accent/10 ring-1 ring-accent"
                  : "bg-raise hover:bg-raise/70"
              } disabled:cursor-default`}
            >
              {uploading ? (
                <>
                  <span className="cover-upload-bar" aria-hidden="true">
                    <span />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                    Uploading cover…
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper text-accent">
                    <Upload size={18} />
                  </span>
                  <span className="text-sm text-ink-2">
                    Drop an image, or{" "}
                    <span className="font-medium text-accent">browse</span>
                  </span>
                </>
              )}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading || publishing}
            onChange={(event) => {
              onFileSelect(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onPublish}
            disabled={uploading || publishing}
            className={
              coverImage
                ? "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                : "rounded-lg px-3 py-2 font-mono text-[11px] text-ink-3 transition-colors hover:bg-raise hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {publishing ? "Publishing…" : publishLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default PublishCoverDialog;
