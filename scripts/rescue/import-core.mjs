// Imports users from the old DB dump into the NEW TSC project, keeping UUIDs, emails,
// bcrypt password hashes, TSC IDs and roles (code.md §9.5, §9A Path 1).
// Usage: node scripts/rescue/import-core.mjs [--dry]   (reads C:\TSC Local\data-backup\<date>\db)
// Delta: DUMP_DIR=…/2026-10-10/db node scripts/rescue/import-core.mjs --delta [--since 2026-10-01T00:00Z]
//   adds users created on the old site since the first import and refreshes rows changed there since --since.
//   Re-runnable (used again at cutover). Never deletes anything in the new DB.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const REF = "ijfjncsdkhnqpjdgjupo";
const DUMP = process.env.DUMP_DIR || "C:/TSC Local/data-backup/2026-10-01/db";
const dry = process.argv.includes("--dry");
const delta = process.argv.includes("--delta");
const sinceArg = process.argv.indexOf("--since");
const SINCE = sinceArg > 0 ? process.argv[sinceArg + 1] : "2026-10-01T00:00:00Z";
const changed = (r) => !!r && (new Date(r.updated_at ?? r.created_at ?? 0) > new Date(SINCE) || new Date(r.created_at ?? 0) > new Date(SINCE));
const load = (f) => JSON.parse(fs.readFileSync(path.join(DUMP, f), "utf8"));

// ── Normalisers ──────────────────────────────────────────────────────────────────────────
const bnDigits = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

/** Free-text class from the old form → level code (class_1…class_10, hsc_1, hsc_2, university, diploma). */
export function normaliseClass(raw) {
  if (!raw) return null;
  let s = String(raw).toLowerCase().replace(/[০-৯]/g, (d) => bnDigits[d]).replace(/\s+/g, " ").trim();
  if (/honou?rs|university|varsity/.test(s)) return "university";
  if (/diploma/.test(s)) return "diploma";
  if (/inter ?(1st|first)|hsc ?1|class ?11\b/.test(s)) return "hsc_1";
  if (/inter ?(2nd|second)|hsc ?2|class ?12|\(hsc\)/.test(s)) return "hsc_2";
  if (/\bhsc\b/.test(s)) return "hsc_1";
  if (/\bssc\b/.test(s)) return "class_10";
  s = s.replace(/\b1o\b/, "10");
  for (const [w, n] of Object.entries(words)) if (new RegExp(`\\b${w}\\b`).test(s)) s = String(n);
  const n = Number((s.match(/\d{1,2}/) || [])[0]);
  if (n >= 1 && n <= 10) return `class_${n}`;
  if (n === 11) return "hsc_1";
  if (n === 12) return "hsc_2";
  return null;
}

export function normaliseCurriculum(medium) {
  const m = String(medium || "").toLowerCase();
  if (m.includes("bangla")) return "bangla_version";
  if (m.includes("english version")) return "english_version";
  if (m.includes("english medium")) return "english_medium";
  if (m.includes("madrasha") || m.includes("madrasah")) return "madrasah";
  if (m.includes("technical")) return "technical";
  return null;
}

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k] ?? null]));

// ── Build rows ───────────────────────────────────────────────────────────────────────────
const users = load("auth_users.json");
const identities = load("auth_identities.json");
const up = load("public/user_profiles.json");
const roles = load("public/user_roles.json");
const sp = load("public/student_profiles.json");
const tp = load("public/teacher_profiles.json");
const uc = load("public/user_connects.json");

const authUserCols = Object.keys(users[0]).filter((c) => c !== "confirmed_at");
const identityCols = Object.keys(identities[0]).filter((c) => c !== "email");

const userProfiles = up.map((r) => ({
  ...pick(r, ["user_id", "phone_number", "user_status", "referral_code", "suspended_at", "suspended_until", "suspension_reason",
    "moderation_warning_count", "terms_accepted_at", "last_login_at", "last_login_ip", "last_login_device",
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "created_at", "updated_at"]),
  needs_password_setup: false,
}));

