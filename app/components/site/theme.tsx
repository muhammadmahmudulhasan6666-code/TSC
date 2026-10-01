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
      {/* Icons are driven by the html[data-theme] attribute, so the right one shows before hydration. */}
      <span className="relative grid size-5 place-items-center">
        <Sun className="absolute size-5 text-primary transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [[data-theme=dark]_&]:rotate-90 [[data-theme=dark]_&]:scale-0 [[data-theme=dark]_&]:opacity-0" />
        <Moon className="absolute size-5 -rotate-90 scale-0 text-gold-2 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [[data-theme=dark]_&]:rotate-0 [[data-theme=dark]_&]:scale-100 [[data-theme=dark]_&]:opacity-100" />
      </span>
    </button>
  );
}
