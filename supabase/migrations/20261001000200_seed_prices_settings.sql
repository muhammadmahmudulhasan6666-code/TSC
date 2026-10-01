-- Price list and platform settings from ADR 0001. Admin edits these from the panel; the app never hard-codes them.
insert into public.service_prices (code, audience, name_bn, name_en, price_bdt, duration_days, sort_order) values
  ('contact_unlock',     'student', 'Teacher-এর নম্বর Unlock',           'Unlock a teacher''s number',      100, null, 10),
  ('smart_match',        'student', 'Smart Match — TSC আপনার Teacher খুঁজে দেবে', 'Smart Match — TSC finds your teacher', 250, null, 20),
  ('boost_7d',           'teacher', 'Profile Boost — ৭ দিন',            'Profile Boost — 7 days',          100, 7,   30),
  ('boost_30d',          'teacher', 'Profile Boost — ৩০ দিন',           'Profile Boost — 30 days',         300, 30,  31),
  ('portfolio_founders', 'teacher', 'Premium Portfolio — Founders (১ বছর)', 'Premium Portfolio — Founders (1 year)', 1000, 365, 40),
  ('portfolio_year',     'teacher', 'Premium Portfolio — ১ বছর',         'Premium Portfolio — 1 year',      1500, 365, 41),
  ('mathsprint_junior',  'student', 'MathSprint Junior — Preparation Companion', 'MathSprint Junior — Preparation Companion', 100, null, 50),
  ('mathsprint_mid',     'student', 'MathSprint Mid — Preparation Companion',    'MathSprint Mid — Preparation Companion',    120, null, 51),
  ('mathsprint_senior',  'student', 'MathSprint Senior — Preparation Companion', 'MathSprint Senior — Preparation Companion', 150, null, 52);

insert into public.platform_settings (key, value, is_public, description) values
  ('contact', '{"email": "tsc.mmh.bd@gmail.com", "whatsapp": "8801861977995"}', true, 'Public contact details'),
  ('bkash_receiver', '{"number": null, "type": null}', true, 'bKash number users pay to (set by admin before launch)'),
  ('contact_unlock', '{"refund_after_hours": 72, "monthly_request_limit": 10}', true, 'Unlock rules: auto-refund window and anti-spam limit'),
  ('smart_match', '{"max_teachers": 2}', true, 'One dedicated teacher, at most one replacement'),
  ('mynotes', '{"seller_share_pct": 70}', true, 'MyNotes revenue split'),
  ('portfolio', '{"founders_active": true, "founders_slots": 50}', true, 'Premium Portfolio founders batch'),
  ('referral', '{"enabled": true}', false, 'Referral programme switch'),
  ('maintenance_mode', 'false', true, 'Show the maintenance screen to non-admins');
