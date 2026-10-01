import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

/**
 * Every public page exists twice: Bangla at `/…` and English at `/en/…` (same module, distinct ids).
 * Add pages here as [path, file]; `PUBLIC_PATHS` feeds pre-rendering in react-router.config.ts.
 */
const publicPages: [path: string, file: string][] = [
  ["dev/styleguide", "routes/dev.styleguide.tsx"],
  ["login", "routes/login.tsx"],
  ["register", "routes/register.tsx"],
  ["forgot-password", "routes/forgot-password.tsx"],
  ["reset-password", "routes/reset-password.tsx"],
  ["dashboard", "routes/dashboard.tsx"],
];

const localized = (prefix: "" | "en") =>
  layout("routes/_site.tsx", { id: `site-${prefix || "bn"}` }, [
    prefix ? route(prefix, "routes/home.tsx", { id: "home-en" }) : index("routes/home.tsx", { id: "home-bn" }),
    ...publicPages.map(([path, file]) =>
      route(prefix ? `${prefix}/${path}` : path, file, { id: `${prefix || "bn"}:${path}` }),
    ),
  ]);

export const PUBLIC_PATHS = ["/", "/en", ...publicPages.flatMap(([p]) => [`/${p}`, `/en/${p}`])];

export default [localized(""), localized("en"), route("*", "routes/not-found.tsx")] satisfies RouteConfig;
