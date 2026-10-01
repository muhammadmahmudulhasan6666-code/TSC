import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "~/i18n";

export type Theme = "light" | "dark";
export const THEME_KEY = "tsc-theme";

/**
 * Runs in <head> before paint so the saved theme never flashes. Light is the default
 * for everyone (Mahmud's decision) — only an explicit choice switches to dark.
 */
export const themeInitScript = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

function applyTheme(next: Theme) {
  const root = document.documentElement;
  if (next === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#050c08" : "#fbf8f6");
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* private mode — theme just won't persist */
  }
}

/** Round glass button; the sun and moon swap with a spin. Uses a view transition where supported. */
export function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => applyTheme(next));
    else applyTheme(next);
  }

  const label = theme === "dark" ? t.nav.themeLight : t.nav.themeDark;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="glass grid size-11 place-items-center overflow-hidden rounded-full text-text transition-transform duration-300 hover:-translate-y-0.5 active:scale-95"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="relative grid place-items-center"
        >
          {theme === "dark" ? <Moon className="size-5 text-gold-2" /> : <Sun className="size-5 text-primary" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
