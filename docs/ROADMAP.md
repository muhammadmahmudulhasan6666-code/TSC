# TSC — সম্পূর্ণ Project To-do List

> শেষ আপডেট: ২০২৬-১০-০১ · ✅ = শেষ · 🔄 = চলছে · ⬜ = বাকি · 👤 = Mahmud-এর কাজ
> ক্রম (Mahmud-এর সাথে ঠিক করা): টাকার পথ → Student/Guardian flow → Teacher portal → Admin panel → MathSprint 3.0 ও বাকি module → Public পেজ → Platform → Launch।
> প্রতিটা ধাপের শেষে: phone (360px) + desktop, light + dark-এ যাচাই → beta.tscmmh.bd-এ deploy → GitHub push।

---

## ✅ ধাপ ০ — ভিত্তি (শেষ)
- ✅ পুরনো site-এর সব data উদ্ধার: ৯৭টা table, ৩৩০ জন user (password সহ), ৩৬৭টা file
- ✅ নতুন Supabase (Singapore), GitHub repo, Cloudflare (Pages + R2 + beta.tscmmh.bd + media.tscmmh.bd)
- ✅ Design system v2: aurora + glass, motion, logo ring, orbit, magnetic, cursor, বাংলা/English, light/dark
- ✅ Database ভিত্তি: user/role/profile, PII আলাদা সুরক্ষিত table, RLS, price list, payment request, voucher
- ✅ ৩৩০ user import (একই email/password/TSC ID), Super Admin, legacy Connects → প্রথম service-এ ছাড়
- ✅ বাকি সব data: notification, audit log, আর ৯০টা table `legacy` archive-এ
- ✅ ছবি/PDF R2-তে (৩৬৭/৩৬৭), profile ছবি media.tscmmh.bd থেকে
- ✅ Login, Signup (role সহ), Password reset, Dashboard
- ✅ Home page (আসল সংখ্যা), Teacher খুঁজুন (search + filter), ৫০ জন teacher-এর profile পেজ
- ✅ SEO: title/description/OG, JSON-LD, sitemap, robots, share-ছবি (বাংলা ঠিক)

## 🔄 ধাপ ১ — টাকা আসার পথ (প্রায় শেষ)
- ✅ **bKash payment পেজ**: service বাছাই → bKash নম্বর (01609291050) + ঠিক টাকা + reference code, copy বাটন, বাংলা নির্দেশনা → sender নম্বর + TrxID (format যাচাই, একই TrxID দুবার নয়) + ঐচ্ছিক screenshot
- ✅ Voucher প্রয়োগ (প্রথম service-এ ছাড়), দাম সবসময় server ঠিক করবে
- 🔄 আমার payment-এর ইতিহাস + status (Unlock-এর জন্য হয়েছে) · প্রিন্টযোগ্য receipt বাকি
- ✅ **নম্বর Unlock (৳১০০)**: request → payment → teacher Accept/Reject → Accept হলে দুই দিকে নম্বর খুলবে; Reject বা ৭২ ঘণ্টায় সাড়া না দিলে স্বয়ংক্রিয় ফেরত; মাসে request-এর সীমা
- ✅ **Admin: payment approval queue** — filter, approve/reject (কারণ সহ), approve হলেই service চালু + notification; প্রতিটা কাজ audit log-এ
- ✅ Notification center (bell, অপঠিত সংখ্যা, realtime) — পুরনো ১,৭৪৯টা notice সহ
- ⬜ Telegram-এ admin alert (নতুন payment এলে) 👤 bot token লাগবে

