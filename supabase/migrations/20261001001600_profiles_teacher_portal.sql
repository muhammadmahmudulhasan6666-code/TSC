-- Profiles (student + teacher), teacher verification documents, profile-change approval, availability,
-- teaching media (images / video intro), Profile Boost. Old-site rows are carried over.

-- ── Tables ──────────────────────────────────────────────────────────────────────────────────────────────────
create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  doc_type public.document_type not null,
  file_key text not null,
  file_name text,
  status public.document_verification_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index verification_documents_user_idx on public.verification_documents (user_id, created_at desc);
create index verification_documents_pending_idx on public.verification_documents (created_at) where status = 'pending';
alter table public.verification_documents enable row level security;
create policy own_or_admin on public.verification_documents for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());

create table public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  changes jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'partially_approved', 'rejected', 'cancelled')),
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index profile_change_one_pending on public.profile_change_requests (user_id) where status = 'pending';
alter table public.profile_change_requests enable row level security;
create policy own_or_admin on public.profile_change_requests for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());

create table public.teacher_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),  -- 0 = Sunday
  start_time time not null,
  end_time time not null check (end_time > start_time),
  created_at timestamptz not null default now()
);
create index teacher_availability_idx on public.teacher_availability (teacher_id, day_of_week, start_time);
alter table public.teacher_availability enable row level security;
create policy read_all on public.teacher_availability for select to anon, authenticated using (true);

create table public.teacher_media (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  caption text check (char_length(caption) <= 120),
  sort_order int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  love_count int not null default 0,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index teacher_media_teacher_idx on public.teacher_media (teacher_id, sort_order);
alter table public.teacher_media enable row level security;
create policy read_approved on public.teacher_media for select to anon, authenticated
  using (status = 'approved' or teacher_id = (select auth.uid()) or private.is_admin());

create table public.profile_boosts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('boost_7d', 'boost_30d', 'legacy')),
  payment_request_id uuid references public.payment_requests (id),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'active', 'expired', 'cancelled')),
  created_at timestamptz not null default now()
);
create index profile_boosts_active_idx on public.profile_boosts (teacher_id, ends_at desc);
alter table public.profile_boosts enable row level security;
create policy own_or_admin on public.profile_boosts for select to authenticated using (teacher_id = (select auth.uid()) or private.is_admin());

-- ── Completion % (drives search order and the "next step" card) ─────────────────────────────────────────────
create or replace function private.recalc_completion(_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.teacher_profiles t set profile_completion_percentage = (
      (case when coalesce(trim(t.full_name), '') <> '' then 10 else 0 end)
    + (case when t.profile_photo_url is not null then 15 else 0 end)
    + (case when coalesce(trim(t.university_name), '') <> '' and coalesce(trim(t.department), '') <> '' then 15 else 0 end)
    + (case when cardinality(t.subjects_offered) > 0 then 15 else 0 end)
    + (case when char_length(coalesce(t.bio_summary, '')) >= 60 then 15 else 0 end)
    + (case when t.district is not null and t.teaching_mode_offered is not null then 10 else 0 end)
    + (case when t.monthly_rate_inperson is not null or t.hourly_rate_online is not null or t.rate_negotiable then 5 else 0 end)
    + (case when exists (select 1 from public.verification_documents d where d.user_id = _user) then 15 else 0 end))
  where t.user_id = _user;
  update public.student_profiles s set profile_completion_percentage = (
      (case when coalesce(trim(s.full_name), '') <> '' then 20 else 0 end)
    + (case when s.profile_photo_url is not null then 10 else 0 end)
    + (case when s.current_class is not null then 20 else 0 end)
    + (case when cardinality(s.subjects) > 0 then 15 else 0 end)
    + (case when s.district is not null then 15 else 0 end)
    + (case when exists (select 1 from public.student_private p where p.user_id = _user and coalesce(p.guardian_phone, '') <> '') then 20 else 0 end))
  where s.user_id = _user;
end $$;

-- ── My profile ──────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_my_profile() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'phone', (select phone_number from public.user_profiles where user_id = auth.uid()),
    'student', (select row_to_json(s) from public.student_profiles s where s.user_id = auth.uid()),
    'student_private', (select row_to_json(p) from public.student_private p where p.user_id = auth.uid()),
    'teacher', (select row_to_json(t) from public.teacher_profiles t where t.user_id = auth.uid()),
    'teacher_private', (select row_to_json(p) from public.teacher_private p where p.user_id = auth.uid()),
    'pending_change', (select row_to_json(c) from public.profile_change_requests c where c.user_id = auth.uid() and c.status = 'pending'),
    'documents', (select coalesce(json_agg(d order by d.created_at desc), '[]') from public.verification_documents d where d.user_id = auth.uid()),
    'availability', (select coalesce(json_agg(a order by a.day_of_week, a.start_time), '[]') from public.teacher_availability a where a.teacher_id = auth.uid()),
    'media', (select coalesce(json_agg(m order by m.kind, m.sort_order, m.created_at), '[]') from public.teacher_media m where m.teacher_id = auth.uid()),
    'boost', (select row_to_json(b) from public.profile_boosts b where b.teacher_id = auth.uid() and b.status = 'active' and b.ends_at > now() order by b.ends_at desc limit 1)
  )
