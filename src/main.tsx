import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { profileSettled } from "./lib/ownerProfile";
import { loadBlogPostPage } from "./routes";

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
