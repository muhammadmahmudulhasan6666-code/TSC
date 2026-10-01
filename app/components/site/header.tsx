import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { LogIn, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { localizePath, stripLocale, useLocale } from "~/i18n";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/cn";
import { BrandLink } from "./brand";
import { ThemeToggle } from "./theme";

/** Segmented "বাং | EN" switch with a sliding thumb. */
export function LanguageSwitch() {
  const { locale, t } = useLocale();
  const bare = stripLocale(useLocation().pathname);
  const options = [
    { code: "bn" as const, label: "বাং" },
    { code: "en" as const, label: "EN" },
  ];
  return (
    <div role="group" aria-label={t.nav.language} className="glass relative flex h-11 items-center rounded-full p-1">
      {options.map((o) => {
        const active = o.code === locale;
        return (
          <Link
            key={o.code}
            to={localizePath(bare, o.code)}
            hrefLang={o.code}
            aria-current={active ? "true" : undefined}
            className={cn("relative z-10 grid h-9 min-w-11 place-items-center rounded-full px-3 text-sm font-bold transition-colors", active ? "text-on-primary" : "text-muted hover:text-text")}
          >
            {active && <motion.span layoutId="lang-thumb" className="absolute inset-0 -z-10 rounded-full bg-[image:var(--grad-primary)] shadow-[var(--glow-primary)]" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SiteHeader() {
  const { t, href } = useLocale();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  const links: [string, string][] = [
    ["/teachers", t.nav.findTeachers],
    ["/teacher-needed", t.nav.teacherNeeded],
    ["/how-it-works", t.nav.howItWorks],
    ["/pricing", t.nav.pricing],
  ];

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        {t.nav.skipToContent}
      </a>
      <div
        className={cn(
          "mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-2 rounded-full pl-3 pr-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled ? "glass glass-strong shadow-[var(--shadow-lift)]" : "border border-transparent",
        )}
      >
        <BrandLink />
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {links.map(([to, label]) => (
            <NavLink key={to} to={href(to)} className={({ isActive }) => cn("relative rounded-full px-4 py-2 text-[0.95rem] transition-colors", isActive ? "text-text" : "text-muted hover:text-text")}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <LanguageSwitch />
          <ThemeToggle />
          <Button asChild size="sm" className="hidden h-11 sm:inline-flex">
            <Link to={href("/login")}>
              <LogIn aria-hidden />
              {t.nav.login}
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t.nav.menu}
            className="glass grid size-11 place-items-center rounded-full lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="glass glass-strong mx-auto mt-2 max-w-[1200px] rounded-[26px] p-2 lg:hidden"
          >
            {links.map(([to, label], i) => (
              <motion.div key={to} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                <Link to={href(to)} onClick={() => setOpen(false)} className="flex h-12 items-center rounded-2xl px-4 text-lg hover:bg-text/5">
                  {label}
                </Link>
              </motion.div>
            ))}
            <Button asChild block className="mt-2 sm:hidden">
              <Link to={href("/login")} onClick={() => setOpen(false)}>
                <LogIn aria-hidden />
                {t.nav.login}
              </Link>
            </Button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