$$;

create or replace function public.update_my_student_profile(_p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid();
begin
  if not exists (select 1 from public.student_profiles where user_id = _me) then raise exception 'not a student' using errcode = 'TS403'; end if;
  if private.find_contact(_p ->> 'bio_summary') is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;
  update public.student_profiles set
    full_name = coalesce(nullif(trim(_p ->> 'full_name'), ''), full_name),
    gender = nullif(_p ->> 'gender', '')::public.gender_type,
    curriculum = nullif(_p ->> 'curriculum', '')::public.curriculum_track,
    current_class = nullif(_p ->> 'current_class', ''),
    group_stream = nullif(_p ->> 'group_stream', ''),
    subjects = coalesce(array(select jsonb_array_elements_text(_p -> 'subjects')), '{}'),
    institution_name = nullif(trim(_p ->> 'institution_name'), ''),
    district = nullif(_p ->> 'district', ''),
    thana = nullif(_p ->> 'thana', ''),
    teaching_mode_preference = nullif(_p ->> 'mode', '')::public.teaching_mode,
    monthly_budget_min = nullif(_p ->> 'budget_min', '')::numeric,
    monthly_budget_max = nullif(_p ->> 'budget_max', '')::numeric,
    budget_negotiable = coalesce((_p ->> 'negotiable')::boolean, budget_negotiable),
    bio_summary = nullif(left(trim(_p ->> 'bio_summary'), 300), ''),
    updated_at = now()
  where user_id = _me;
  insert into public.student_private (user_id, guardian_name, guardian_phone, guardian_relationship, exact_address)
  values (_me, nullif(trim(_p ->> 'guardian_name'), ''), nullif(regexp_replace(coalesce(_p ->> 'guardian_phone', ''), '[^0-9]', '', 'g'), ''),
          nullif(_p ->> 'guardian_relationship', ''), nullif(trim(_p ->> 'address'), ''))
  on conflict (user_id) do update set guardian_name = excluded.guardian_name, guardian_phone = excluded.guardian_phone,
    guardian_relationship = excluded.guardian_relationship, exact_address = excluded.exact_address, updated_at = now();
  if _p ? 'phone' then
    update public.user_profiles set phone_number = nullif(regexp_replace(coalesce(_p ->> 'phone', ''), '[^0-9]', '', 'g'), ''), updated_at = now() where user_id = _me;
  end if;
  perform private.recalc_completion(_me);
end $$;

-- Teacher: everyday fields apply at once; identity fields of a verified teacher wait for admin approval.
create or replace function public.update_my_teacher_profile(_p jsonb) returns json
language plpgsql security definer set search_path = '' as $$
declare
  _me uuid := auth.uid();
  _t public.teacher_profiles;
  _sensitive jsonb := '{}'::jsonb;
  _k text;
begin
  select * into _t from public.teacher_profiles where user_id = _me;
  if not found then raise exception 'not a teacher' using errcode = 'TS403'; end if;
  if private.find_contact(_p ->> 'bio_summary') is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;

  update public.teacher_profiles set
    bio_summary = nullif(left(trim(_p ->> 'bio_summary'), 1200), ''),
    subjects_offered = coalesce(array(select jsonb_array_elements_text(_p -> 'subjects')), subjects_offered),
    teaching_level = nullif(_p ->> 'teaching_level', ''),
    curricula = coalesce(array(select jsonb_array_elements_text(_p -> 'curricula'))::public.curriculum_track[], curricula),
    teaching_mode_offered = nullif(_p ->> 'mode', '')::public.teaching_mode,
    district = nullif(_p ->> 'district', ''),
    thana = nullif(_p ->> 'thana', ''),
    experience_years = nullif(_p ->> 'experience_years', '')::int,
    hourly_rate_online = nullif(_p ->> 'hourly_rate_online', '')::numeric,
    monthly_rate_inperson = nullif(_p ->> 'monthly_rate_inperson', '')::numeric,
    rate_negotiable = coalesce((_p ->> 'rate_negotiable')::boolean, rate_negotiable),
    notify_teacher_needed = coalesce((_p ->> 'notify_teacher_needed')::boolean, notify_teacher_needed),
    updated_at = now()
  where user_id = _me;

  foreach _k in array array['full_name', 'gender', 'university_name', 'institution_name', 'department', 'academic_year'] loop
    if _p ? _k and coalesce(_p ->> _k, '') is distinct from coalesce(to_jsonb(_t) ->> _k, '') then
      _sensitive := _sensitive || jsonb_build_object(_k, nullif(trim(_p ->> _k), ''));
    end if;
  end loop;

  if _sensitive <> '{}'::jsonb then
    if _t.verification_status in ('verified', 'active') then
      insert into public.profile_change_requests (user_id, changes) values (_me, _sensitive)
      on conflict (user_id) where status = 'pending' do update set changes = public.profile_change_requests.changes || excluded.changes, created_at = now();
    else
      update public.teacher_profiles set
        full_name = coalesce(_sensitive ->> 'full_name', full_name) ,
        gender = coalesce(nullif(_sensitive ->> 'gender', '')::public.gender_type, gender),
        university_name = case when _sensitive ? 'university_name' then _sensitive ->> 'university_name' else university_name end,
        institution_name = case when _sensitive ? 'institution_name' then _sensitive ->> 'institution_name' else institution_name end,
        department = case when _sensitive ? 'department' then _sensitive ->> 'department' else department end,
        academic_year = case when _sensitive ? 'academic_year' then _sensitive ->> 'academic_year' else academic_year end
      where user_id = _me;
      _sensitive := '{}'::jsonb;
    end if;
  end if;

  insert into public.teacher_private (user_id, date_of_birth, preferred_address)
  values (_me, nullif(_p ->> 'date_of_birth', '')::date, nullif(trim(_p ->> 'address'), ''))
  on conflict (user_id) do update set date_of_birth = excluded.date_of_birth, preferred_address = excluded.preferred_address, updated_at = now();
  if _p ? 'phone' then
    update public.user_profiles set phone_number = nullif(regexp_replace(coalesce(_p ->> 'phone', ''), '[^0-9]', '', 'g'), ''), updated_at = now() where user_id = _me;
  end if;
  perform private.recalc_completion(_me);
  return json_build_object('pending', _sensitive);
end $$;

-- Photo: the key must be an avatar this user uploaded.
create or replace function public.set_my_photo(_key text) returns text
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid(); _url text := 'https://media.tscmmh.bd/' || _key;
begin
  if not exists (select 1 from public.media_files where key = _key and owner_id = _me and kind = 'avatar') then raise exception 'bad file' using errcode = 'TS403'; end if;
  update public.teacher_profiles set profile_photo_key = _key, profile_photo_url = _url, updated_at = now() where user_id = _me;
  update public.student_profiles set profile_photo_key = _key, profile_photo_url = _url, updated_at = now() where user_id = _me;
  perform private.recalc_completion(_me);
  return _url;
end $$;

-- ── Verification documents ──────────────────────────────────────────────────────────────────────────────────
create or replace function public.submit_verification_document(_type text, _key text, _file_name text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid();
begin
  if not exists (select 1 from public.teacher_profiles where user_id = _me) then raise exception 'teachers only' using errcode = 'TS403'; end if;
  if not exists (select 1 from public.media_files where key = _key and owner_id = _me and kind = 'document') then raise exception 'bad file' using errcode = 'TS403'; end if;
  insert into public.verification_documents (user_id, doc_type, file_key, file_name) values (_me, _type::public.document_type, _key, left(_file_name, 120));
  update public.teacher_profiles set verification_status = 'under_review', updated_at = now() where user_id = _me and verification_status in ('pending', 'rejected');
  perform private.recalc_completion(_me);
end $$;

create or replace function public.admin_list_verification(_status text default 'under_review') returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.updated_at desc) from (
    select t.user_id, t.tsc_id, t.full_name, t.profile_photo_url, t.university_name, t.department, t.academic_year, t.subjects_offered,
           t.district, t.verification_status, t.is_tsc_certified, t.is_featured, t.profile_completion_percentage, t.updated_at, t.created_at,
           au.email, up.phone_number,
           (select coalesce(json_agg(d order by d.created_at desc), '[]') from public.verification_documents d where d.user_id = t.user_id) as documents
    from public.teacher_profiles t join auth.users au on au.id = t.user_id left join public.user_profiles up on up.user_id = t.user_id
    where _status = 'all' or t.verification_status::text = _status
    limit 300
  ) x), '[]') end
