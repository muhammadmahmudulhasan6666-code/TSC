import { Languages } from "lucide-react";
import { Link } from "react-router";
import { useLocale } from "~/i18n";
import { Button } from "~/components/ui/button";
import { BrandLink } from "./brand";
import { ThemeToggle } from "./theme";

export function LanguageSwitch() {
  const { locale, t, alternate } = useLocale();
  return (
    <Button asChild variant="ghost" size="sm" className="h-11 px-3">
      <Link to={alternate} hrefLang={locale === "bn" ? "en" : "bn"} aria-label={t.nav.language}>
        <Languages aria-hidden />
        {locale === "bn" ? t.nav.switchToEnglish : t.nav.switchToBangla}
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const { t, href } = useLocale();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        {t.nav.skipToContent}
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <BrandLink />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {[
            ["/teachers", t.nav.findTeachers],
            ["/teacher-needed", t.nav.teacherNeeded],
            ["/how-it-works", t.nav.howItWorks],
            ["/pricing", t.nav.pricing],
          ].map(([to, label]) => (
            <Link key={to} to={href(to)} className="rounded-lg px-3 py-2 text-[0.95rem] text-muted transition-colors hover:text-text">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <LanguageSwitch />
          <ThemeToggle />
          <Button asChild size="sm" className="ml-1 hidden h-10 sm:inline-flex">
            <Link to={href("/login")}>{t.nav.login}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
