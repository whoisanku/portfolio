import { useLayoutEffect, useRef } from "react";
import { glide, prefersReducedMotion, type AxisState, type Glide } from "../lib/glide";
import { ownerAvatarSrc, useOwnerProfile } from "../lib/ownerProfile";
import Img from "./Img";

const NAME = "Ankit Bhandari";

type Box = Record<"x" | "y" | "size", AxisState>;

/**
 * Where the avatar that just unmounted sat, in page coordinates, and how
 * fast it was moving, for the one mounting in its place to glide on from.
 * Only good for the commit that removed it.
 */
let departed: Box | null = null;

const pageBox = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, size: r.width };
};

/**
 * The owner's avatar, shared by the home hero and the topbar: a navigation
 * unmounts one copy and mounts the other in the same commit, and the new one
 * springs over from where the old one was (see lib/glide.ts for why it's a
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
    let running: Glide<keyof Box> | null = null;
    if (from && !prefersReducedMotion()) {
      // FLIP: start drawn over the old spot, then let go
      const to = pageBox(el);
      const dx = from.x.value - to.x;
      const dy = from.y.value - to.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(from.size.value - to.size) > 1) {
        running = glide(
          el,
          {
            x: { from: dx, to: 0, velocity: from.x.velocity },
            y: { from: dy, to: 0, velocity: from.y.velocity },
            size: { from: from.size.value, to: to.size, velocity: from.size.velocity },
          },
          (at) => `translate(${at.x}px, ${at.y}px) scale(${at.size / to.size})`,
        );
      }
    }
    return () => {
      // Measured mid-glide this is where it is on screen, so a quick second
      // navigation carries on from there, at the same speed, instead of
      // jumping.
      const box = pageBox(el);
      const now = running?.now();
      departed = {
        x: { value: box.x, velocity: now?.x.velocity ?? 0 },
        y: { value: box.y, velocity: now?.y.velocity ?? 0 },
        size: { value: box.size, velocity: now?.size.velocity ?? 0 },
      };
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