$$;

create or replace function public.admin_set_teacher_status(_user uuid, _status text, _reason text default null, _certified boolean default null, _featured boolean default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _old public.teacher_profiles;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  select * into _old from public.teacher_profiles where user_id = _user for update;
  if not found then raise exception 'teacher not found'; end if;
  update public.teacher_profiles set verification_status = coalesce(nullif(_status, '')::public.teacher_verification_status, verification_status),
         is_tsc_certified = coalesce(_certified, is_tsc_certified), is_featured = coalesce(_featured, is_featured), updated_at = now()
   where user_id = _user;
  if _status = 'verified' then
    update public.verification_documents set status = 'verified', reviewed_by = auth.uid(), reviewed_at = now() where user_id = _user and status = 'pending';
  elsif _status = 'rejected' then
    update public.verification_documents set status = 'rejected', rejection_reason = _reason, reviewed_by = auth.uid(), reviewed_at = now() where user_id = _user and status = 'pending';
  end if;
  if _status is not null and _status <> _old.verification_status::text then
    perform private.notify(_user, 'verification',
      case _status when 'verified' then 'অভিনন্দন! আপনি এখন Verified Teacher ✅' when 'rejected' then 'Verification সম্পন্ন হয়নি' else 'Verification status বদলেছে' end,
      case _status when 'verified' then 'আপনার profile এখন সবাই খুঁজে পাবে। Profile সম্পূর্ণ রাখুন — বেশি request আসবে।'
                   when 'rejected' then coalesce('কারণ: ' || _reason || '। ', '') || 'ঠিক document আবার upload করুন।' else _status end,
      jsonb_build_object('status', _status));
  end if;
  perform public.log_admin_action('teacher_status', 'teacher_profiles', _old.id,
    jsonb_build_object('from', _old.verification_status, 'to', _status, 'reason', _reason, 'certified', _certified, 'featured', _featured));
end $$;

-- ── Profile change approval ─────────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_change_requests(_status text default 'pending') returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.created_at desc) from (
    select c.*, private.person_card(c.user_id) as person,
           (select jsonb_build_object('full_name', t.full_name, 'gender', t.gender, 'university_name', t.university_name, 'institution_name', t.institution_name,
                                      'department', t.department, 'academic_year', t.academic_year) from public.teacher_profiles t where t.user_id = c.user_id) as current
    from public.profile_change_requests c where _status = 'all' or c.status = _status limit 200
  ) x), '[]') end