## ⬜ ধাপ ২ — Student / Guardian flow
- ⬜ **Tuition Post** (free): পুরো option-ভিত্তিক form — curriculum (বাংলা/English version, English medium Edexcel/Cambridge, মাদ্রাসা), class (Play–HSC 2nd year, O/A Level), subject, mode, এলাকা, দিন/সময়, budget, teacher-এর পছন্দ (gender, university, অভিজ্ঞতা)
- ⬜ **Contact detector**: বাংলা/English সংখ্যা, "শূন্য এক নয়", ভাঙা নম্বর, email, @handle, link ধরবে — client + server দুই জায়গায়; flagged হলে admin review
- ⬜ Teacher-দের Hand Raise + guardian-এর কাছে তালিকা; এলাকার teacher-দের email/notification alert
- ⬜ **Smart Match (৳২৫০)**: পুরনো form-এর সব criteria (লক্ষ্য, trial topic, budget, এলাকা, learning style, teacher-এর গুণ, দিন/সময়) → admin একজন dedicated teacher দেবে, না মিললে আরেকজন (সর্বোচ্চ ২); কিছু দিতে না পারলে ফেরত
- ⬜ Trial booking lifecycle: request → accept → class-এর পর দুই পক্ষকে "ক্লাস হয়েছে?" → সম্পন্ন/no-show/অভিযোগ; ৭২ ঘণ্টায় auto-complete → review চাওয়া
- ⬜ Review ও rating (admin approval), তারপর Trust Score দেখা যাবে
- ⬜ "Tuition match হয়েছে?" outcome প্রশ্ন
- ⬜ Saved teacher, compare (৩ জন পর্যন্ত)
- ⬜ Student dashboard: একটাই "পরের কাজ" card + shortcut; phone-এ নিচে tab bar
- ⬜ Profile editor, settings, help/FAQ; প্রথম login-এ "Welcome back" sheet (ছবি/তথ্য re-upload দরকার হলে)

## ⬜ ধাপ ৩ — Teacher portal
- ⬜ Profile editor (subject, level, rate, mode, এলাকা, bio); sensitive পরিবর্তন admin approval-এ
- ⬜ Verification: NID/University ID upload (R2 private, signed link), status; ১০৫ জন pending-এর জন্য সহজ flow
- ⬜ Incoming request: Unlock/Trial accept-reject, সময়সূচী (weekly availability + বন্ধের দিন)
- ⬜ Students, Performance (রেটিং, সম্পন্ন class, monthly chart)
- ⬜ **Profile Boost** (৳১০০/৭ দিন, ৳৩০০/৩০ দিন) — search-এ উপরে, মেয়াদ শেষে auto বন্ধ
- ⬜ Teaching-style ছবি ও video intro (admin approval)
- ⬜ **Premium Portfolio** (৳১,০০০ founders → ৳১,৫০০/বছর): editor (auto-save, live preview), Brand Studio, course, FAQ (JSON-LD), video, student result, `/p/:slug`, analytics, lead form + CSV
- ⬜ Teacher dashboard: একটাই "পরের কাজ" card, phone tab bar

## ⬜ ধাপ ৪ — Admin panel (পুরনো TSC-র সব option + আরও)
- ⬜ Dashboard KPI (user, verification বাকি, payment বাকি, আয়, active user)
- ⬜ User management: খোঁজা, বিস্তারিত, suspend (কারণ + মেয়াদ, auto-unsuspend), delete, role, নোট, "Send reset link"
- ⬜ Verification queue: document zoom viewer, approve/reject (কারণ), TSC Certified/Featured
- ⬜ Profile change approval
- ⬜ Payment, Unlock, Smart Match, Booking, Dispute পরিচালনা
- ⬜ Tuition Post ও content moderation (review, ছবি, video, community)
- ⬜ Service ও দাম editor, platform settings (bKash, announcement bar, maintenance mode)
- ⬜ Broadcast: message/email composer (audience filter, বাংলা/English, preview, schedule, duplicate আটকানো, delivery log)
- ⬜ Gift/referral/voucher/campaign engine
- ⬜ MyNotes admin, MathSprint manager, Free Materials/Tutorial CMS, community moderation
- ⬜ Audit log, analytics, প্রতিটা table-এ CSV export, keyboard shortcut

