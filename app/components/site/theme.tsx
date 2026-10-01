import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "~/i18n";
import { Button } from "~/components/ui/button";

export type Theme = "light" | "dark";
export const THEME_KEY = "tsc-theme";

/**
 * Runs in <head> before paint so the saved theme never flashes. Light is the default
 * for everyone (Mahmud's decision) — only an explicit choice switches to dark.
 */
export const themeInitScript = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode — theme just won't persist */
    }
  }

  const label = theme === "dark" ? t.nav.themeLight : t.nav.themeDark;
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
