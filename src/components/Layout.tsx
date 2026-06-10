import { Lock, LockOpen, User } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import blueskyLogo from "../assets/bsky.svg";
import { useAuth } from "../auth/AuthContext";
import { OWNER_HANDLE, PUBLIC_API } from "../lib/config";
import AdminModal from "./AdminModal";
import AnimatedSign from "./AnimatedSign";

const navItems = [
  { to: "/", label: "work" },
  { to: "/blog", label: "blog" },
  { to: "/posts", label: "posts" },
];

/**
 * Editorial topbar: mono handle on the left; on the right a three-word nav
 * where the active word flips from mono into accent serif italic, with a
 * shared underline that slides between items.
 */
const TopNav = () => {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to) || (to === "/posts" && pathname === "/post");

  return (
    <nav className="flex items-center gap-6" aria-label="Primary">
      {navItems.map((item) => {
        const active = isActive(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className="group relative pb-1 text-[13px] tracking-[0.03em] transition-colors duration-200"
          >
            <span
              className={
                active
                  ? "font-display text-[17px] italic text-accent"
                  : "font-mono text-ink-3 group-hover:text-ink"
              }
            >
              {item.label}
            </span>
            {active && (
              <motion.span
                layoutId="nav-underline"
                className="absolute right-0 -bottom-px left-0 h-px bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

const AdminLock = ({ avatarUrl }: { avatarUrl: string | null }) => {
  const { status, error: authError, signIn, openModal } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSignedIn = status === "signed-in";

  const handleLockClick = () => {
    if (isSignedIn) {
      openModal();
    } else {
      setDropdownOpen((prev) => !prev);
    }
  };

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [dropdownOpen, handleOutsideClick]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={handleLockClick}
        className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-200 ${isSignedIn
          ? "border-accent text-accent"
          : "border-line text-ink-3 hover:border-accent hover:text-accent"
          }`}
        aria-label={isSignedIn ? "Open admin panel" : "Admin sign in"}
      >
        {isSignedIn ? <LockOpen size={13} /> : <Lock size={13} />}
      </button>

      {dropdownOpen && !isSignedIn && (
        <div className="admin-dropdown">
          <div className="admin-dropdown-arrow" />
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <img src={blueskyLogo} alt="Bluesky" className="h-[15px] w-[15px] object-contain -translate-y-[1.5px]" />
              <span className="text-sm font-medium leading-none text-ink">Bluesky OAuth</span>
            </div>
            <p className="text-xs leading-relaxed text-ink-3">
              Sign in to write posts &amp; blogs.
            </p>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                void signIn();
              }}
              disabled={status === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={OWNER_HANDLE}
                  className="h-5 w-5 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raise">
                  <User size={12} className="text-ink-3" />
                </span>
              )}
              <span>{OWNER_HANDLE}</span>
            </button>
            {authError && <p className="text-xs text-red-500">{authError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const Layout = () => {
  const { pathname } = useLocation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      `${PUBLIC_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(OWNER_HANDLE)}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
      .then((data: { avatar?: string }) => {
        if (data.avatar) {
          const img = new Image();
          img.src = data.avatar;
          setAvatarUrl(data.avatar);
        }
      })
      .catch((err) => {
        console.error("Error fetching avatar in Layout:", err);
      });
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[660px] flex-col px-7 pt-8 pb-24">
      <AdminModal />

      <header className="mb-16 flex items-center justify-between gap-4 sm:mb-20">
        {pathname !== "/" ? (
          <Link to="/" className="group flex items-center gap-3">
            {avatarUrl ? (
              <motion.img
                layoutId="profile-avatar"
                src={avatarUrl}
                alt="Ankit Bhandari"
                className="h-9 w-9 rounded-full border border-line object-cover"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : (
              <motion.div
                layoutId="profile-avatar"
                className="h-9 w-9 rounded-full border border-line bg-raise"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-5">
          <TopNav />
          <AdminLock avatarUrl={avatarUrl} />
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={{ avatarUrl }} />
      </main>

      <footer className="mt-28 flex flex-col gap-2.5">
        <div className="w-28 text-accent">
          <AnimatedSign />
        </div>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-2">i love product designing &amp; ai.</p>
          <div className="flex items-center gap-4 text-ink-3">
            <a
              href="https://www.linkedin.com/in/whoisanku/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-3 hover:text-accent transition-colors duration-200"
              aria-label="LinkedIn"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[16px] w-[16px]"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a
              href={`https://bsky.app/profile/${OWNER_HANDLE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-3 hover:text-accent transition-colors duration-200"
              aria-label="Bluesky"
            >
              <svg
                viewBox="0 0 600 530"
                className="h-[16px] w-[16px] translate-y-[0.5px]"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
              </svg>
            </a>
            <a
              href="https://x.com/whoisanku"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-3 hover:text-accent transition-colors duration-200"
              aria-label="X (formerly Twitter)"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[15px] w-[15px] translate-y-[0.5px]"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/whoisanku"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-3 hover:text-accent transition-colors duration-200"
              aria-label="GitHub"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[16px] w-[16px]"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
