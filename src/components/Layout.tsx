import { Download, Loader2, Lock, LockOpen, LogOut, User, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import blueskyLogo from "../assets/bsky.svg";

const LOCAL_AVATAR = "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/v1781422173/portfolio/profile";
import { useAuth } from "../auth/AuthContext";
import { OWNER_HANDLE, PUBLIC_API } from "../lib/config";
import AdminModal from "./AdminModal";
import AnimatedSign from "./AnimatedSign";
import ChatWidget from "./ChatWidget";
import ThemeToggle from "./ThemeToggle";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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
            className="pressable group relative text-[15px] tracking-[0.03em]"
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
            // ← glides the snake from tab to tab; easing width too so it grows/
            // shrinks smoothly between words of different lengths (no snap)
            transition:
              "left 0.52s var(--ease-out), width 0.52s var(--ease-out), opacity 0.2s ease",
          }}
          viewBox={`0 ${-SVG_H / 2} ${underline.width} ${SVG_H}`}
          preserveAspectRatio="none"
        >
          <path
            d={underline.path}
            fill="none"
            stroke="var(--color-accent, #2a5fd0)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}


    </nav>
  );
};

const DROPDOWN_CARET = 8;
const DROPDOWN_RADIUS = 10;

/**
 * Wraps a dropdown's content and paints its bubble — rounded body + caret — as a
 * single SVG path (so the caret IS the border, no seam), with the caret near the
 * right edge pointing up at the lock icon. Matches the resume tooltip's style.
 * Measures content height so the bubble fits any menu without distortion.
 */
const DropdownShell = ({ width, children }: { width: number; children: React.ReactNode }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (contentRef.current) setHeight(contentRef.current.offsetHeight);
  }, []);

  const top = DROPDOWN_CARET;
  const apex = width - 16; // aim the caret at the lock icon's centre
  const baseL = apex - 6;
  const baseR = apex + 6; // === width - DROPDOWN_RADIUS, so it meets the corner cleanly
  const bottom = top + height;
  const r = DROPDOWN_RADIUS;
  const d =
    `M${r} ${top} L${baseL} ${top} ` +
    `L${apex - 1.5} ${top - 6.3} Q${apex} ${top - 7.5} ${apex + 1.5} ${top - 6.3} ` +
    `L${baseR} ${top} A${r} ${r} 0 0 1 ${width} ${top + r} ` +
    `L${width} ${bottom - r} A${r} ${r} 0 0 1 ${width - r} ${bottom} ` +
    `L${r} ${bottom} A${r} ${r} 0 0 1 0 ${bottom - r} ` +
    `L0 ${top + r} A${r} ${r} 0 0 1 ${r} ${top} Z`;

  return (
    <div className="admin-dropdown" style={{ width }}>
      {height > 0 && (
        <svg
          aria-hidden="true"
          width={width}
          height={bottom}
          viewBox={`0 0 ${width} ${bottom}`}
          style={{
            position: "absolute",
            top: -DROPDOWN_CARET,
            left: 0,
            overflow: "visible",
            pointerEvents: "none",
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.45))",
          }}
        >
          <path
            d={d}
            fill="var(--color-paper)"
            stroke="var(--color-line)"
            strokeWidth="1"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <div ref={contentRef} className="relative">
        {children}
      </div>
    </div>
  );
};

const AdminLock = ({ avatarUrl }: { avatarUrl: string | null }) => {
  const { status, error: authError, signingIn, signIn, signOut, openModal } = useAuth();
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
        className={`pressable flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-raise -translate-y-1 ${signingIn || isSignedIn
          ? "text-accent"
          : "text-ink-3 hover:text-accent"
          }`}
        aria-label={
          signingIn
            ? "Signing in with Bluesky"
            : isSignedIn
              ? "Open admin panel"
              : "Admin sign in"
        }
        aria-busy={signingIn || undefined}
      >
        {signingIn ? (
          <Loader2 size={15} className="animate-spin" />
        ) : isSignedIn ? (
          <LockOpen size={15} />
        ) : (
          <Lock size={15} />
        )}
      </button>

      {/* Signed in: quiet menu — identity, write, sign out */}
      {dropdownOpen && isSignedIn && (
        <DropdownShell width={208}>
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
              className="pressable flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-mono text-[12px] text-ink-3 transition-colors hover:bg-raise hover:text-ink"
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
              className="pressable flex items-center gap-2.5 rounded-lg px-3 py-2 text-left font-mono text-[12px] text-ink-3 transition-colors hover:bg-raise hover:text-ink"
            >
              <LogOut size={13} /> sign out
            </button>
          </div>
        </DropdownShell>
      )}

      {dropdownOpen && !isSignedIn && (
        <DropdownShell width={260}>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <img src={blueskyLogo} alt="Bluesky" className="h-[15px] w-[15px] object-contain -translate-y-[1.5px]" />
              <span className="text-sm font-medium leading-none text-ink">Bluesky OAuth</span>
            </div>
            <p className="text-xs leading-relaxed text-ink-3">
              {signingIn
                ? "Waiting for Bluesky authorization."
                : "Sign in to write posts & blogs."}
            </p>
            <button
              type="button"
              onClick={() => {
                void signIn();
              }}
              disabled={status === "loading" || signingIn}
              aria-live="polite"
              className="pressable flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              {signingIn ? (
                <>
                  <Loader2 size={15} className="shrink-0 animate-spin" />
                  <span>Redirecting to Bluesky...</span>
                </>
              ) : (
                <>
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
                </>
              )}
            </button>
            {authError && <p className="text-xs text-red-500">{authError}</p>}
          </div>
        </DropdownShell>
      )}
    </div>
  );
};

