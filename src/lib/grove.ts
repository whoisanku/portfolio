import { StorageClient, immutable } from "@lens-chain/storage-client";
import { compressImage, getImageDimensions } from "./mediaUpload";

/**
 * Lens Grove storage — permanent, immutable image hosting.
 *
 * Unlike PDS blobs (which can be garbage-collected when unreferenced),
 * Grove files uploaded with an immutable ACL stay put, so blog markdown
 * can embed the gateway URL directly and render anywhere (this site,
 * whtwnd.com, any atproto client).
 */
const LENS_CHAIN_ID = 232; // Lens Chain mainnet

let client: StorageClient | null = null;

function getClient(): StorageClient {
  client ??= StorageClient.create();
  return client;
}

export interface GroveImage {
  url: string;
  width: number;
  height: number;
}

/** Compress an image client-side, upload to Grove, return its permanent URL. */
export async function uploadImageToGrove(file: File): Promise<GroveImage> {
  const [dims, compressed] = await Promise.all([
    getImageDimensions(file),
    compressImage(file),
  ]);

  const upload = new File(
    [compressed.data as BlobPart],
    file.name || "image",
    { type: compressed.mimeType },
  );

  const { gatewayUrl } = await getClient().uploadFile(upload, {
    acl: immutable(LENS_CHAIN_ID),
  });

  return { url: gatewayUrl, width: dims.width, height: dims.height };
}
