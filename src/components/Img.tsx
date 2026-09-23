import { useCallback, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";

type ImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  /** Tried once if `src` fails (e.g. the original behind an optimized URL). */
  fallbackSrc?: string;
  /** Fade in once loaded. Off for images whose opacity is styled elsewhere. */
  fade?: boolean;
};

/**
 * The site's <img>: async decoding by default, a soft fade-in once the image
 * has actually loaded (so it never paints top-to-bottom or pops in), and an
 * optional fallback source. Images already in the cache show immediately,
 * without the fade. Give the wrapper a background (bg-raise) and a size so
 * the slot holds its shape while loading.
 */
const Img = ({
  src,
  fallbackSrc,
  fade = true,
  className = "",
  onLoad,
  onError,
  decoding = "async",
  alt = "",
  ...rest
}: ImgProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const fallback = fallbackSrc && fallbackSrc !== src ? fallbackSrc : undefined;
  const activeSrc = failedSrc === src && fallback ? fallback : src;
  const [loaded, setLoaded] = useState<{ src: string; how: "instant" | "fade" } | null>(null);

  // A cached image is complete by the time it's attached; mark it loaded
  // before first paint so it shows at once instead of fading in.
  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        setLoaded((prev) => (prev?.src === activeSrc ? prev : { src: activeSrc, how: "instant" }));
      }
    },
    [activeSrc],
  );

  const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    setLoaded((prev) => (prev?.src === activeSrc ? prev : { src: activeSrc, how: "fade" }));
    onLoad?.(e);
  };

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    if (fallback && failedSrc !== src) setFailedSrc(src);
    else onError?.(e);
  };

  const usingFallback = activeSrc !== src;

  return (
    <img
      {...rest}
      // The fallback replaces the whole candidate set, not just `src`.
      srcSet={usingFallback ? undefined : rest.srcSet}
      sizes={usingFallback ? undefined : rest.sizes}
      ref={ref}
      src={activeSrc}
      alt={alt}
      decoding={decoding}
      onLoad={handleLoad}
      onError={handleError}
      // CSS (.img-fade) hides it until loaded, then fades it in with a
      // one-shot animation — so it never fights the image's own transitions.
      data-loaded={loaded?.src === activeSrc ? loaded.how : undefined}
      className={fade ? `img-fade ${className}` : className}
    />
  );
};

export default Img;
