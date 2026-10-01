# TSC rebuild — STATUS

_Last updated: 2026-10-01_

## Done
- **Phase 0 · Data rescue (code.md §9) — complete backup on Mahmud's PC** (`C:\TSC Local\data-backup\2026-10-01\`, never committed):
  - Full read-only dump of the old Lovable DB `pipxumfqykczzwcvfgua`: 97 tables / 9,674 rows, 172 functions, 76 triggers, 335 RLS policies, 5 cron jobs, column ACLs, storage object list.
  - `auth.users` + `auth.identities`: **330 users, all 330 with bcrypt password hashes** → §9A Path 1 (users keep their passwords).
  - Storage: **367 / 367 files (361 MB)** across 13 buckets, 0 failures.
  - A second, independent export through the live super_admin session (`tables/`, `storage/`).
- New Supabase project **`ijfjncsdkhnqpjdgjupo`** (Singapore, free) created by Mahmud; reachable via `scripts/sql.mjs`.
- Tooling: `scripts/sql.mjs` (Management API SQL; old DB forced read-only; MMH/BoostEdly refs blocked), `scripts/rescue/*`.
- `audit/live-schema.md` — real production table list and row counts.

## Key findings
- User count is **330** (admin panel's 279 excluded some states) — matches Mahmud's 329 + admin.
- MathSprint 2.0: 52 registrations, only **3 attempts started, 0 submitted** — the exam effectively did not run. 133 failed registration attempts were logged (contactable).
- 13 tables referenced by the latest code **don't exist in production** (portfolio sections/videos/courses, sensitive-info tables, ad campaigns…) — features that were never live.

## Next
1. Phase 1 questions to Mahmud (AI provider, integrations keep/drop, logo variants, Kalpurush file).
2. Repo foundation: Vite + React Router framework mode, Tailwind tokens, fonts, i18n routing, CI.
3. Baseline schema on the new project (clean squash of the live schema + §6.4 security fixes).

## Blocked on Mahmud
- Cloudflare R2: enable in dashboard.
- Resend: rotate the leaked keys, create a new one.
