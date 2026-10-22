import { useEffect, useReducer, useState } from "react";
import { prepareImage, preparedImage, type PreparedImage } from "./image";

/**
 * Whether a page's images are downloaded and decoded (see prepareImage), so
 * it can show its text and pictures in the same frame. Gives up waiting
 * after `maxWaitMs`. Once true it stays true: content already on screen
 * never drops back to its skeleton because a refresh brought new images.
 */
export function useImagesReady(urls: string[], sizes: string, maxWaitMs: number): boolean {
  const allPrepared = urls.every((url) => preparedImage(url, sizes) !== undefined);
  const [shown, setShown] = useState(false);
  if (urls.length > 0 && allPrepared && !shown) setShown(true);

  const urlsKey = urls.join("\n");
  useEffect(() => {
    if (shown || allPrepared) return;
    let live = true;
    const show = () => {
      if (live) setShown(true);
    };
    const timer = setTimeout(show, maxWaitMs);
    void Promise.all(urlsKey.split("\n").map((url) => prepareImage(url, sizes))).then(show);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [shown, allPrepared, urlsKey, sizes, maxWaitMs]);

  return shown || allPrepared;
}

/** One image's prepareImage() result: undefined while it's still loading. */
export function usePreparedImage(url: string, sizes: string): PreparedImage | null | undefined {
  const image = preparedImage(url, sizes);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (image !== undefined) return;
    let live = true;
    void prepareImage(url, sizes).then(() => {
      if (live) rerender();
    });
    return () => {
      live = false;
    };
  }, [image, url, sizes]);
  return image;
}
