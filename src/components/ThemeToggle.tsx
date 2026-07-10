import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  resolvedTheme,
  toggleTheme,
  watchOsTheme,
  type Theme,
} from "../lib/theme";

/** Topbar sun/moon switch — the icon shows the theme a click switches to. */
const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(() => resolvedTheme());
  const prefersReduced = useReducedMotion();

  useEffect(() => watchOsTheme(setTheme), []);

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      className="pressable relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-3 transition-colors duration-200 hover:bg-raise hover:text-ink -translate-y-1"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {/* No mode="wait": the outgoing and incoming icons overlap (absolute) and
          crossfade in place, so a frequently-tapped control never waits for the
          old icon to leave before the new one arrives. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={theme}
          className="absolute inset-0 flex items-center justify-center"
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, rotate: -50, scale: 0.7 }}
          animate={prefersReduced ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, rotate: 50, scale: 0.7 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

export default ThemeToggle;
