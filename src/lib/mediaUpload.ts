import type { Agent } from "@atproto/api";

export interface UploadedImage {
  blob: unknown; // BlobRef from the PDS
  width: number;
  height: number;
  mimeType: string;
}

/** Legacy WhiteWind blob metadata — kept so old entries' blob refs survive edits. */
export interface WhiteWindBlobMetadata {
  blobref: unknown;
  name?: string;
  encoding?: string;
}

/**
 * Read image dimensions from a File using an offscreen Image element.
 */
export function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image dimensions"));
    };
    img.src = url;
  });
}

/**
 * Compress an image client-side using canvas.
 * Strips EXIF, resizes if needed, and returns a Uint8Array and mime type.
 */
export async function compressImage(
  file: File,
  maxDimension = 2048,
  maxSizeBytes = 976_560, // Safely under the AT Protocol 1 MB blob limit.
): Promise<{ data: Uint8Array; mimeType: string }> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });
  URL.revokeObjectURL(url);

  let { naturalWidth: w, naturalHeight: h } = img;

  if (w > maxDimension || h > maxDimension) {
    const ratio = Math.min(maxDimension / w, maxDimension / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to prepare image canvas");
  ctx.drawImage(img, 0, 0, w, h);

  for (const mime of ["image/webp", "image/jpeg"] as const) {
    for (let quality = 0.92; quality >= 0.5; quality -= 0.1) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, quality),
      );
      if (blob && blob.size <= maxSizeBytes) {
        const buf = await blob.arrayBuffer();
        return { data: new Uint8Array(buf), mimeType: mime };
      }
    }
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.4),
  );
  if (!blob) throw new Error("Failed to compress image");
  const buf = await blob.arrayBuffer();
  return { data: new Uint8Array(buf), mimeType: "image/jpeg" };
}

/**
 * Upload an image file to the user's PDS via AT Protocol uploadBlob.
 */
export async function uploadImage(
  agent: Agent,
  file: File,
): Promise<UploadedImage> {
  const [dims, compressed] = await Promise.all([
    getImageDimensions(file),
    compressImage(file),
  ]);

  const { data: uploadRes } = await agent.uploadBlob(compressed.data, {
    encoding: compressed.mimeType,
  });

  return {
    blob: uploadRes.blob,
    width: dims.width,
    height: dims.height,
    mimeType: compressed.mimeType,
  };
}

