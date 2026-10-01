# ADR 0001 — Pricing & money model (decided by Mahmud, 2026-10-01)

## Principles
- **Halal only**: no interest/late fees, no gambling-like mechanics, no hidden fees; any fee for an uncertain outcome is refunded if the outcome isn't delivered.
- **Student/guardian-friendly core**: finding teachers and posting a tuition requirement is free.
- **Teachers pay zero commission** on tuition income.
- **No Connects currency.** Plain, flat taka only (৳100, ৳250, ৳300 — never ৳199-style).
- **Pay per service via bKash** (manual TrxID → admin approves → service activates). No wallet/stored balance. Payment layer behind a `PaymentProvider` interface for a future gateway.

## Price list (all prices editable by admin in `service_prices`; nothing hard-coded)
| Who | Service | Price | Notes |
|---|---|---|---|
| Student/guardian | Search, profiles, compare, save | Free | |
| | Tuition Post (teacher-needed) + receive hand-raises | Free | Structured form; anti-contact-sharing detector |
| | **Contact unlock** (teacher's number) | **৳100** | Teacher accepts → numbers revealed both ways; teacher rejects/no reply in 72 h → full refund |
| | **Smart Match** | **৳250** | Admin finds **one** dedicated teacher from the full requirement form; if that doesn't work out, **one** replacement (max 2 teachers). Refund if TSC can't propose anyone. |
| | Trial class | TSC charges nothing | Arranged between guardian and teacher |
| | **MathSprint registration** | **Junior ৳100 · Mid ৳120 · Senior ৳150** | The price is for the tier's **Preparation Companion** (study guide). Package also includes exam access, TSC certificate and rank analysis. Prize amounts fixed in advance and paid by TSC/sponsor — never pooled from fees. |
| Teacher | Signup, verification, profile, teaching images/video, hand-raise | Free | |
| | Profile Boost | ৳100 / 7 days · ৳300 / 30 days | |
| | Premium Portfolio | ৳1,000 / year (founders' batch) → ৳1,500 / year | |
| | MyNotes sales | Seller 70% · TSC 30% | (was 60/40) |

## Legacy Connects
All existing balances were welcome gifts (no paid Connects were ever sold). Each user gets a **"Welcome Back" voucher worth ৳10 per Connect**, valid 6 months, usable on any paid service. Admin T1's test balance (5,005) is excluded.

## MathSprint 3.0
Registration 1 Mar – 10 Apr 2027, exam 17 Apr 2027 10:00 (Asia/Dhaka). All dates live in the `ms_editions` row, editable from admin.
Registration price = tier's Preparation Companion (Junior ৳100 · Mid ৳120 · Senior ৳150); the package also includes exam access, TSC certificate and rank analysis. Prizes are fixed in advance and paid by TSC/sponsor.

### Anti-cheat design (external devices can't be detected, so cheating is made pointless)
1. **10 questions × 60 s per question** (max 10 min), one at a time, served by the server only when due; no going back; unused time doesn't carry over. Per-tier timing is admin-configurable.
2. **Per-candidate papers**: random draw from a larger tier bank (30–40 equal-difficulty items), shuffled question and option order; questions rendered as images with the candidate's TSC ID watermark.
3. **Browser guards**: forced fullscreen; tab/window switch → warning, 3rd strike → auto-submit; copy/right-click/select disabled; PrintScreen/DevTools attempts logged; single active device/session.
4. **Anomaly flags**: per-answer timing, uniform-fast-correct patterns, shared IP/device across accounts → admin review queue.
5. **Prize verification**: top 10 do a 5-minute live video check (solve 2–3 questions aloud) before any prize — announced in the rules.
6. Tie-break: total time (lower wins). One registration per guardian phone.

## Free text
All forms are option-based (chips/dropdowns). Where a short optional note exists (≤150 chars), a contact detector (bn/en digits, spelled-out numbers, split/obfuscated numbers, emails, @handles, links, platform names) blocks submit client-side and again server-side; flagged items go to admin review.

## Curriculum taxonomy
Bangla version / English version (national curriculum): Play, Nursery, KG, Class 1–10 (SSC = Class 9–10), HSC 1st year, HSC 2nd year · English medium: Edexcel / Cambridge — Primary, Lower Secondary, O Level (IGCSE), AS, A2 · Madrasah (Dakhil/Alim) and admission/university prep as extra tracks.
