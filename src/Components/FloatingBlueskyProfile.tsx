import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AnimateNumber } from "motion-plus-react";

interface BlueskyProfile {
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
  followersCount: number;
}

interface PositionStyle {
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  position?: "absolute" | "fixed" | "relative" | "sticky" | "static";
}

interface FloatingBlueskyProfileProps {
  actorHandle: string;
  position: PositionStyle;
}

const FloatingBlueskyProfile: React.FC<FloatingBlueskyProfileProps> = ({
  actorHandle,
  position,
}) => {
  const [profile, setProfile] = useState<BlueskyProfile | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const url = new URL(
          "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile"
        );
        url.searchParams.append("actor", actorHandle);
        url.searchParams.append("_t", Date.now().toString());

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch Bluesky profile");
        }

        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Error fetching Bluesky profile:", error);
      }
    };

    fetchProfileData();
    const intervalId = setInterval(fetchProfileData, 30000); // Fetch every 30s, AnimateNumber handles UI changes
    return () => clearInterval(intervalId);
  }, [actorHandle]);

  if (!profile) {
    return null;
  }

  const positionStyles: React.CSSProperties = {
    position: "absolute", // Default position if not overridden
    width: "6rem", // 96px, w-24
    height: "6rem", // 96px, h-24
    zIndex: 40, // z-40
    ...position, // Spread the user-provided position object
  };

  // Apply lg breakpoint styles directly if needed or adjust logic
  // For simplicity, this example keeps it basic.
  // You might want to merge lg specific styles if you retain that distinction.

  return (
    <div
      style={positionStyles}
      className="opacity-50 hover:opacity-100 lg:opacity-100 lg:z-50"
    >
      {/* Cosmic Background - Tailwind for animation, inline for gradient (requires config) */}
      <div
        className="absolute inset-[-50px] -z-20 filter blur-2xl animate-[nebula_15s_infinite_ease-in-out]"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.15), transparent 35%),
                          radial-gradient(circle at 70% 60%, rgba(139, 92, 246, 0.15), transparent 30%),
                          radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05), transparent 50%)`,
        }}
      />

      <motion.div
        className="rounded-full border border-gray-300 w-full h-full shadow-xl shadow-blue-500/20 overflow-hidden"
        style={{
          backgroundImage: `url(${profile.avatar})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        animate={{
          y: [0, -10, 0, 10, 0],
          rotate: [0, 0.5, 0, -0.5, 0],
          scale: [1, 1.001, 1, 1.001, 1],
          boxShadow: [
            "0 0 6px rgba(59, 130, 246, 0.1)",
            "0 0 10px rgba(59, 130, 246, 0.2)",
            "0 0 6px rgba(59, 130, 246, 0.1)",
          ],
        }}
        transition={{
          duration: 10,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror",
        }}
      >
        <div className="w-full h-full bg-black/30 backdrop-blur-sm rounded-full flex flex-col items-center justify-center p-2">
          <h3 className="text-xs font-semibold text-white truncate max-w-[90px] text-center mb-0.5">
            {profile.displayName}
          </h3>
          <AnimateNumber
            key={`followers-count-${profile.handle}`}
            transition={{ type: "tween", duration: 0.5 }}
            className="text-sm font-medium text-white"
          >
            {profile.followersCount}
          </AnimateNumber>
        </div>
      </motion.div>
    </div>
  );
};

export default FloatingBlueskyProfile;