## ⬜ ধাপ ৫ — Module
- ⬜ **MathSprint 3.0**: edition setting (Reg ১ মার্চ–১০ এপ্রিল, Exam ১৭ এপ্রিল ২০২৭ সকাল ১০টা), registration + payment (Junior ৳১০০ · Mid ৳১২০ · Senior ৳১৫০ = Preparation Companion), companion PDF পৌঁছানো, প্রশ্ন bank (docx import), exam engine (প্রতি প্রশ্নে ৬০ সেকেন্ড, একেকজনের আলাদা প্রশ্ন, fullscreen, tab-switch strike, watermark, single device), auto-grade, rank analysis, certificate, leaderboard, top-১০ live verification, admin live monitor 👤 prize অঙ্ক + প্রশ্ন সেট
- ⬜ MathSprint 1.0/2.0-এর পুরনো registration, badge, ফলাফল নতুন ব্যবস্থায় আনা
- ⬜ **MyNotes + Marketplace**: জমা, review/digitalize, প্রতিটা buyer-এর নাম + TSC ID watermark, bKash কেনা, library, review, seller ৭০% / TSC ৩০%, payout
- ⬜ Free Materials, Tutorials, Teaching Styles
- ⬜ আলাপ-সালাপ community (post, comment, love, category, moderation)
- ⬜ Ambassador ও referral, 1-click support, জ্ঞান পিপাসা (custom note request)
- ⬜ Success stories (অনুমতি নিয়ে), Portfolio Showcase

## ⬜ ধাপ ৬ — Public পেজ
- ⬜ কীভাবে কাজ করে, Pricing (halal নীতি সহ), For Students / Teachers / Guardians
- ⬜ About, Contact (form + bot সুরক্ষা), User Guide/FAQ
- ⬜ Terms, Privacy, Refund policy 👤 লেখা approve
- ⬜ Tuition Board (public তালিকা, contact ছাড়া)

## ⬜ ধাপ ৭ — Platform ও মান
- ⬜ WhatsApp help বাটন, PWA (install করা যাবে)
- ⬜ Cloudflare Turnstile (signup/login/contact/MathSprint-এ bot আটকানো)
- ⬜ Media Worker: private file-এর signed link, notes watermark
- ⬜ Email: Resend (বেশি email-এর জন্য) 👤 ঐচ্ছিক
- ⬜ Google login 👤 Google Cloud OAuth client
- ⬜ Meta Pixel + Conversions API 👤 Pixel ID; Google Search Console 👤 access
- ⬜ Cloudflare Web Analytics
- ⬜ Speed: Lighthouse ≥ ৯০, ছবি AVIF/WebP, ধীর 4G-তে দ্রুত
- ⬜ Accessibility পরীক্ষা
- ⬜ Automated test (Playwright): signup, login, reset, payment, unlock, MathSprint; GitHub-এ CI
- ⬜ Supabase advisor পরিষ্কার, rate limit; Supabase Pro (daily backup) 👤 সিদ্ধান্ত

## ⬜ ধাপ ৮ — Launch
- ⬜ শেষ data sync: ১ অক্টোবরের backup-এর পর পুরনো site-এ যারা নতুন signup/কাজ করেছে, তাদেরও আনা
- ⬜ Migration report (সংখ্যা মিলানো, ২০ জন user-এর তথ্য মিলিয়ে দেখা) 👤 ৫ জন নিজে দেখবেন
- ⬜ আপনার সাথে সম্পূর্ণ পরীক্ষা (UAT)
- ⬜ Cutover: tscmmh.bd + www → নতুন site (রাত ২–৫টা), robots খোলা, sitemap Google-এ জমা, Facebook debugger 👤 সময় ঠিক করবেন
- ⬜ User-দের announcement + email
- ⬜ Lovable ৭ দিন read-only রেখে তারপর মুছে ফেলা 👤
- ⬜ Domain renew (ফেব্রুয়ারি ২০২৭, Cyberison) 👤

---

### 👤 আপনার কাছে এখন পর্যন্ত যা যা লাগবে
1. Telegram bot token (admin alert) — ধাপ ১
2. MathSprint 3.0-এর prize অঙ্ক ও প্রশ্ন সেট — ধাপ ৫
3. Google OAuth client, Meta Pixel ID, Search Console access — ধাপ ৭
4. Terms/Privacy/Refund লেখা approve — ধাপ ৬
5. Cutover-এর তারিখ ও সময় — ধাপ ৮
