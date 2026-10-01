// Per-page SEO: title, description, canonical, Open Graph (Facebook/WhatsApp/LinkedIn), Twitter card
// and optional JSON-LD. hreflang alternates are added globally in root.tsx.
import { localeFromPath } from "~/i18n";

export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://tscmmh.bd";
const DEFAULT_IMAGE = `${SITE_URL}/brand/og-default.jpg`;

type Copy = { title: string; description: string };

export function pageMeta({ path, bn, en, image, noindex, jsonLd }: { path: string; bn: Copy; en: Copy; image?: string; noindex?: boolean; jsonLd?: object }) {
  const locale = localeFromPath(path);
  const { title, description } = locale === "bn" ? bn : en;
  const url = SITE_URL + (path === "/" ? "" : path.replace(/\/$/, ""));
  const img = image ?? DEFAULT_IMAGE;
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url || SITE_URL },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "TSC — Trust · Success · Care" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url || SITE_URL },
    { property: "og:image", content: img },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:locale", content: locale === "bn" ? "bn_BD" : "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: img },
    ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
    ...(jsonLd ? [{ "script:ld+json": jsonLd }] : []),
  ];
}

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "TSC — Trust · Success · Care",
  alternateName: "TSC",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/icon-512.png`,
  email: "tsc.mmh.bd@gmail.com",
  telephone: "+8801861977995",
  areaServed: "BD",
  slogan: "Where Trust leads to Success through Care.",
};
