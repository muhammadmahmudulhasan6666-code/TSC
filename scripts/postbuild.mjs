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
console.log("postbuild: flattened pre-rendered pages, wrote 404.html");
