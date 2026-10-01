// Local-only receiver for the data rescue (code.md §9.1).
// The exporter runs inside Mahmud's logged-in tscmmh.bd admin tab and POSTs each
// table/listing here; files are written to C:\TSC Local\data-backup\<date>\.
// Binds to 127.0.0.1 only. Nothing leaves this PC.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PORT = Number(process.env.RESCUE_PORT || 8787);
const ALLOWED_ORIGIN = "https://tscmmh.bd";
const date = new Date().toISOString().slice(0, 10);
const root = path.resolve(process.env.RESCUE_DIR || `C:/TSC Local/data-backup/${date}`);
const key = process.env.RESCUE_KEY || crypto.randomBytes(12).toString("hex");

fs.mkdirSync(root, { recursive: true });

function cors(res, origin) {
  if (origin === ALLOWED_ORIGIN || origin === "https://www.tscmmh.bd") {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-rescue-key");
  res.setHeader("Access-Control-Allow-Private-Network", "true");
}

http
  .createServer((req, res) => {
    cors(res, req.headers.origin);
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (req.method !== "POST" || url.pathname !== "/save") return res.writeHead(404).end();
    if (req.headers["x-rescue-key"] !== key) return res.writeHead(403).end("bad key");

    const rel = (url.searchParams.get("path") || "").replace(/\\/g, "/");
    if (!rel || rel.includes("..") || path.isAbsolute(rel)) return res.writeHead(400).end("bad path");
    const dest = path.join(root, rel);

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const out = fs.createWriteStream(dest);
    req.pipe(out);
    out.on("finish", () => {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true }));
      console.log(`saved ${rel} (${fs.statSync(dest).size} bytes)`);
    });
    out.on("error", (e) => res.writeHead(500).end(String(e)));
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`rescue receiver on http://127.0.0.1:${PORT}  →  ${root}`);
    console.log(`RESCUE_KEY=${key}`);
  });
