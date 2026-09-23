import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Fonts are only requested once the text that uses them renders, which is
 * after the app bundle has run. Preloading the handful of latin files the
 * first screen needs starts them alongside the bundle instead, so the first
 * paint already has the right faces (no swap). The hashed file names only
 * exist after bundling, hence a plugin rather than tags in index.html.
 */
const CRITICAL_FONTS =
  /^assets\/(newsreader-latin-opsz-(normal|italic)|schibsted-grotesk-latin-wght-normal|spline-sans-mono-latin-(400|500)-normal)-[\w-]+\.woff2$/;

function preloadCriticalFonts(): Plugin {
  return {
    name: "preload-critical-fonts",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((file) => CRITICAL_FONTS.test(file))
          .map((file) => ({
            tag: "link",
            attrs: {
              rel: "preload",
              href: `/${file}`,
              as: "font",
              type: "font/woff2",
              crossorigin: "",
            },
            injectTo: "head" as const,
          }));
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadCriticalFonts()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // React + the router change far less often than the app, so
              // they get their own long-cached chunk that survives deploys.
              name: "react",
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
