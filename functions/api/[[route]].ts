// Cloudflare Pages Functions: authenticated uploads to R2 and access-checked private downloads.
//   POST /api/upload?kind=<kind>   body = the file (raw), Content-Type = its MIME, Authorization: Bearer <supabase jwt>
//   GET  /api/file?key=<key>       Authorization header or ?token= (for <img>/<a> links); streams a private file
// Who may read a private file is decided in the database (public.can_read_file), never here.

interface Env {
  PUBLIC_BUCKET: R2Bucket;
  PRIVATE_BUCKET: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
}

type Kind = { private: boolean; max: number; types: RegExp; folder: string };
const KINDS: Record<string, Kind> = {
  avatar: { private: false, max: 3 << 20, types: /^image\/(jpeg|png|webp)$/, folder: "avatars" },
  teaching: { private: false, max: 4 << 20, types: /^image\/(jpeg|png|webp)$/, folder: "teaching" },
  video: { private: false, max: 80 << 20, types: /^video\/(mp4|webm|quicktime)$/, folder: "videos" },
  community: { private: false, max: 4 << 20, types: /^image\/(jpeg|png|webp)$/, folder: "community" },
  material: { private: false, max: 30 << 20, types: /^(application\/pdf|image\/(jpeg|png|webp))$/, folder: "materials" },
  brand: { private: false, max: 3 << 20, types: /^image\/(jpeg|png|webp|svg\+xml)$/, folder: "brand" },
  document: { private: true, max: 10 << 20, types: /^(application\/pdf|image\/(jpeg|png|webp))$/, folder: "documents" },
  payment: { private: true, max: 6 << 20, types: /^image\/(jpeg|png|webp)$/, folder: "payments" },
  note: { private: true, max: 40 << 20, types: /^application\/pdf$/, folder: "notes" },
  question: { private: true, max: 6 << 20, types: /^(image\/(jpeg|png|webp)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/, folder: "mathsprint" },
};
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/svg+xml": "svg", "application/pdf": "pdf",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

/** Calls a Supabase RPC as the user (their JWT), so RLS/SECURITY DEFINER checks apply. */
async function rpc(env: Env, token: string, fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_KEY, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, body };
}

async function userId(env: Env, token: string | null) {
  if (!token) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_KEY, authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return ((await res.json()) as { id?: string }).id ?? null;
}

const bearer = (req: Request) => req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;

async function upload(req: Request, env: Env, url: URL) {
  const kind = KINDS[url.searchParams.get("kind") ?? ""];
  if (!kind) return json({ error: "unknown kind" }, 400);
  const token = bearer(req);
  const uid = await userId(env, token);
  if (!uid || !token) return json({ error: "login required" }, 401);
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!kind.types.test(type)) return json({ error: "file type not allowed" }, 415);
  const size = Number(req.headers.get("content-length") ?? 0);
  if (!size || size > kind.max) return json({ error: "file too large", max: kind.max }, 413);

  const key = `${kind.folder}/${uid}/${crypto.randomUUID()}.${EXT[type] ?? "bin"}`;
  const bucket = kind.private ? env.PRIVATE_BUCKET : env.PUBLIC_BUCKET;
  const body = await req.arrayBuffer();
  if (body.byteLength > kind.max) return json({ error: "file too large", max: kind.max }, 413);
  await bucket.put(key, body, {
    httpMetadata: { contentType: type, cacheControl: kind.private ? "private, no-store" : "public, max-age=31536000, immutable" },
    customMetadata: { owner: uid },
  });
  // Record it in the database (also enforces per-kind rules, e.g. only admins upload MathSprint questions).
  const reg = await rpc(env, token, "register_upload", { _key: key, _kind: url.searchParams.get("kind"), _mime: type, _size: body.byteLength, _private: kind.private });
  if (!reg.ok) {
    await bucket.delete(key);
    return json({ error: "not allowed" }, 403);
  }
  return json({ key, url: kind.private ? null : `https://media.tscmmh.bd/${key}` });
}

async function file(req: Request, env: Env, url: URL) {
  const key = url.searchParams.get("key") ?? "";
  const token = bearer(req) ?? url.searchParams.get("token");
  if (!key || !token) return json({ error: "login required" }, 401);
  const can = await rpc(env, token, "can_read_file", { _key: key });
  if (!can.ok || can.body !== true) return json({ error: "forbidden" }, 403);
  const obj = await env.PRIVATE_BUCKET.get(key);
  if (!obj) return json({ error: "not found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-disposition", `inline; filename="${key.split("/").pop()}"`);
  return new Response(obj.body, { headers });
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/upload" && request.method === "POST") return await upload(request, env, url);
    if (url.pathname === "/api/file" && request.method === "GET") return await file(request, env, url);
    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: "server error", detail: String(e).slice(0, 200) }, 500);
  }
};