const studentProfiles = sp.map((r) => ({
  ...pick(r, ["id", "user_id", "tsc_id", "full_name", "gender", "profile_photo_url", "group_stream", "education_medium",
    "subject_teacher_needed", "institution_name", "district", "thana", "teaching_mode_preference", "monthly_budget_min",
    "monthly_budget_max", "bio_summary", "verification_status", "profile_completion_percentage", "ambassador_tier", "created_at", "updated_at"]),
  budget_negotiable: !!r.budget_negotiable,
  guardian_consent: !!r.guardian_consent,
  tutor_needed_completed: !!r.tutor_needed_completed,
  is_ambassador: !!r.is_ambassador,
  consent_success_story: !!r.consent_success_story,
  curriculum: normaliseCurriculum(r.education_medium),
  current_class: normaliseClass(r.current_class),
  legacy_class_text: r.current_class,
  subjects: r.subject_teacher_needed ? String(r.subject_teacher_needed).split(/[,،;/|]+/).map((x) => x.trim()).filter(Boolean) : [],
}));
const studentPrivate = sp.map((r) => pick(r, ["user_id", "guardian_name", "guardian_phone", "guardian_relationship", "date_of_birth", "exact_address"]));

const teacherProfiles = tp.map((r) => ({
  ...pick(r, ["id", "user_id", "tsc_id", "full_name", "gender", "profile_photo_url", "university_name", "institution_name", "department",
    "academic_year", "experience_years", "teaching_level", "bio_summary", "district", "thana", "teaching_mode_offered",
    "hourly_rate_online", "monthly_rate_inperson", "verification_status", "ambassador_tier", "created_at", "updated_at"]),
  subjects_offered: r.subjects_offered || [],
  rate_negotiable: !!r.rate_negotiable,
  is_tsc_certified: !!r.is_tsc_certified,
  is_online_certified: !!r.is_online_certified,
  is_featured: !!r.is_featured,
  is_ambassador: !!r.is_ambassador,
  consent_success_story: !!r.consent_success_story,
  notify_teacher_needed: r.notify_teacher_needed !== false,
  profile_completion_percentage: r.profile_completion_percentage ?? 0,
  average_rating: r.average_rating ?? 0,
  total_reviews: r.total_reviews ?? 0,
  total_students_taught: r.total_students_taught ?? 0,
  total_hours_taught: r.total_hours_taught ?? 0,
  booking_completion_rate: r.booking_completion_rate ?? 0,
  services_completed: r.services_completed ?? 0,
  total_love_count: r.total_love_count ?? 0,
}));
const teacherPrivate = tp.map((r) => pick(r, ["user_id", "guardian_name", "guardian_phone", "guardian_relationship", "date_of_birth", "preferred_address"]));

const portfolioKeys = ["vanity_slug", "vanity_slug_change_count", "vanity_slug_changed_at", "accent_color", "cover_banner_url", "tagline",
  "intro_video_url", "brand_name", "brand_font", "brand_font_weight", "brand_font_size", "brand_letter_spacing", "brand_text_transform",
  "brand_logo_url", "brand_logo_size", "brand_logo_position", "brand_logo_shape", "brand_name_change_count", "brand_name_changed_at", "signature_quote"];
const teacherPortfolios = tp
  .filter((r) => r.premium_portfolio_enabled || r.vanity_slug || r.brand_name || r.tagline)
  .map((r) => ({
    user_id: r.user_id,
    ...pick(r, portfolioKeys),
    enabled: !!r.premium_portfolio_enabled,
    started_at: r.premium_portfolio_started_at,
    expires_at: r.premium_portfolio_expires_at,
    theme_accent: r.portfolio_theme_accent,
    view_count: r.portfolio_view_count ?? 0,
    last_active_at: r.portfolio_last_active_at,
    vanity_slug_change_count: r.vanity_slug_change_count ?? 0,
    brand_name_change_count: r.brand_name_change_count ?? 0,
  }));

// Legacy Connects → ৳10 vouchers (ADR 0001). The single test balance > 1000 (admin's T1) is excluded.
const vouchers = uc
  .filter((r) => (r.balance || 0) > 0 && r.balance < 1000)
  .map((r) => ({ user_id: r.user_id, amount_bdt: Math.round(r.balance) * 10, reason: "legacy_connects", expires_at: null }));

