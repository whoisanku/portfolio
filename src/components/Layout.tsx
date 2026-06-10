import { Lock } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import blueskyLogo from "../assets/bsky.svg";
import { OWNER_HANDLE } from "../lib/config";
import AnimatedSign from "./AnimatedSign";
import BackgroundDots from "./BackgroundDots";
import OrbitNav from "./OrbitNav";

const Layout = () => (
  <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden">
    <BackgroundDots />

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
            className="h-6 w-6 opacity-70 transition-opacity hover:opacity-100"
          />
        </a>
        {/* Discreet admin entry — owner-only OAuth sign-in lives behind this. */}
        <Link
          to="/admin"
          aria-label="Admin"
          className="text-zinc-700 transition-colors hover:text-blue-500"
        >
          <Lock size={14} />
        </Link>
      </div>
    </footer>
  </div>
);

export default Layout;
