import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { profileSettled } from "./lib/ownerProfile";

// Hold the first render until the profile has loaded (or a short cap passes),
// so the page never paints a placeholder avatar or name and swaps it out.
void profileSettled.then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