// ── SQL ──────────────────────────────────────────────────────────────────────────────────
const json = (rows) => `$json$${JSON.stringify(rows)}$json$::jsonb`;
const insert = (table, rows, cols = Object.keys(rows[0] || {})) =>
  rows.length
    ? `insert into ${table} (${cols.map((c) => `"${c}"`).join(",")}) select ${cols.map((c) => `"${c}"`).join(",")} from jsonb_populate_recordset(null::${table}, ${json(rows)});`
    : "";

const maxNum = (rows, p) => Math.max(0, ...rows.map((r) => Number(String(r.tsc_id).slice(1)) || 0));

const sql = `
begin;
set local tsc.importing = 'on';
${insert("auth.users", users, authUserCols)}
${insert("auth.identities", identities, identityCols)}
${insert("public.user_profiles", userProfiles)}
${insert("public.user_roles", roles.map((r) => pick(r, ["user_id", "role", "created_at"])), ["user_id", "role", "created_at"])}
${insert("public.student_profiles", studentProfiles)}
${insert("public.student_private", studentPrivate)}
${insert("public.teacher_profiles", teacherProfiles)}
${insert("public.teacher_private", teacherPrivate)}
${insert("public.teacher_portfolios", teacherPortfolios)}
${insert("public.vouchers", vouchers)}
select setval('public.student_tsc_id_seq', ${maxNum(sp)});
select setval('public.teacher_tsc_id_seq', ${maxNum(tp)});
select json_build_object(
  'auth_users', (select count(*) from auth.users), 'identities', (select count(*) from auth.identities),
  'user_profiles', (select count(*) from public.user_profiles), 'roles', (select count(*) from public.user_roles),
  'students', (select count(*) from public.student_profiles), 'teachers', (select count(*) from public.teacher_profiles),
  'portfolios', (select count(*) from public.teacher_portfolios), 'vouchers', (select count(*) from public.vouchers),
  'voucher_total_bdt', (select coalesce(sum(amount_bdt),0) from public.vouchers),
  'classes_mapped', (select count(*) from public.student_profiles where current_class is not null),
  'super_admins', (select count(*) from public.user_roles where role = 'super_admin')) as result;
commit;`;

