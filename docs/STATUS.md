# TSC rebuild — STATUS

_Last updated: 2026-10-01_

## Done
**Phase 0 — data rescue**: full read-only dump of the old DB (97 tables, 9,674 rows, functions/policies/triggers), `auth.users` with all 330 bcrypt hashes, 367/367 storage files (361 MB) — all on Mahmud's PC, never committed.

**Phase 1 — foundation**
- App: React Router 8 (SPA + pre-rendered public pages), Tailwind 4, bn at `/`, en at `/en`, typed dictionaries (missing key = build error).
- Design system v2 (approved "100/100"): aurora + glass, motion (reveal/tilt/count-up/smooth scroll), hero with logo edge-ring, crisp logo/favicons from the 1024 px master.
- Cloudflare (account of Mahmudulhasan2002177@gmail.com, same as the tscmmh.bd zone): Pages project `tscmmh` → **https://beta.tscmmh.bd**; R2 buckets `tsc-public` (→ media.tscmmh.bd) and `tsc-private`.
- Database (new project `ijfjncsdkhnqpjdgjupo`, Singapore) — migrations 0100–0400:
  identity/roles, student & teacher profiles, PII split into `*_private` tables, portfolios, settings, notifications,
  audit log, price list, server-priced bKash payment requests, vouchers; RLS everywhere, column-level update locks,
  helpers in a non-exposed `private` schema. Advisors: performance clean; security only intentional RPC notices.
- **Users imported**: 330 auth users (same UUIDs, emails, passwords), 155 students, 174 teachers, TSC IDs unchanged,
  sequences continue at S167 / T177. `mahmudulhasan2002177@gmail.com` = super_admin. 28 legacy-Connect vouchers (৳2,100).
- Decisions: `docs/decisions/0001-pricing-and-money.md` (halal, free student core, flat taka, contact unlock ৳100,
  Smart Match ৳250, MathSprint companion pricing + anti-cheat).

## Next
1. Auth screens: login (old password works), Google, signup with role, reset flow (§9A), first-login welcome.
2. Import the remaining tables (bookings, unlocks, notes, MathSprint, community, notifications, messages…).
3. Media: R2 buckets + `media` Worker; upload the rescued files.
4. Public pages (Phase 3) with SEO: sitemap, OG/meta, JSON-LD, Search Console.

## Decisions since
- Email: Supabase built-in email for now (as on MMH), Resend later if volume needs it.
- bKash receiver 01609291050 (personal) — in `platform_settings.bkash_receiver`.
- Legacy-Connects vouchers = discount on the user's **first** paid service only.

## Open
- Old leaked Resend keys in Drive (`Docs_And_Scripts/Integrate UddoktaPay payment Gateway.txt`) — revoke in Resend even if Resend isn't used now.
