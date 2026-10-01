-- TSC baseline 1/n — identity, profiles, private data, roles, settings, notifications, audit, money.
-- Rules (code.md §6.4 + ADR 0001):
--   * Base tables are never readable by anon. Public data is exposed later through explicit-column RPCs.
--   * PII (guardian phone, DOB, address) lives in *_private tables: owner + admin only.
--   * Prices and payment amounts are decided by the server, never by the client.

create extension if not exists pgcrypto;

-- ── Enums (labels kept identical to the old DB so the import is a straight copy) ──────────
create type public.app_role as enum ('student', 'teacher', 'admin', 'super_admin');
create type public.user_status as enum ('active', 'suspended', 'deleted');
create type public.gender_type as enum ('male', 'female', 'other');
create type public.teaching_mode as enum ('online', 'offline', 'both');
create type public.teacher_verification_status as enum ('pending', 'under_review', 'verified', 'active', 'rejected');
create type public.student_verification_status as enum ('pending', 'verified');
create type public.document_type as enum ('nid', 'university_id', 'birth_certificate', 'institutional_id');
create type public.document_verification_status as enum ('pending', 'verified', 'rejected');
create type public.curriculum_track as enum ('bangla_version', 'english_version', 'english_medium', 'madrasah', 'admission', 'university', 'other');
create type public.exam_board as enum ('national', 'edexcel', 'cambridge', 'madrasah_board', 'other');
create type public.payment_request_status as enum ('pending', 'approved', 'rejected', 'refunded', 'cancelled');

-- ── Helpers ───────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Users & roles ─────────────────────────────────────────────────────────────────────────
create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phone_number varchar(20),
  user_status public.user_status not null default 'active',
  referral_code varchar(16) unique,
  suspended_at timestamptz,
  suspended_until timestamptz,
  suspension_reason text,
  moderation_warning_count int not null default 0,
  terms_accepted_at timestamptz,
  needs_password_setup boolean not null default false,
  last_login_at timestamptz,
  last_login_ip varchar(64),
  last_login_device text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger user_profiles_touch before update on public.user_profiles for each row execute function public.touch_updated_at();

create table public.user_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_role_idx on public.user_roles (role);

-- SECURITY DEFINER so RLS policies can call them without recursive RLS on user_roles.
create or replace function public.has_role(_user uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = _user and role = _role)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'super_admin'))
$$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin')
$$;

-- ── Profiles ──────────────────────────────────────────────────────────────────────────────
create sequence public.student_tsc_id_seq;
create sequence public.teacher_tsc_id_seq;

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  tsc_id varchar(12) not null unique check (tsc_id ~ '^S[0-9]{1,9}$'),
  full_name varchar(120),
  gender public.gender_type,
  profile_photo_url text,            -- legacy Supabase URL (migration); new uploads use profile_photo_key
  profile_photo_key text,            -- R2 object key
  curriculum public.curriculum_track,
  exam_board public.exam_board,
  current_class varchar(40),         -- level code, e.g. 'class_8', 'hsc_1', 'o_level'
  group_stream varchar(40),
  education_medium text,             -- legacy free value kept for history
  subjects text[] not null default '{}',
  subject_teacher_needed text,       -- legacy
  institution_name varchar(160),
  district varchar(60),
  thana varchar(60),
  teaching_mode_preference public.teaching_mode,
  monthly_budget_min numeric(10, 0),
  monthly_budget_max numeric(10, 0),
  budget_negotiable boolean not null default false,
  guardian_consent boolean not null default false,
  bio_summary text,
  verification_status public.student_verification_status not null default 'pending',
  profile_completion_percentage int not null default 0,
  tutor_needed_completed boolean not null default false,
  is_ambassador boolean not null default false,
  ambassador_tier text,
  consent_success_story boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index student_profiles_district_idx on public.student_profiles (district);
create trigger student_profiles_touch before update on public.student_profiles for each row execute function public.touch_updated_at();

create table public.student_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  guardian_name varchar(120),
  guardian_phone varchar(20),
  guardian_relationship varchar(40),
  date_of_birth date,
  exact_address text,
  updated_at timestamptz not null default now()
);
create trigger student_private_touch before update on public.student_private for each row execute function public.touch_updated_at();

create table public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  tsc_id varchar(12) not null unique check (tsc_id ~ '^T[0-9]{1,9}$'),
  full_name varchar(120),
  gender public.gender_type,
  profile_photo_url text,
  profile_photo_key text,
  university_name varchar(160),
  institution_name varchar(160),
  department varchar(120),
  academic_year varchar(40),
  experience_years int check (experience_years between 0 and 60),
  teaching_level text,
  curricula public.curriculum_track[] not null default '{}',
  subjects_offered text[] not null default '{}',
  bio_summary text,
  district varchar(60),
  thana varchar(60),
  teaching_mode_offered public.teaching_mode,
  hourly_rate_online numeric(10, 0),
  monthly_rate_inperson numeric(10, 0),
  rate_negotiable boolean not null default false,
  verification_status public.teacher_verification_status not null default 'pending',
  is_tsc_certified boolean not null default false,
  is_online_certified boolean not null default false,
  is_featured boolean not null default false,
  profile_completion_percentage int not null default 0,
  average_rating numeric(3, 2) not null default 0,
  total_reviews int not null default 0,
  total_students_taught int not null default 0,
  total_hours_taught numeric(10, 1) not null default 0,
  booking_completion_rate numeric(5, 2) not null default 0,
  services_completed int not null default 0,
  total_love_count int not null default 0,
  is_ambassador boolean not null default false,
  ambassador_tier text,
  consent_success_story boolean not null default false,
  notify_teacher_needed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teacher_profiles_district_idx on public.teacher_profiles (district);
