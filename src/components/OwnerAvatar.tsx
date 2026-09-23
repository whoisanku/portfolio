import { motion, useReducedMotion } from "motion/react";

/**
 * The owner's avatar, shared by the home hero and the topbar through one
 * layoutId so it glides between the two on navigation. If Bluesky couldn't
 * serve it, a blank circle of the same size holds the spot.
 */
const OwnerAvatar = ({ src, className }: { src: string | null; className: string }) => {
  const prefersReduced = useReducedMotion();
  const transition = prefersReduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 30 };

  return src ? (
    <motion.img
      layoutId="profile-avatar"
      src={src}
      alt="Ankit Bhandari"
      className={`${className} rounded-full border border-line object-cover`}
      transition={transition}
    />
  ) : (
    <motion.div
      layoutId="profile-avatar"
      role="img"
      aria-label="Ankit Bhandari"
      className={`${className} rounded-full border border-line bg-raise`}
      transition={transition}
    />
  );
};

export default OwnerAvatar;
