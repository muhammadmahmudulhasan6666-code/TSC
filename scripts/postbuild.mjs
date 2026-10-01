// Shapes build/client for Cloudflare Pages:
// 1. `a/b/index.html` → `a/b.html`, so `/a/b` is served directly (Pages would otherwise 308 to `/a/b/`).
// 2. 404.html = the SPA shell, so unknown URLs render the app's 404 page with a real 404 status.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("build/client");

function flatten(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "assets") flatten(p);
  }
  const index = path.join(dir, "index.html");
  if (dir !== root && fs.existsSync(index)) {
    fs.renameSync(index, `${dir}.html`);
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
}

flatten(root);
fs.copyFileSync(path.join(root, "__spa-fallback.html"), path.join(root, "404.html"));

// 3. sitemap.xml from every pre-rendered page that isn't marked noindex (with bn/en alternates).
const SITE = process.env.VITE_SITE_URL || "https://tscmmh.bd";
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "assets") walk(p); continue; }
    if (!e.name.endsWith(".html") || /^(404|__spa-fallback|google.*)\.html$/.test(e.name)) continue;
    if (/<meta name="robots" content="noindex"/.test(fs.readFileSync(p, "utf8"))) continue;
    const rel = "/" + path.relative(root, p).split(path.sep).join("/").replace(/(index)?\.html$/, "").replace(/\/$/, "");
    pages.push(rel === "/" ? "/" : rel);
  }
})(root);
const bnPaths = pages.filter((p) => p !== "/en" && !p.startsWith("/en/"));
const today = new Date().toISOString().slice(0, 10);
const url = (p) => SITE + (p === "/" ? "" : p);
const enOf = (p) => (p === "/" ? "/en" : `/en${p}`);
const entries = bnPaths.flatMap((p) => [p, enOf(p)].filter((x) => pages.includes(x)).map((loc) => `  <url><loc>${url(loc)}</loc><lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="bn" href="${url(p)}"/>${pages.includes(enOf(p)) ? `
    <xhtml:link rel="alternate" hreflang="en" href="${url(enOf(p))}"/>` : ""}
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(p)}"/></url>`));
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`);

// 4. robots.txt — only the production build is indexable; previews (beta) are hidden from search engines.
const production = process.env.TSC_PRODUCTION === "1";
fs.writeFileSync(path.join(root, "robots.txt"), production
  ? `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /student/
Disallow: /teacher/
Disallow: /admin/

Sitemap: ${SITE}/sitemap.xml
`
  : "User-agent: *\nDisallow: /\n");
console.log(`postbuild: flattened pages, 404.html, sitemap (${entries.length} urls), robots (${production ? "production" : "preview: noindex"})`);
