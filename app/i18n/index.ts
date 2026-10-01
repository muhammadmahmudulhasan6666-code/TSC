import { useLocation } from "react-router";
import { bn } from "./bn";
import { en } from "./en";

// Same shape as `bn`, but every leaf is a plain string (so translations aren't forced to equal Bangla).
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof bn>;

export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bn";

const dictionaries: Record<Locale, Dict> = { bn, en };

/** Bangla lives at `/…`, English at `/en/…`. */
export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "bn";
}

/** Strip the locale prefix: `/en/teachers` → `/teachers`. */
export function stripLocale(pathname: string): string {
  const p = pathname.replace(/^\/en(?=\/|$)/, "");
  return p === "" ? "/" : p;
}

/** Build a path for `locale` from a locale-less path. */
export function localizePath(path: string, locale: Locale): string {
  if (locale === "bn") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}

export function useLocale() {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);
  return {
    locale,
    t: dictionaries[locale],
    /** Locale-aware href for an internal, locale-less path. */
    href: (path: string) => localizePath(path, locale),
    /** The current page in the other language. */
    alternate: localizePath(stripLocale(pathname), locale === "bn" ? "en" : "bn"),
  };
}
