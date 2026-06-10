import type { Agent } from "@atproto/api";

export interface UploadedImage {
  blob: unknown; // BlobRef from the PDS
  width: number;
  height: number;
  mimeType: string;
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
 * Strips EXIF, resizes if needed, and returns a Uint8Array + mime type.
 */
export async function compressImage(
  file: File,
  maxDimension = 2048,
  maxSizeBytes = 976_560, // ~976 KB, safely under AT Proto 1MB limit
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

  // Scale down if either dimension exceeds max
  if (w > maxDimension || h > maxDimension) {
    const ratio = Math.min(maxDimension / w, maxDimension / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  // Try WebP first, fall back to JPEG
  for (const mime of ["image/webp", "image/jpeg"] as const) {
    for (let quality = 0.92; quality >= 0.5; quality -= 0.1) {
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, mime, quality),
      );
      if (blob && blob.size <= maxSizeBytes) {
        const buf = await blob.arrayBuffer();
        return { data: new Uint8Array(buf), mimeType: mime };
      }
    }
  }

  // Last resort: lowest quality JPEG
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", 0.4),
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

/**
 * Upload an image and return a PDS-hosted URL for use in markdown.
 * The URL pattern is: https://<pds>/xrpc/com.atproto.sync.getBlob?did=<did>&cid=<cid>
 */
export async function uploadImageForMarkdown(
  agent: Agent,
  file: File,
): Promise<string> {
  const compressed = await compressImage(file);

  const { data: uploadRes } = await agent.uploadBlob(compressed.data, {
    encoding: compressed.mimeType,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blobRef = uploadRes.blob as any;
  const did = agent.assertDid;
  const cid = blobRef?.ref?.$link ?? blobRef?.ref?.toString?.() ?? String(blobRef.ref);

  // Construct the blob URL from the agent's PDS
  return `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
}