$$;

-- _keys: which proposed fields to accept (null = all).
create or replace function public.admin_review_change_request(_id uuid, _approve boolean, _keys text[] default null, _note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _c public.profile_change_requests; _ok jsonb := '{}'::jsonb; _k text;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  select * into _c from public.profile_change_requests where id = _id and status = 'pending' for update;
  if not found then raise exception 'not pending'; end if;
  if _approve then
    for _k in select jsonb_object_keys(_c.changes) loop
      if _keys is null or _k = any (_keys) then _ok := _ok || jsonb_build_object(_k, _c.changes -> _k); end if;
    end loop;
    update public.teacher_profiles set
      full_name = coalesce(_ok ->> 'full_name', full_name),
      gender = coalesce(nullif(_ok ->> 'gender', '')::public.gender_type, gender),
      university_name = case when _ok ? 'university_name' then _ok ->> 'university_name' else university_name end,
      institution_name = case when _ok ? 'institution_name' then _ok ->> 'institution_name' else institution_name end,
      department = case when _ok ? 'department' then _ok ->> 'department' else department end,
      academic_year = case when _ok ? 'academic_year' then _ok ->> 'academic_year' else academic_year end,
      updated_at = now()
    where user_id = _c.user_id;
  end if;
  update public.profile_change_requests set
    status = case when not _approve then 'rejected' when _keys is null or (select count(*) from jsonb_object_keys(_c.changes)) = cardinality(_keys) then 'approved' else 'partially_approved' end,
    note = _note, reviewed_by = auth.uid(), reviewed_at = now()
  where id = _id;
  perform private.notify(_c.user_id, 'profile', case when _approve then 'Profile পরিবর্তন approve হয়েছে' else 'Profile পরিবর্তন approve হয়নি' end,
    coalesce(_note, case when _approve then 'নতুন তথ্য এখন profile-এ দেখাচ্ছে।' else 'প্রয়োজনে admin-এর সাথে WhatsApp-এ কথা বলুন।' end), '{}'::jsonb);
  perform private.recalc_completion(_c.user_id);
  perform public.log_admin_action('profile_change_reviewed', 'profile_change_requests', _id, jsonb_build_object('approve', _approve, 'keys', _keys));
end $$;

-- ── Availability ────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.set_my_availability(_slots jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid();
begin
  if not exists (select 1 from public.teacher_profiles where user_id = _me) then raise exception 'teachers only' using errcode = 'TS403'; end if;
  if jsonb_array_length(_slots) > 42 then raise exception 'too many slots'; end if;
  delete from public.teacher_availability where teacher_id = _me;
  insert into public.teacher_availability (teacher_id, day_of_week, start_time, end_time)
  select _me, (s ->> 'day')::int, (s ->> 'start')::time, (s ->> 'end')::time from jsonb_array_elements(_slots) s;
end $$;

-- ── Teaching media (approved by admin before it shows publicly) ─────────────────────────────────────────────
create or replace function public.add_teacher_media(_kind text, _key text, _caption text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid(); _id uuid;
begin
  if not exists (select 1 from public.media_files where key = _key and owner_id = _me and kind = case _kind when 'image' then 'teaching' else 'video' end) then
    raise exception 'bad file' using errcode = 'TS403';
  end if;
  if _kind = 'image' and (select count(*) from public.teacher_media where teacher_id = _me and kind = 'image' and status <> 'rejected') >= 12 then
    raise exception 'max 12 images' using errcode = 'TS429';
  end if;
  if _kind = 'video' then delete from public.teacher_media where teacher_id = _me and kind = 'video' and status <> 'approved'; end if;
  if private.find_contact(_caption) is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;
  insert into public.teacher_media (teacher_id, kind, url, caption, sort_order)
  values (_me, _kind, 'https://media.tscmmh.bd/' || _key, nullif(trim(_caption), ''), coalesce((select max(sort_order) + 1 from public.teacher_media where teacher_id = _me), 0))
  returning id into _id;
  return _id;
end $$;

create or replace function public.remove_teacher_media(_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.teacher_media where id = _id and (teacher_id = auth.uid() or private.is_admin());
$$;

create or replace function public.admin_list_media(_status text default 'pending') returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.created_at) from (
    select m.*, private.person_card(m.teacher_id) as teacher from public.teacher_media m where _status = 'all' or m.status = _status limit 200
  ) x), '[]') end
$$;

create or replace function public.admin_review_media(_id uuid, _approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare _m public.teacher_media;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  update public.teacher_media set status = case when _approve then 'approved' else 'rejected' end, reviewed_at = now() where id = _id returning * into _m;
  perform private.notify(_m.teacher_id, 'media', case when _approve then 'আপনার ' || case _m.kind when 'video' then 'video intro' else 'teaching ছবি' end || ' profile-এ যোগ হয়েছে'
                                                   else case _m.kind when 'video' then 'Video intro' else 'Teaching ছবি' end || ' approve হয়নি' end, '', '{}'::jsonb);
  perform public.log_admin_action('media_reviewed', 'teacher_media', _id, jsonb_build_object('approve', _approve));
end $$;

-- Public: approved media + weekly availability for a profile page.
create or replace function public.get_teacher_extras(_tsc_id text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'media', (select coalesce(json_agg(json_build_object('id', m.id, 'kind', m.kind, 'url', m.url, 'caption', m.caption) order by m.kind desc, m.sort_order), '[]')
              from public.teacher_media m where m.teacher_id = t.user_id and m.status = 'approved'),
    'availability', (select coalesce(json_agg(json_build_object('day', a.day_of_week, 'start', a.start_time, 'end', a.end_time) order by a.day_of_week, a.start_time), '[]')
                     from public.teacher_availability a where a.teacher_id = t.user_id))
  from public.teacher_profiles t where upper(t.tsc_id) = upper(_tsc_id) and t.verification_status in ('verified', 'active')
$$;

-- ── Profile Boost ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.request_boost(_plan text, _voucher uuid default null) returns json
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid(); _b public.profile_boosts; _pay public.payment_requests;
begin
  if _plan not in ('boost_7d', 'boost_30d') then raise exception 'bad plan'; end if;
  if not exists (select 1 from public.teacher_profiles where user_id = _me and verification_status in ('verified', 'active')) then
    raise exception 'only verified teachers can boost' using errcode = 'TS403';
  end if;
  select * into _b from public.profile_boosts where teacher_id = _me and status = 'awaiting_payment' and plan = _plan;
  if found then
    select * into _pay from public.payment_requests where id = _b.payment_request_id;
    if _pay.status = 'pending' then return json_build_object('boost_id', _b.id, 'payment_request_id', _pay.id); end if;
  else
    insert into public.profile_boosts (teacher_id, plan) values (_me, _plan) returning * into _b;
  end if;
  _pay := public.create_payment_request(_plan, 'profile_boosts', _b.id, _voucher);
  update public.profile_boosts set payment_request_id = _pay.id where id = _b.id;
  return json_build_object('boost_id', _b.id, 'payment_request_id', _pay.id);
end $$;

-- Approval of a boost payment starts (or extends) the boost.
create or replace function private.after_boost_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare _b public.profile_boosts; _start timestamptz;
begin
  if new.service_code not in ('boost_7d', 'boost_30d') or old.status <> 'pending' then return new; end if;
  select * into _b from public.profile_boosts where id = new.ref_id;
  if new.status = 'approved' then
    select greatest(now(), coalesce(max(ends_at), now())) into _start from public.profile_boosts where teacher_id = _b.teacher_id and status = 'active';
    update public.profile_boosts set status = 'active', starts_at = _start,
           ends_at = _start + case _b.plan when 'boost_7d' then interval '7 days' else interval '30 days' end
     where id = _b.id;
    perform private.notify(_b.teacher_id, 'boost', 'Profile Boost চালু 🚀', 'আপনার profile এখন search-এ সবার উপরে দেখাবে।', jsonb_build_object('boost_id', _b.id));
  elsif new.status = 'rejected' then
    update public.payment_requests set trx_id = null where id = new.id;
    perform private.notify(new.user_id, 'payment', 'Payment যাচাই করা যায়নি',
      coalesce('কারণ: ' || new.admin_note || '। ', '') || 'TrxID আর নম্বর আবার মিলিয়ে দেখে নতুন করে জমা দিন।', jsonb_build_object('boost_id', _b.id));
  end if;
  return new;
end $$;
create trigger payment_requests_boost after update of status on public.payment_requests for each row execute function private.after_boost_payment();

create or replace function private.expire_boosts() returns int
language sql security definer set search_path = '' as $$
  with x as (update public.profile_boosts set status = 'expired' where status = 'active' and ends_at < now() returning 1) select count(*)::int from x
$$;
select cron.schedule('expire-boosts', '7 * * * *', $$select private.expire_boosts()$$);

-- Boosted teachers lead the "recommended" order.
create or replace view private.public_teachers as
 SELECT t.tsc_id, t.full_name, t.gender::text AS gender, t.profile_photo_url AS photo_url, t.university_name,
    public.institution_code(t.university_name::text) AS institution, t.department, t.academic_year, t.experience_years,
    t.subjects_offered AS subjects, t.teaching_level, t.district, t.thana, t.teaching_mode_offered::text AS mode,
    t.hourly_rate_online, t.monthly_rate_inperson, t.rate_negotiable, t.bio_summary, t.is_tsc_certified, t.is_online_certified,
    t.is_featured, t.average_rating, t.total_reviews, t.total_students_taught,
    public.trust_score(t.average_rating, t.booking_completion_rate, t.total_reviews, t.total_students_taught, true, t.is_tsc_certified) AS trust_score,
    t.profile_completion_percentage AS completion, t.created_at,
    exists (select 1 from public.profile_boosts b where b.teacher_id = t.user_id and b.status = 'active' and b.ends_at > now()) AS boosted
   FROM public.teacher_profiles t
     JOIN public.user_profiles u ON u.user_id = t.user_id AND u.user_status = 'active'::public.user_status
  WHERE t.verification_status = ANY (ARRAY['verified'::public.teacher_verification_status, 'active'::public.teacher_verification_status]);

create or replace function public.search_teachers(
  _q text default null, _district text default null, _subject text default null, _mode text default null,
  _gender text default null, _institution text default null, _max_monthly numeric default null,
  _sort text default 'recommended', _limit int default 24, _offset int default 0
) returns json
language sql stable security definer set search_path = '' as $$
  with f as (
    select p.* from private.public_teachers p
    where (_q is null or _q = '' or concat_ws(' ', p.full_name, p.tsc_id, p.university_name, p.institution, p.department, p.district, p.thana, array_to_string(p.subjects, ' ')) ilike '%' || _q || '%')
      and (_district is null or p.district = _district)
      and (_subject is null or _subject = any (p.subjects))
      and (_mode is null or p.mode = _mode or p.mode = 'both')
      and (_gender is null or p.gender = _gender)
      and (_institution is null or p.institution = _institution)
      and (_max_monthly is null or p.monthly_rate_inperson is null or p.monthly_rate_inperson <= _max_monthly)
  )
  select json_build_object(
    'total', (select count(*) from f),
    'items', coalesce((
      select json_agg(row_to_json(x)) from (
        select tsc_id, full_name, gender, photo_url, university_name, institution, department, academic_year, experience_years,
               subjects, district, thana, mode, hourly_rate_online, monthly_rate_inperson, rate_negotiable,
               is_tsc_certified, is_online_certified, is_featured, average_rating, total_reviews, trust_score, boosted
        from f
        order by
          case when _sort = 'rating' then f.average_rating end desc nulls last,
          case when _sort = 'price' then coalesce(f.monthly_rate_inperson, f.hourly_rate_online * 12) end asc nulls last,
          case when _sort = 'newest' then f.created_at end desc,
          f.boosted desc, f.is_featured desc, f.trust_score desc, (f.photo_url is not null) desc, f.completion desc, f.created_at
        limit least(greatest(_limit, 1), 48) offset greatest(_offset, 0)
      ) x), '[]')
  )
$$;

-- ── Carry over the old site ─────────────────────────────────────────────────────────────────────────────────
insert into public.verification_documents (id, user_id, doc_type, file_key, file_name, status, rejection_reason, reviewed_by, reviewed_at, created_at)
select d.id, d.user_id, d.document_type::public.document_type, 'documents/' || d.document_url, d.file_name,
       coalesce(nullif(d.verification_status, ''), 'pending')::public.document_verification_status, d.rejection_reason,
       case when exists (select 1 from auth.users where id = d.verified_by) then d.verified_by end, d.verified_at, d.created_at
from legacy.documents d where exists (select 1 from auth.users where id = d.user_id)
on conflict (id) do nothing;

insert into public.profile_change_requests (id, user_id, changes, status, reviewed_by, reviewed_at, created_at)
select c.id, c.user_id, coalesce(c.change_data::jsonb, '{}'::jsonb), c.status,
       case when exists (select 1 from auth.users where id = c.reviewed_by) then c.reviewed_by end, c.reviewed_at, c.created_at
from legacy.pending_profile_changes c where exists (select 1 from auth.users where id = c.user_id) and c.status <> 'pending'
on conflict (id) do nothing;

insert into public.teacher_availability (teacher_id, day_of_week, start_time, end_time, created_at)
select tp.user_id, a.day_of_week::int, a.start_time::time, a.end_time::time, a.created_at
from legacy.teacher_availability a join public.teacher_profiles tp on tp.id = a.teacher_id
where coalesce(a.is_active::text, 'true') = 'true' and a.end_time::time > a.start_time::time;

insert into public.teacher_media (id, teacher_id, kind, url, caption, sort_order, status, love_count, reviewed_at, created_at)
select i.id, tp.user_id, 'image',
       'https://media.tscmmh.bd/' || regexp_replace(i.image_url, '^.*/storage/v1/object/public/', ''),
       i.caption, coalesce(i.sort_order::int, 0), case when i.is_approved::text = 'true' then 'approved' else 'pending' end,
       coalesce(i.love_count::int, 0), i.approved_at, i.created_at
from legacy.teaching_style_images i join public.teacher_profiles tp on tp.id = i.teacher_id
on conflict (id) do nothing;

insert into public.teacher_media (id, teacher_id, kind, url, status, love_count, reviewed_at, created_at)
select v.id, tp.user_id, 'video',
       'https://media.tscmmh.bd/' || regexp_replace(v.video_url, '^.*/storage/v1/object/public/', ''),
       case when v.is_approved::text = 'true' then 'approved' else 'pending' end, coalesce(v.love_count::int, 0), v.approved_at, v.created_at
from legacy.teacher_video_intros v join public.teacher_profiles tp on tp.id = v.teacher_id
on conflict (id) do nothing;

insert into public.profile_boosts (id, teacher_id, plan, starts_at, ends_at, status, created_at)
select b.id, tp.user_id, 'legacy', b.started_at, b.expires_at, case when b.expires_at > now() then 'active' else 'expired' end, b.created_at
from legacy.profile_boosts b join public.teacher_profiles tp on tp.id = b.teacher_id
on conflict (id) do nothing;

select private.recalc_completion(user_id) from public.teacher_profiles;
select private.recalc_completion(user_id) from public.student_profiles;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function private.recalc_completion(uuid), private.after_boost_payment(), private.expire_boosts() from public, anon, authenticated;
revoke all on function public.get_my_profile(), public.update_my_student_profile(jsonb), public.update_my_teacher_profile(jsonb), public.set_my_photo(text),
  public.submit_verification_document(text, text, text), public.admin_list_verification(text), public.admin_set_teacher_status(uuid, text, text, boolean, boolean),
  public.admin_list_change_requests(text), public.admin_review_change_request(uuid, boolean, text[], text), public.set_my_availability(jsonb),
  public.add_teacher_media(text, text, text), public.remove_teacher_media(uuid), public.admin_list_media(text), public.admin_review_media(uuid, boolean),
  public.request_boost(text, uuid) from public, anon;
grant execute on function public.get_my_profile(), public.update_my_student_profile(jsonb), public.update_my_teacher_profile(jsonb), public.set_my_photo(text),
  public.submit_verification_document(text, text, text), public.admin_list_verification(text), public.admin_set_teacher_status(uuid, text, text, boolean, boolean),
  public.admin_list_change_requests(text), public.admin_review_change_request(uuid, boolean, text[], text), public.set_my_availability(jsonb),
  public.add_teacher_media(text, text, text), public.remove_teacher_media(uuid), public.admin_list_media(text), public.admin_review_media(uuid, boolean),
  public.request_boost(text, uuid) to authenticated;
revoke all on function public.get_teacher_extras(text) from public;
grant execute on function public.get_teacher_extras(text) to anon, authenticated;
revoke all on private.public_teachers from public, anon, authenticated;
