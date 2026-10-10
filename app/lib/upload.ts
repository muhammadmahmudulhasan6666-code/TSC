// Browser uploads to /api/upload (Pages Function → R2). Images are resized and converted to WebP first.
import { supabase } from "./supabase";

export type UploadKind = "avatar" | "teaching" | "video" | "community" | "material" | "brand" | "document" | "payment" | "note" | "question";

const MAX_DIM: Partial<Record<UploadKind, number>> = { avatar: 720, teaching: 1600, community: 1600, payment: 1600, document: 2200, brand: 800 };

async function token() {
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw Object.assign(new Error("login required"), { code: "TS401" });
  return data.session.access_token;
}

/** Downscale a photo to fit `max` px and re-encode as WebP (keeps PNG/SVG logos untouched). */
async function shrink(file: File, max: number): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const out = await canvas.convertToBlob({ type: "image/webp", quality: 0.86 });
  return out.size < file.size || scale < 1 ? out : file;
}

export async function uploadFile(kind: UploadKind, file: File): Promise<{ key: string; url: string | null }> {
  const body = MAX_DIM[kind] ? await shrink(file, MAX_DIM[kind]!) : file;
  const res = await fetch(`/api/upload?kind=${kind}`, {
    method: "POST",
    headers: { authorization: `Bearer ${await token()}`, "content-type": body.type || file.type },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as { key?: string; url?: string | null; error?: string };
  if (!res.ok || !json.key) throw Object.assign(new Error(json.error ?? "upload failed"), { status: res.status });
  return { key: json.key, url: json.url ?? null };
}

/** Fetches a private file with the user's session and returns a temporary object URL. */
export async function privateFileUrl(key: string): Promise<string> {
  const res = await fetch(`/api/file?key=${encodeURIComponent(key)}`, { headers: { authorization: `Bearer ${await token()}` } });
  if (!res.ok) throw new Error(`file ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

export const publicMediaUrl = (key: string) => `https://media.tscmmh.bd/${key}`;
