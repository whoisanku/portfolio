import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { profileSettled } from "./lib/ownerProfile";
import { loadBlogPostPage } from "./routes";

// A tab opened before a deploy still asks for the old hashed chunks, which
// the new deploy no longer has, and the page goes blank. Reload once to pick
// up the new build; the timestamp stops a loop if the chunk is really broken.
window.addEventListener("vite:preloadError", (event) => {
  const key = "chunk-reload-at";
  try {
    const last = Number(sessionStorage.getItem(key)) || 0;
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage blocked: without the loop guard, don't risk reloading forever.
    return;
  }
  event.preventDefault();
  window.location.reload();
});

// Landing straight on a post: start fetching its page code now, in parallel
// with everything else, rather than after the first render asks for it.
if (window.location.pathname.startsWith("/blog/")) void loadBlogPostPage();

// Hold the first render until the avatar is ready (or a short cap passes),
// so the page never paints a placeholder avatar and swaps it out.
void profileSettled.then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