create index teacher_profiles_status_idx on public.teacher_profiles (verification_status);
create index teacher_profiles_subjects_idx on public.teacher_profiles using gin (subjects_offered);
create trigger teacher_profiles_touch before update on public.teacher_profiles for each row execute function public.touch_updated_at();

create table public.teacher_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  guardian_name varchar(120),
  guardian_phone varchar(20),
  guardian_relationship varchar(40),
  date_of_birth date,
  preferred_address text,
  updated_at timestamptz not null default now()
);
create trigger teacher_private_touch before update on public.teacher_private for each row execute function public.touch_updated_at();

-- Premium portfolio / brand studio (1:1 with teacher, split out of teacher_profiles).
create table public.teacher_portfolios (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  started_at timestamptz,
  expires_at timestamptz,
  vanity_slug text unique check (vanity_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  vanity_slug_change_count int not null default 0,
  vanity_slug_changed_at timestamptz,
  tagline text check (char_length(tagline) <= 140),
  signature_quote text,
  accent_color text,
  theme_accent text,
  cover_banner_url text,
  intro_video_url text,
  brand_name text check (char_length(brand_name) <= 40),
  brand_name_change_count int not null default 0,
  brand_name_changed_at timestamptz,
  brand_font text, brand_font_weight text, brand_font_size text, brand_letter_spacing text, brand_text_transform text,
  brand_logo_url text, brand_logo_size text, brand_logo_position text, brand_logo_shape text,
  view_count int not null default 0,
  last_active_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger teacher_portfolios_touch before update on public.teacher_portfolios for each row execute function public.touch_updated_at();

-- ── New-user trigger: role from signup metadata (never admin), TSC ID, empty rows ─────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  _role public.app_role;
  _name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  -- Rows imported from the old system carry their own profiles; the importer sets this flag.
  if coalesce(new.raw_app_meta_data ->> 'tsc_import', '') = 'true' then
    return new;
  end if;
  _role := case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end;

  insert into public.user_profiles (user_id, referral_code)
  values (new.id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  insert into public.user_roles (user_id, role) values (new.id, _role);

  if _role = 'teacher' then
    insert into public.teacher_profiles (user_id, tsc_id, full_name)
    values (new.id, 'T' || nextval('public.teacher_tsc_id_seq'), _name);
    insert into public.teacher_private (user_id) values (new.id);
  else
    insert into public.student_profiles (user_id, tsc_id, full_name)
    values (new.id, 'S' || nextval('public.student_tsc_id_seq'), _name);
    insert into public.student_private (user_id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ── Settings, notifications, audit ────────────────────────────────────────────────────────
create table public.platform_settings (
  key varchar(80) primary key,
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
create trigger platform_settings_touch before update on public.platform_settings for each row execute function public.touch_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type varchar(40) not null,
  title text not null,
  message text not null,
  metadata jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users (id) on delete set null,
  action_type varchar(80) not null,
  target_table varchar(80),
  target_id uuid,
  action_details jsonb not null default '{}',
  ip_address varchar(64),
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

create or replace function public.log_admin_action(_action text, _table text, _target uuid, _details jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  insert into public.admin_audit_log (admin_user_id, action_type, target_table, target_id, action_details)
  values (auth.uid(), _action, _table, _target, coalesce(_details, '{}'));
end $$;

-- ── Money: prices, payment requests (manual bKash), vouchers ──────────────────────────────
create table public.service_prices (
  code varchar(40) primary key,          -- e.g. contact_unlock, smart_match, boost_7d, mathsprint_junior
  audience varchar(20) not null check (audience in ('student', 'teacher', 'any')),
  name_bn text not null,
  name_en text not null,
  price_bdt int not null check (price_bdt >= 0 and price_bdt % 10 = 0),  -- flat taka only
  duration_days int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
create trigger service_prices_touch before update on public.service_prices for each row execute function public.touch_updated_at();

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_bdt int not null check (amount_bdt > 0),
  reason varchar(40) not null,           -- legacy_connects | referral | campaign | admin
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_payment_id uuid,
  created_at timestamptz not null default now()
);
create index vouchers_user_idx on public.vouchers (user_id);

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service_code varchar(40) not null references public.service_prices (code),
  ref_table varchar(60),
  ref_id uuid,
  list_price_bdt int not null,
  discount_bdt int not null default 0,
  amount_bdt int not null check (amount_bdt >= 0),
  voucher_id uuid references public.vouchers (id),
  method varchar(20) not null default 'bkash',
  sender_number varchar(20),
  trx_id varchar(20) unique check (trx_id is null or trx_id ~ '^[A-Z0-9]{8,12}$'),
  reference_code varchar(12) not null unique,
  screenshot_key text,
  status public.payment_request_status not null default 'pending',
  admin_note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_requests_status_idx on public.payment_requests (status, created_at desc);
create index payment_requests_user_idx on public.payment_requests (user_id, created_at desc);
create trigger payment_requests_touch before update on public.payment_requests for each row execute function public.touch_updated_at();
alter table public.vouchers add constraint vouchers_payment_fk foreign key (redeemed_payment_id) references public.payment_requests (id);

-- The only way a user creates a payment request: the server prices it.
create or replace function public.create_payment_request(_service text, _ref_table text default null, _ref_id uuid default null, _voucher uuid default null)
returns public.payment_requests language plpgsql security definer set search_path = '' as $$
declare
  _price public.service_prices;
  _v public.vouchers;
  _discount int := 0;
  _row public.payment_requests;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select * into _price from public.service_prices where code = _service and is_active;
  if not found then raise exception 'unknown service'; end if;
  if _voucher is not null then
    select * into _v from public.vouchers
      where id = _voucher and user_id = auth.uid() and redeemed_at is null and (expires_at is null or expires_at > now())
      for update;
    if not found then raise exception 'voucher not usable'; end if;
    _discount := least(_v.amount_bdt, _price.price_bdt);
  end if;
  insert into public.payment_requests (user_id, service_code, ref_table, ref_id, list_price_bdt, discount_bdt, amount_bdt, voucher_id, reference_code)
  values (auth.uid(), _service, _ref_table, _ref_id, _price.price_bdt, _discount, _price.price_bdt - _discount, _voucher,
          'TSC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)))
  returning * into _row;
  return _row;
end $$;

-- User attaches their bKash proof to their own pending request.
create or replace function public.submit_payment_proof(_request uuid, _sender text, _trx text, _screenshot text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.payment_requests
     set sender_number = regexp_replace(_sender, '[^0-9+]', '', 'g'),
         trx_id = upper(trim(_trx)),
         screenshot_key = _screenshot
   where id = _request and user_id = auth.uid() and status = 'pending' and trx_id is null;
  if not found then raise exception 'request not found or already submitted'; end if;
end $$;

-- ── Row-level security ────────────────────────────────────────────────────────────────────
alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_private enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_private enable row level security;
alter table public.teacher_portfolios enable row level security;
alter table public.platform_settings enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.service_prices enable row level security;
alter table public.vouchers enable row level security;
alter table public.payment_requests enable row level security;

revoke all on all tables in schema public from anon;

-- Owner can read their own rows; admins read everything.
create policy own_read on public.user_profiles for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.user_roles for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.student_profiles for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.student_private for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.teacher_profiles for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.teacher_private for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.teacher_portfolios for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy own_read on public.vouchers for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy own_read on public.payment_requests for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- Owners edit their own profile rows (sensitive fields are locked by column grants below).
create policy own_update on public.student_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_update on public.student_private for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_update on public.teacher_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_update on public.teacher_private for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_update on public.user_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_update on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Admins write everything (every admin write also goes through log_admin_action in the app).
create policy admin_write on public.user_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.student_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.student_private for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.teacher_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.teacher_private for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.teacher_portfolios for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.vouchers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.payment_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.platform_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_write on public.service_prices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy super_admin_roles on public.user_roles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy admin_read on public.admin_audit_log for select to authenticated using (public.is_admin());

-- Public-safe reads (anon included): active prices and public settings.
create policy public_read on public.service_prices for select to anon, authenticated using (is_active or public.is_admin());
create policy public_read on public.platform_settings for select to anon, authenticated using (is_public or public.is_admin());
grant select on public.service_prices, public.platform_settings to anon;

-- Column-level locks: users can only update harmless columns on their own rows.
revoke update on public.user_profiles, public.student_profiles, public.teacher_profiles, public.notifications from authenticated;
grant update (phone_number, terms_accepted_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term) on public.user_profiles to authenticated;
grant update (full_name, gender, profile_photo_key, curriculum, exam_board, current_class, group_stream, subjects, institution_name,
              district, thana, teaching_mode_preference, monthly_budget_min, monthly_budget_max, budget_negotiable, guardian_consent,
              bio_summary, consent_success_story) on public.student_profiles to authenticated;
grant update (full_name, gender, profile_photo_key, university_name, institution_name, department, academic_year, experience_years,
              teaching_level, curricula, subjects_offered, bio_summary, district, thana, teaching_mode_offered, hourly_rate_online,
              monthly_rate_inperson, rate_negotiable, consent_success_story, notify_teacher_needed) on public.teacher_profiles to authenticated;
grant update (is_read) on public.notifications to authenticated;
-- Admin writes go through the admin_write policies; give admins (authenticated role) full column access via SECURITY DEFINER RPCs later.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_admin_action(text, text, uuid, jsonb) from public, anon;
revoke execute on function public.create_payment_request(text, text, uuid, uuid) from public, anon;
revoke execute on function public.submit_payment_proof(uuid, text, text, text) from public, anon;
