import type { Locale } from "~/i18n";

const intlLocale = (l: Locale) => (l === "bn" ? "bn-BD" : "en-GB");

/** 1234 → "১,২৩৪" (bn) / "1,234" (en). */
export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(n);
}

/** Taka amount: 1200 → "৳১,২০০" / "৳1,200". */
export function formatTaka(amount: number, locale: Locale): string {
  return `৳${formatNumber(amount, locale)}`;
}

/** Connects with unit: 15 → "১৫ কানেক্ট" / "15 Connects". */
export function formatConnects(n: number, locale: Locale): string {
  return locale === "bn" ? `${formatNumber(n, "bn")} কানেক্ট` : `${formatNumber(n, "en")} Connect${n === 1 ? "" : "s"}`;
}

/** Dates are shown in Bangladesh time regardless of the device timezone. */
export function formatDate(d: Date | string, locale: Locale, opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Dhaka", ...opts }).format(new Date(d));
}

/** TSC IDs are S/T + plain integer (no padding), e.g. S165, T1. */
export const TSC_ID_RE = /^[ST]\d{1,9}$/;
export const isTscId = (s: string) => TSC_ID_RE.test(s);
