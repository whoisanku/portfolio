import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { ownerAvatarSrc, useOwnerProfile } from "../lib/ownerProfile";
import Img from "./Img";

const NAME = "Ankit Bhandari";

/**
 * The owner's avatar, shared by the home hero and the topbar through one
 * layoutId so it glides between the two on navigation. The circle holds its
 * spot (and colour) until the image is ready, so a late avatar fades in
 * rather than popping; if Bluesky can't serve it, the circle stays blank.
 */
const OwnerAvatar = ({ className }: { className: string }) => {
  const prefersReduced = useReducedMotion();
  const { avatar } = useOwnerProfile();
  const transition = prefersReduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30 };

  return (
    <m.div
      layoutId="profile-avatar"
      role={avatar ? undefined : "img"}
      aria-label={avatar ? undefined : NAME}
      className={`${className} shrink-0 overflow-hidden rounded-full border border-line bg-raise`}
      transition={transition}
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
    </m.div>
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
