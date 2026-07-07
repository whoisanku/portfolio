/**
 * Manual light/dark switching on top of the token system.
 *
 * `<html data-theme>` is the single source of truth — an inline script in
 * index.html stamps it before first paint (stored preference, else OS scheme),
 * so React only ever reads and flips it. localStorage keeps a preference only
 * while it differs from the OS: toggling back to the OS value drops the
 * override, so the site quietly resumes following OS scheme changes.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/* Browser-chrome tint fallbacks if the CSS tokens can't be read */
const THEME_COLOR: Record<Theme, string> = {
  light: "#f6f7f9",
  dark: "#101216",
};

function osTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null; // storage unavailable (privacy mode) — OS scheme still works
  }
}

export function resolvedTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // Keep the browser chrome (mobile URL bar) on the paper color
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (meta) {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg")
      .trim();
    meta.content = bg || THEME_COLOR[theme];
  }
}

export function toggleTheme(): Theme {
  const next: Theme = resolvedTheme() === "dark" ? "light" : "dark";
  try {
    if (next === osTheme()) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable — still switch for this visit
  }
  applyTheme(next);
  return next;
}

/** Follow live OS scheme changes while no explicit preference is stored. */
export function watchOsTheme(onChange: (theme: Theme) => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = () => {
    if (storedTheme()) return;
    const theme = osTheme();
    applyTheme(theme);
    onChange(theme);
  };
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
