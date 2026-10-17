import { useLayoutEffect, useRef } from "react";
import { GLIDE_EASE, prefersReducedMotion } from "../lib/glide";
import { ownerAvatarSrc, useOwnerProfile } from "../lib/ownerProfile";
import Img from "./Img";

const NAME = "Ankit Bhandari";
const GLIDE_MS = 480;

interface PageBox {
  x: number;
  y: number;
  size: number;
}

/**
 * Where the avatar that just unmounted sat, in page coordinates, for the one
 * mounting in its place to glide in from. Only good for the commit that
 * removed it.
 */
let departed: PageBox | null = null;

const pageBox = (el: HTMLElement): PageBox => {
  const r = el.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, size: r.width };
};

/**
 * The owner's avatar, shared by the home hero and the topbar: a navigation
 * unmounts one copy and mounts the other in the same commit, and the new one
 * glides over from where the old one was (see lib/glide.ts for why it's a
 * compositor animation). The circle holds its spot (and colour) until the
 * image is ready, so a late avatar fades in rather than popping; if Bluesky
 * can't serve it, the circle stays blank.
 */
const OwnerAvatar = ({ className }: { className: string }) => {
  const { avatar } = useOwnerProfile();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const from = departed;
    departed = null;
    if (from && !prefersReducedMotion()) {
      // FLIP: start drawn over the old spot, then let go
      const to = pageBox(el);
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const scale = from.size / to.size;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(scale - 1) > 0.01) {
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
            { transform: "translate(0px, 0px) scale(1)" },
          ],
          { duration: GLIDE_MS, easing: GLIDE_EASE },
        );
      }
    }
    return () => {
      // Measured mid-glide this is where it is on screen, so a quick second
      // navigation carries on from there instead of jumping.
      departed = pageBox(el);
      queueMicrotask(() => {
        departed = null;
      });
    };
  }, []);

  return (
    <div
      ref={ref}
      role={avatar ? undefined : "img"}
      aria-label={avatar ? undefined : NAME}
      className={`${className} shrink-0 origin-top-left overflow-hidden rounded-full border border-line bg-raise`}
    >
      {avatar && (
        <Img
          src={ownerAvatarSrc(avatar)}
          fallbackSrc={avatar}
          alt={NAME}
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
      )}
    </div>
  );
};

/** A small, static copy of the avatar (menus, the chat header, cards). */
export const OwnerAvatarIcon = ({ className, alt = "" }: { className: string; alt?: string }) => {
  const { avatar } = useOwnerProfile();
  return (
    <span className={`${className} block shrink-0 overflow-hidden rounded-full bg-raise`}>
      {avatar && (
        <Img
          src={ownerAvatarSrc(avatar)}
          fallbackSrc={avatar}
          alt={alt}
          className="h-full w-full object-cover"
        />
      )}
    </span>
  );
};

export default OwnerAvatar;
