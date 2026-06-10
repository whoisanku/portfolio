import { Lock, LockOpen, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import blueskyLogo from "../assets/bsky.svg";
import { useAuth } from "../auth/AuthContext";
import { OWNER_HANDLE, PUBLIC_API } from "../lib/config";
import AdminModal from "./AdminModal";
import AnimatedSign from "./AnimatedSign";
import BackgroundDots from "./BackgroundDots";
import OrbitNav from "./OrbitNav";

const Layout = () => {
  const { status, error: authError, signIn, openModal } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(OWNER_HANDLE)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
      .then((data: { avatar?: string }) => {
        if (data.avatar) {
          // Preload the image in browser cache so it displays instantly when dropdown is opened
          const img = new Image();
          img.src = data.avatar;
          setAvatarUrl(data.avatar);
        }
      })
      .catch((err) => {
        console.error("Error fetching avatar:", err);
      });
  }, []);

  const isSignedIn = status === "signed-in";

  const handleLockClick = () => {
    if (isSignedIn) {
      openModal();
    } else {
      setDropdownOpen((prev) => !prev);
    }
  };

  // Close dropdown on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen, handleOutsideClick]);

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden">
      <BackgroundDots />

      {/* Lock icon — fixed top-right */}
      <div ref={dropdownRef} className="fixed top-5 right-5 z-50">
        <button
          type="button"
          onClick={handleLockClick}
          className={`group flex h-10 w-10 items-center justify-center transition-all duration-300 ${
            isSignedIn
              ? "text-blue-400 hover:text-blue-300"
              : "text-zinc-600 hover:text-zinc-300"
          }`}
          aria-label={isSignedIn ? "Open admin panel" : "Admin sign in"}
        >
          {isSignedIn ? (
            <LockOpen size={18} className="transition-transform group-hover:scale-110" />
          ) : (
            <Lock size={18} className="transition-transform group-hover:scale-110" />
          )}
        </button>

        {/* Dropdown popover */}
        {dropdownOpen && !isSignedIn && (
          <div className="admin-dropdown">
            {/* Arrow */}
            <div className="admin-dropdown-arrow" />

            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={blueskyLogo}
                  alt="Bluesky"
                  className="h-5 w-5 object-contain"
                />
                <span className="text-sm font-medium text-zinc-200">
                  Bluesky OAuth
                </span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                Sign in to write posts &amp; blogs.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  void signIn();
                }}
                disabled={status === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={OWNER_HANDLE}
                    className="h-5 w-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <User size={12} className="text-zinc-500" />
                  </div>
                )}
                <span>{OWNER_HANDLE}</span>
              </button>
              {authError && (
                <p className="text-xs text-red-400">{authError}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Modal */}
      <AdminModal />

      <header className="flex justify-center pt-2">
        <OrbitNav />
      </header>

      <main className="w-full max-w-3xl flex-1 px-4 pb-16">
        <Outlet />
      </main>

      <footer className="flex flex-col items-center pb-7">
        <div className="w-48">
          <AnimatedSign />
        </div>
        <p className="-mt-6 text-zinc-300">I love product designing &amp; AI!</p>
        <div className="mt-3 flex items-center gap-4">
          <a
            href={`https://bsky.app/profile/${OWNER_HANDLE}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Bluesky profile"
          >
            <img
              src={blueskyLogo}
              alt="Bluesky"
              className="h-6 w-6 object-contain opacity-70 transition-opacity hover:opacity-100"
            />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
