import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router";
import type { Route } from "./+types/root";
import { getDict, localeFromPath, localizePath, stripLocale } from "~/i18n";
import { themeInitScript } from "~/components/site/theme";
import { ErrorState } from "~/components/site/error-state";
import { Toaster } from "sonner";
import { AuthProvider } from "~/lib/auth";
import "./app.css";

export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://tscmmh.bd";

export const links: Route.LinksFunction = () => [
  { rel: "preload", href: "/fonts/Kalpurush.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: "/fonts/Tinos-latin-400-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
  { rel: "icon", href: "/favicon-64.png", type: "image/png", sizes: "64x64" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);
  const bare = stripLocale(pathname);
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fbf8f6" />
        <meta name="google-site-verification" content="i-PdyHjFWYgEQ_ZOYOvertS-sWzZo9hB3B76R3wcBQg" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="alternate" hrefLang="bn" href={SITE_URL + localizePath(bare, "bn")} />
        <link rel="alternate" hrefLang="en" href={SITE_URL + localizePath(bare, "en")} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL + localizePath(bare, "bn")} />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-center" richColors closeButton toastOptions={{ className: "font-serif" }} />
    </AuthProvider>
  );
}

export function HydrateFallback() {
  return <div className="min-h-dvh" aria-busy="true" />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const t = getDict(typeof window === "undefined" ? "bn" : localeFromPath(window.location.pathname));
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (import.meta.env.DEV && error instanceof Error) console.error(error);
  return (
    <ErrorState
      code={notFound ? "404" : undefined}
      title={notFound ? t.errors.notFoundTitle : t.errors.genericTitle}
      body={notFound ? t.errors.notFoundBody : t.errors.genericBody}
      action={t.errors.backHome}
    />
  );
}