// ── Delta mode ───────────────────────────────────────────────────────────────────────────
const upsert = (table, rows, conflict, cols = Object.keys(rows[0] || {}), skipUpdate = []) => {
  if (!rows.length) return "";
  const upd = cols.filter((c) => !conflict.split(",").map((x) => x.trim()).includes(c) && !skipUpdate.includes(c));
  return `insert into ${table} (${cols.map((c) => `"${c}"`).join(",")}) select ${cols.map((c) => `"${c}"`).join(",")} from jsonb_populate_recordset(null::${table}, ${json(rows)})
  on conflict (${conflict}) do ${upd.length ? `update set ${upd.map((c) => `"${c}" = excluded."${c}"`).join(", ")}` : "nothing"};`;
};
function deltaSql() {
  const touched = new Set(users.filter(changed).map((u) => u.id));
  for (const r of [...up, ...sp, ...tp]) if (changed(r)) touched.add(r.user_id);
  const only = (rows, key = "user_id") => rows.filter((r) => touched.has(r[key]));
  const authUpdatable = authUserCols.filter((c) => !["id", "instance_id", "created_at"].includes(c));
  // Photos: keep the R2 URL the new DB already points at; map-media re-points changed ones afterwards.
  const keepNew = ["profile_photo_url", "average_rating", "total_reviews", "total_students_taught", "booking_completion_rate", "services_completed"];
  return `
begin;
set local tsc.importing = 'on';
${upsert("auth.users", only(users, "id"), "id", authUserCols, ["instance_id"])}
${identities.filter((i) => touched.has(i.user_id)).length ? `insert into auth.identities (${identityCols.map((c) => `"${c}"`).join(",")}) select ${identityCols.map((c) => `"${c}"`).join(",")} from jsonb_populate_recordset(null::auth.identities, ${json(identities.filter((i) => touched.has(i.user_id)))}) on conflict do nothing;` : ""}
${upsert("public.user_profiles", only(userProfiles), "user_id")}
${roles.filter((r) => touched.has(r.user_id)).length ? `insert into public.user_roles (user_id, role, created_at) select user_id, role, created_at from jsonb_populate_recordset(null::public.user_roles, ${json(roles.filter((r) => touched.has(r.user_id)).map((r) => pick(r, ["user_id", "role", "created_at"])))}) on conflict (user_id, role) do nothing;` : ""}
${upsert("public.student_profiles", only(studentProfiles), "user_id", undefined, ["id", "tsc_id", ...keepNew])}
${upsert("public.student_private", only(studentPrivate), "user_id")}
${upsert("public.teacher_profiles", only(teacherProfiles), "user_id", undefined, ["id", "tsc_id", ...keepNew])}
${upsert("public.teacher_private", only(teacherPrivate), "user_id")}
${upsert("public.teacher_portfolios", only(teacherPortfolios), "user_id")}
${vouchers.length ? `insert into public.vouchers (user_id, amount_bdt, reason, expires_at) select v.user_id, v.amount_bdt, v.reason, v.expires_at from jsonb_populate_recordset(null::public.vouchers, ${json(vouchers)}) v where not exists (select 1 from public.vouchers x where x.user_id = v.user_id and x.reason = 'legacy_connects');` : ""}
-- New photos (not yet on R2) keep the old URL until map-media runs.
update public.student_profiles p set profile_photo_url = x.profile_photo_url from jsonb_populate_recordset(null::public.student_profiles, ${json(only(studentProfiles).map((r) => pick(r, ["user_id", "profile_photo_url"])))}) x
 where p.user_id = x.user_id and x.profile_photo_url is not null and (p.profile_photo_url is null or (p.profile_photo_key is null and p.profile_photo_url <> x.profile_photo_url));
update public.teacher_profiles p set profile_photo_url = x.profile_photo_url from jsonb_populate_recordset(null::public.teacher_profiles, ${json(only(teacherProfiles).map((r) => pick(r, ["user_id", "profile_photo_url"])))}) x
 where p.user_id = x.user_id and x.profile_photo_url is not null and (p.profile_photo_url is null or (p.profile_photo_key is null and p.profile_photo_url <> x.profile_photo_url));
select setval('public.student_tsc_id_seq', greatest(${maxNum(sp)}, (select coalesce(max(substring(tsc_id from 2)::int), 0) from public.student_profiles where tsc_id ~ '^S[0-9]+$')));
select setval('public.teacher_tsc_id_seq', greatest(${maxNum(tp)}, (select coalesce(max(substring(tsc_id from 2)::int), 0) from public.teacher_profiles where tsc_id ~ '^T[0-9]+$')));
select json_build_object('touched_users', ${touched.size}, 'auth_users', (select count(*) from auth.users), 'students', (select count(*) from public.student_profiles),
  'teachers', (select count(*) from public.teacher_profiles), 'vouchers', (select count(*) from public.vouchers)) as result;
commit;`;
}
const finalSql = delta ? deltaSql() : sql;

const tmp = path.join(os.tmpdir(), "tsc-import-core.sql");
fs.writeFileSync(tmp, finalSql);
console.log(`rows: users ${users.length}, identities ${identities.length}, students ${studentProfiles.length}, teachers ${teacherProfiles.length}, portfolios ${teacherPortfolios.length}, vouchers ${vouchers.length}; sql ${(sql.length / 1024).toFixed(0)} KB`);
const unmapped = sp.filter((r) => r.current_class && !normaliseClass(r.current_class)).map((r) => r.current_class);
console.log("class values left unmapped:", unmapped);
if (dry) process.exit(0);
try {
  console.log(execFileSync("node", ["scripts/sql.mjs", REF, tmp, "--write"], { maxBuffer: 1 << 28 }).toString());
} finally {
  fs.rmSync(tmp, { force: true }); // contains password hashes
}
