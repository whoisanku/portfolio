import { Lock, LockOpen, LogOut, User } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import blueskyLogo from "../assets/bsky.svg";
import { useAuth } from "../auth/AuthContext";
import { OWNER_HANDLE, PUBLIC_API } from "../lib/config";
import AdminModal from "./AdminModal";
import AnimatedSign from "./AnimatedSign";
import { motion } from "motion/react";

const navItems = [
  { to: "/", label: "work" },
  { to: "/blog", label: "blog" },
  { to: "/posts", label: "posts" },
];

/** Builds a wavy SVG path string across a given pixel width */
function buildWavyPath(width: number): string {
  const amplitude = 2.2;
  const period = 8;
  const cycles = Math.max(2, Math.ceil(width / period));
  const totalWidth = cycles * period;
  const offsetX = (totalWidth - width) / 2;
  let d = `M ${-offsetX} ${amplitude}`;
  for (let i = 0; i < cycles; i++) {
    const x1 = -offsetX + i * period + period / 4;
    const x2 = -offsetX + i * period + (3 * period) / 4;
    const x3 = -offsetX + (i + 1) * period;
    d += ` C ${x1} ${-amplitude}, ${x2} ${amplitude * 3}, ${x3} ${amplitude}`;
  }
  return d;
}

/**
 * Editorial topbar: mono handle on the left; on the right a three-word nav
 * where the active word turns accent, with a snake-style wavy underline that
 * glides between items (CSS transition) and continuously slithers (dashoffset flow).
 */
const TopNav = () => {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to) || (to === "/posts" && pathname === "/post");

  const activeIndex = navItems.findIndex((item) => isActive(item.to));

  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const navRef = useRef<HTMLElement>(null);

  const [underline, setUnderline] = useState<{
    left: number;
    width: number;
    path: string;
  } | null>(null);

  // One-shot "draw on" for first mount
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const el = linkRefs.current[activeIndex];
    const nav = navRef.current;
    if (!el || !nav) return;

    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const shrinkAmount = 10;
    const left = elRect.left - navRect.left + shrinkAmount / 2;
    const width = elRect.width - shrinkAmount;

    setUnderline((prev) => {
      // Rebuild path only when width actually changes (avoid thrash)
      const path =
        prev && Math.abs(prev.width - width) < 1 ? prev.path : buildWavyPath(width);
      return { left, width, path };
    });

    // Mark ready after first measurement so the SVG fades in instead of popping
    if (!ready) requestAnimationFrame(() => setReady(true));
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const SVG_H = 8;

  return (
    <nav ref={navRef} className="relative flex items-center gap-6" aria-label="Primary">
      {navItems.map((item, i) => {
        const active = isActive(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            ref={(el) => { linkRefs.current[i] = el; }}
            className="group relative text-[15px] tracking-[0.03em]"
            style={{ paddingBottom: 8 }}
          >
            <span
              className={`font-mono transition-colors duration-200 ${active ? "text-accent" : "text-ink-3 group-hover:text-ink"
                }`}
            >
              {item.label}
            </span>
          </NavLink>
        );
      })}

      {/* Persistent snake SVG — position glides via CSS transition, stroke flows continuously */}
      {underline && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 0,
            left: underline.left,
            width: underline.width,
            height: SVG_H,
            overflow: "visible",
            pointerEvents: "none",
            opacity: ready ? 1 : 0,
            // ← this single transition makes the snake glide from tab to tab
            transition: "left 0.52s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
          }}
          viewBox={`0 ${-SVG_H / 2} ${underline.width} ${SVG_H}`}
          preserveAspectRatio="none"
        >
          <path
            d={underline.path}
            fill="none"
            stroke="var(--color-accent, #e8613a)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}


    </nav>
  );
};

const AdminLock = ({ avatarUrl }: { avatarUrl: string | null }) => {
  const { status, error: authError, signIn, signOut, openModal } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSignedIn = status === "signed-in";

  const handleLockClick = () => {
    setDropdownOpen((prev) => !prev);
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
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-raise -translate-y-1 ${isSignedIn
          ? "text-accent"
          : "text-ink-3 hover:text-accent"
          }`}
        aria-label={isSignedIn ? "Open admin panel" : "Admin sign in"}
      >
        {isSignedIn ? <LockOpen size={15} /> : <Lock size={15} />}
      </button>

      {/* Signed in: quiet menu — identity, write, sign out */}
      {dropdownOpen && isSignedIn && (
        <div className="admin-dropdown" style={{ width: 208 }}>
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={OWNER_HANDLE}
                className="h-6 w-6 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raise">
                <User size={12} className="text-ink-3" />
              </span>
            )}
            <span className="truncate font-mono text-[11px] text-ink-3">
              @{OWNER_HANDLE}
            </span>
          </div>
          <div className="flex flex-col p-1.5">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                openModal();
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-mono text-[12px] text-ink-3 transition-colors hover:bg-raise hover:text-ink"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[13px] w-[13px]"
              >
                <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              write
            </button>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                void signOut();
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-mono text-[12px] text-ink-3 transition-colors hover:bg-raise hover:text-ink"
            >
              <LogOut size={13} /> sign out
            </button>
          </div>
        </div>
      )}

      {dropdownOpen && !isSignedIn && (
        <div className="admin-dropdown">
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
    <div className="mx-auto flex min-h-screen w-full max-w-[660px] flex-col px-7 pt-8 pb-12">
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
          <div className="h-9 w-9" />
        )}
        <div className="flex items-center gap-5">
          <TopNav />
          <AdminLock avatarUrl={avatarUrl} />
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={{ avatarUrl }} />
      </main>

      <footer className="mt-28 flex flex-col gap-1">
        <div className="w-28 text-accent">
          <AnimatedSign />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              href="mailto:bhandariankit2075@gmail.com"
              className="text-ink-3 hover:text-accent transition-colors duration-200"
              aria-label="Email"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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
