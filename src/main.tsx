import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { avatarSettled } from "./lib/avatar";

// Hold the first render until the avatar has loaded (or a short cap passes),
// so the page never paints a placeholder avatar and swaps it out.
void avatarSettled.then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
