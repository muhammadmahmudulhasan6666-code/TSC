// Points imported profile photos at the R2 copies (code.md §9.4): sets profile_photo_key and
// rewrites profile_photo_url to https://media.tscmmh.bd/<key>. Photos that failed to migrate keep
// their key null so the app can show the friendly "re-upload your photo" prompt.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REF = "ijfjncsdkhnqpjdgjupo";
const map = JSON.parse(fs.readFileSync("C:/TSC Local/data-backup/2026-10-01/media-map.json", "utf8"));
const MEDIA = "https://media.tscmmh.bd";

const sql = (q) => {
  const tmp = path.join(os.tmpdir(), "tsc-map-media.sql");
  fs.writeFileSync(tmp, q);
  return JSON.parse(execFileSync("node", ["scripts/sql.mjs", REF, tmp, "--write"]).toString() || "[]");
};

const rows = sql(`select 'teacher_profiles' t, user_id, profile_photo_url u from public.teacher_profiles where profile_photo_url is not null
                  union all select 'student_profiles', user_id, profile_photo_url from public.student_profiles where profile_photo_url is not null`);
const updates = [];
let missing = 0;
for (const r of rows) {
  const m = r.u.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^?]+)/);
  const key = m ? decodeURIComponent(m[1]) : null;
  if (key && map[key]?.status === "ok" && map[key].bucket === "tsc-public") updates.push({ t: r.t, user_id: r.user_id, key });
  else missing++;
}
const values = (t) => updates.filter((u) => u.t === t).map((u) => `('${u.user_id}'::uuid, '${u.key.replace(/'/g, "''")}')`).join(",");
let out = [];
for (const t of ["teacher_profiles", "student_profiles"]) {
  const v = values(t);
  if (!v) continue;
  out = out.concat(
    sql(`update public.${t} p set profile_photo_key = x.k, profile_photo_url = '${MEDIA}/' || x.k
         from (values ${v}) as x(id, k) where p.user_id = x.id returning p.user_id`),
  );
}
console.log(`photos remapped: ${out.length}, not migrated (will prompt re-upload): ${missing}`);
