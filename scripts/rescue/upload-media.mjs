// Uploads every rescued storage file to Cloudflare R2 (code.md §6.5, §9.4).
// Key = "<old bucket>/<old path>", so old URLs map 1:1 to new keys.
// Public material → tsc-public (served at media.tscmmh.bd); IDs, paid notes, raw uploads → tsc-private.
// Writes data-backup/<date>/media-map.json and is safe to re-run (skips keys already uploaded).
import fs from "node:fs";
import path from "node:path";

const ACC = "83b2cf7b658bd114af1d9c39b8e6fb78";
const BACKUP = process.env.BACKUP_DIR || "C:/TSC Local/data-backup/2026-10-01";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const TOKEN = env.CLOUDFLARE_API_TOKEN;

const PRIVATE = new Set(["documents", "mynotes-raw", "mynotes-full", "mynotes-digitalization"]);
const objects = JSON.parse(fs.readFileSync(path.join(BACKUP, "db/_storage_objects.json"), "utf8"));
const mapFile = path.join(BACKUP, "media-map.json");
const done = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, "utf8")) : {};

const api = (bucket, key) =>
  `https://api.cloudflare.com/client/v4/accounts/${ACC}/r2/buckets/${bucket}/objects/${key.split("/").map(encodeURIComponent).join("/")}`;

async function upload(o) {
  const oldUrl = `${o.bucket_id}/${o.name}`;
  if (done[oldUrl]?.status === "ok") return;
  const file = path.join(BACKUP, "storage", o.bucket_id, o.name);
  const bucket = PRIVATE.has(o.bucket_id) ? "tsc-private" : "tsc-public";
  const key = oldUrl;
  if (!fs.existsSync(file)) {
    done[oldUrl] = { bucket, key, status: "missing" };
    return;
  }
  const res = await fetch(api(bucket, key), {
    method: "PUT",
    headers: { Authorization: `Bearer ${TOKEN}`, "content-type": o.metadata?.mimetype || "application/octet-stream" },
    body: fs.readFileSync(file),
    signal: AbortSignal.timeout(Number(process.env.UPLOAD_TIMEOUT_MS || 120_000)), // a stalled request must not hang the whole run
  });
  done[oldUrl] = { bucket, key, status: res.ok ? "ok" : `http_${res.status}`, size: fs.statSync(file).size };
}

const queue = [...objects];
let n = 0;
await Promise.all(
  Array.from({ length: Number(process.env.UPLOAD_CONCURRENCY || 3) }, async () => {
    for (let o = queue.shift(); o; o = queue.shift()) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await upload(o);
          if (done[`${o.bucket_id}/${o.name}`]?.status === "ok" || attempt === 3) break;
        } catch (e) {
          if (attempt === 3) done[`${o.bucket_id}/${o.name}`] = { bucket: PRIVATE.has(o.bucket_id) ? "tsc-private" : "tsc-public", status: `error ${e.message}` };
        }
      }
      if (++n % 25 === 0) {
        fs.writeFileSync(mapFile, JSON.stringify(done, null, 1));
        console.log(`${n}/${objects.length}`);
      }
    }
  }),
);
fs.writeFileSync(mapFile, JSON.stringify(done, null, 1));
const summary = Object.values(done).reduce((m, v) => ((m[`${v.bucket}:${v.status}`] = (m[`${v.bucket}:${v.status}`] || 0) + 1), m), {});
console.log("done", summary);