const Layout = () => {
  const { pathname } = useLocation();
  const prefersReduced = useReducedMotion();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showResumeTip, setShowResumeTip] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("resume-tip-seen")) {
      const t = setTimeout(() => setShowResumeTip(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const dismissResumeTip = () => {
    localStorage.setItem("resume-tip-seen", "1");
    setShowResumeTip(false);
  };

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
            <motion.img
              layoutId="profile-avatar"
              src={avatarUrl ?? LOCAL_AVATAR}
              alt="Ankit Bhandari"
              className="h-9 w-9 rounded-full border border-line object-cover"
              transition={prefersReduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }}
            />
          </Link>
        ) : (
          <div className="h-9 w-9" />
        )}
        <div className="flex items-center gap-10">
          <TopNav />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="relative">
              <a
                href="/resume/Ankit Bhandari Resume.pdf.pdf"
                download
                onClick={dismissResumeTip}
                className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition-colors duration-200 hover:bg-raise hover:text-ink -translate-y-1"
                aria-label="Download resume"
              >
                <Download size={15} />
              </a>
              <AnimatePresence>
                {showResumeTip && (
                  <motion.div
                    initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                    animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-3 cursor-pointer"
                    style={{ width: 208, zIndex: 50, transformOrigin: "top right" }}
                    onClick={dismissResumeTip}
                  >
                    {/* Whole bubble — rounded body + caret — is one continuous path, so the
                        caret IS the border (no seam). The caret sits near the right edge,
                        pointing up at the download icon, while the body extends left so the
                        lock's login dialog never overlaps it. */}
                    <svg
                      aria-hidden="true"
                      width="208"
                      viewBox="0 0 208 90"
                      preserveAspectRatio="none"
                      className="absolute left-0"
                      style={{
                        top: -8,
                        height: "calc(100% + 8px)",
                        overflow: "visible",
                        pointerEvents: "none",
                        filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.45))",
                      }}
                    >
                      <path
                        d="M10 8 L186 8 L190.5 1.7 Q192 0.5 193.5 1.7 L198 8 A10 10 0 0 1 208 18 L208 80 A10 10 0 0 1 198 90 L10 90 A10 10 0 0 1 0 80 L0 18 A10 10 0 0 1 10 8 Z"
                        fill="var(--color-paper)"
                        stroke="var(--color-line)"
                        strokeWidth="1"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <div className="relative px-4 py-3.5 flex items-start gap-2.5">
                      <p className="flex-1 font-mono text-[11px] leading-relaxed text-ink-3">
                        Download Ankit's resume as a PDF from here.
                      </p>
                      <button
                        type="button"
                        onClick={dismissResumeTip}
                        className="mt-0.5 shrink-0 text-ink-3 hover:text-ink transition-colors"
                        aria-label="Dismiss"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AdminLock avatarUrl={avatarUrl} />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet context={{ avatarUrl }} />
      </main>

      <footer className="mt-28 flex flex-col gap-1">
        <div className="w-28 text-accent">
          <AnimatedSign />
        </div>
        <p className="text-ink-2">i love product designing &amp; ai.</p>
        <div className="mt-3 -ml-2 flex items-center gap-1 text-ink-3">
            <a
              href="https://www.linkedin.com/in/whoisanku/"
              target="_blank"
              rel="noopener noreferrer"
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-raise hover:text-accent transition-colors duration-200"
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
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-raise hover:text-accent transition-colors duration-200"
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
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-raise hover:text-accent transition-colors duration-200"
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
              href="https://www.threads.net/@whoisanku"
              target="_blank"
              rel="noopener noreferrer"
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-raise hover:text-accent transition-colors duration-200"
              aria-label="Threads"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[16px] w-[16px]"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
              </svg>
            </a>
            <a
              href="mailto:bhandariankit2075@gmail.com"
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-raise hover:text-accent transition-colors duration-200"
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
              className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-raise hover:text-accent transition-colors duration-200"
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
      </footer>

      <ChatWidget ownerAvatar={avatarUrl} />
    </div>
  );
};

export default Layout;
