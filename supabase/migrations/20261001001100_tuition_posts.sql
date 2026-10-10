-- Tuition Posts ("Teacher Needed", free for students/guardians) + teacher hand-raises.
-- Option-based form; the only free text is an optional ≤150-char note screened by private.find_contact().

-- ── Contact detector (mirror of app/lib/contact-guard.ts) ─────────────────────────────────
create or replace function private.find_contact(_raw text) returns text
language plpgsql immutable set search_path = '' as $$
declare s text := coalesce(_raw, '');
begin
  if s = '' then return null; end if;
  if s ~* '[^\s@]+@[^\s@]+\.[a-z]{2,}' or s ~* '\mat\s*the\s*rate\M|\(at\)|\[at\]' then return 'email'; end if;
  if s ~* 'https?://|www\.|\m[a-z0-9-]+\.(com|net|org|bd|me|io|xyz|info)\M' then return 'link'; end if;
  if s ~* '(^|\s)@[a-z0-9_.]{3,}' then return 'handle'; end if;
  if s ~* 'whats\s*app|watsapp|\mwa\.me|\mimo\M|telegram|\mtg\M|messenger|viber|facebook|\mfb\M|fb\.com|instagram|\minsta\M|gmail|yahoo|hotmail|outlook|হোয়াটস|হোয়াটস|ইমু|টেলিগ্রাম|মেসেঞ্জার|ফেসবুক|ইনস্টা|জিমেইল|ইমেইল|ইমেল' then
    return 'platform';
  end if;
  s := translate(s, '০১২৩৪৫৬৭৮৯', '0123456789');
  s := regexp_replace(s, 'শূন্য|শুন্য|জিরো|zero|\mnil\M|\moh\M', '0', 'gi');
  s := regexp_replace(s, 'এক|ওয়ান|\mone\M', '1', 'gi');
  s := regexp_replace(s, 'দুই|দুয়|টু|\mtwo\M', '2', 'gi');
  s := regexp_replace(s, 'তিন|থ্রি|\mthree\M', '3', 'gi');
  s := regexp_replace(s, 'চার|ফোর|\mfour\M', '4', 'gi');
  s := regexp_replace(s, 'পাঁচ|পাচ|ফাইভ|\mfive\M', '5', 'gi');
  s := regexp_replace(s, 'ছয়|ছয়|সিক্স|\msix\M', '6', 'gi');
  s := regexp_replace(s, 'সাত|সেভেন|\mseven\M', '7', 'gi');
  s := regexp_replace(s, 'আট|এইট|\meight\M', '8', 'gi');
  s := regexp_replace(s, 'নয়|নয়|নাইন|\mnine\M', '9', 'gi');
  -- Drop separators between digits, repeatedly (regex lookbehind isn't available in Postgres).
  loop
    exit when s !~ '\d[\s.\-_/\\|,:;()+*''"`~]+\d';
    s := regexp_replace(s, '(\d)[\s.\-_/\\|,:;()+*''"`~]+(\d)', '\1\2', 'g');
  end loop;
  if s ~ '\d{7,}' then return 'phone'; end if;
  return null;
end $$;

-- ── Posts ─────────────────────────────────────────────────────────────────────────────────
create type public.post_status as enum ('pending_review', 'open', 'filled', 'closed', 'rejected', 'expired');
create sequence public.tuition_post_code_seq;

create table public.tuition_posts (
  id uuid primary key default gen_random_uuid(),
  code varchar(12) not null unique default ('P' || nextval('public.tuition_post_code_seq')),
  author_id uuid not null references auth.users (id) on delete cascade,
  curriculum text not null check (curriculum in ('bangla_version', 'english_version', 'english_medium', 'madrasah', 'technical', 'admission')),
  board text check (board in ('edexcel', 'cambridge', 'alia', 'qawmi')),
  level text not null check (level ~ '^[a-z0-9_]{2,24}$'),
  group_stream text check (group_stream in ('science', 'commerce', 'humanities')),
  subjects text[] not null check (cardinality(subjects) between 1 and 8),
  student_gender text check (student_gender in ('male', 'female')),
  mode public.teaching_mode not null,
  district text,
  thana text,
  days text[] not null default '{}' check (days <@ array['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']),
  time_slot text check (time_slot in ('morning', 'noon', 'afternoon', 'evening', 'night')),
  days_per_week int check (days_per_week between 1 and 7),
  budget_min int check (budget_min is null or (budget_min >= 0 and budget_min % 100 = 0)),
  budget_max int check (budget_max is null or (budget_max >= 0 and budget_max % 100 = 0)),
  negotiable boolean not null default false,
  teacher_gender text not null default 'any' check (teacher_gender in ('any', 'male', 'female')),
  preferred_institutions text[] not null default '{}',
  min_experience int check (min_experience between 0 and 30),
  note text check (char_length(note) <= 150),
  status public.post_status not null default 'open',
  moderation_reason text,
  hand_raise_count int not null default 0,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  closed_at timestamptz,
  check (mode = 'online' or district is not null),
  check (budget_max is null or budget_min is null or budget_max >= budget_min)
);
create index tuition_posts_open_idx on public.tuition_posts (created_at desc) where status = 'open';
create index tuition_posts_author_idx on public.tuition_posts (author_id, created_at desc);
create index tuition_posts_district_idx on public.tuition_posts (district) where status = 'open';
create index tuition_posts_subjects_idx on public.tuition_posts using gin (subjects);
create trigger tuition_posts_touch before update on public.tuition_posts for each row execute function private.touch_updated_at();

create table public.tuition_hand_raises (
  post_id uuid not null references public.tuition_posts (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, teacher_id)
);
create index tuition_hand_raises_teacher_idx on public.tuition_hand_raises (teacher_id, created_at desc);

alter table public.tuition_posts enable row level security;
alter table public.tuition_hand_raises enable row level security;
create policy own_read on public.tuition_posts for select to authenticated using (author_id = (select auth.uid()) or private.is_admin());
create policy own_read on public.tuition_hand_raises for select to authenticated
  using (teacher_id = (select auth.uid()) or private.is_admin()
         or exists (select 1 from public.tuition_posts p where p.id = post_id and p.author_id = (select auth.uid())));

-- Create a post. Free; a flagged note sends it to admin review instead of publishing.
create or replace function public.create_tuition_post(_p jsonb) returns json
language plpgsql security definer set search_path = '' as $$
declare
  _me uuid := auth.uid();
  _note text := nullif(trim(_p ->> 'note'), '');
  _hit text := private.find_contact(_note);
  _open_count int;
  _row public.tuition_posts;
begin
  if _me is null then raise exception 'login required' using errcode = 'TS401'; end if;
  if private.has_role(_me, 'teacher') and not private.has_role(_me, 'student') then
    raise exception 'teachers cannot post tuition needs' using errcode = 'TS403';
  end if;
  select count(*) into _open_count from public.tuition_posts where author_id = _me and status in ('open', 'pending_review');
  if _open_count >= 5 then raise exception 'too many open posts' using errcode = 'TS429'; end if;

  insert into public.tuition_posts (author_id, curriculum, board, level, group_stream, subjects, student_gender, mode, district, thana,
                                    days, time_slot, days_per_week, budget_min, budget_max, negotiable, teacher_gender,
                                    preferred_institutions, min_experience, note, status, moderation_reason)
  values (_me, _p ->> 'curriculum', nullif(_p ->> 'board', ''), _p ->> 'level', nullif(_p ->> 'group_stream', ''),
          array(select jsonb_array_elements_text(_p -> 'subjects')), nullif(_p ->> 'student_gender', ''),
          (_p ->> 'mode')::public.teaching_mode, nullif(_p ->> 'district', ''), nullif(_p ->> 'thana', ''),
          coalesce(array(select jsonb_array_elements_text(_p -> 'days')), '{}'), nullif(_p ->> 'time_slot', ''),
          nullif(_p ->> 'days_per_week', '')::int, nullif(_p ->> 'budget_min', '')::int, nullif(_p ->> 'budget_max', '')::int,
          coalesce((_p ->> 'negotiable')::boolean, false), coalesce(nullif(_p ->> 'teacher_gender', ''), 'any'),
          coalesce(array(select jsonb_array_elements_text(_p -> 'preferred_institutions')), '{}'),
          nullif(_p ->> 'min_experience', '')::int, _note,
          case when _hit is null then 'open' else 'pending_review' end::public.post_status,
          case when _hit is null then null else 'contact detector: ' || _hit end)
  returning * into _row;

  if _row.status = 'open' then perform private.alert_teachers_for_post(_row.id); end if;
  return json_build_object('id', _row.id, 'code', _row.code, 'status', _row.status, 'flagged', _hit);
end $$;

-- In-app alerts to verified teachers who match the post (same district or online, ≥1 shared subject). Max 200.
create or replace function private.alert_teachers_for_post(_post uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare _p public.tuition_posts; _n int;
begin
  select * into _p from public.tuition_posts where id = _post;
  insert into public.notifications (user_id, type, title, message, metadata)
  select t.user_id, 'tuition_post', 'নতুন Tuition Post — ' || _p.code,
         format('%s · %s — আগ্রহ থাকলে Hand Raise করুন।', array_to_string(_p.subjects[1:3], ', '), coalesce(_p.district, 'Online')),
         jsonb_build_object('post_id', _p.id, 'code', _p.code)
    from public.teacher_profiles t
    join public.user_profiles u on u.user_id = t.user_id and u.user_status = 'active'
   where t.verification_status in ('verified', 'active') and t.notify_teacher_needed
     and t.subjects_offered && _p.subjects
     and (_p.mode = 'online' or t.district = _p.district or t.teaching_mode_offered in ('online', 'both') and _p.mode = 'both')
     and (_p.teacher_gender = 'any' or t.gender::text = _p.teacher_gender)
   limit 200;
  get diagnostics _n = row_count;
  return _n;
end $$;

-- Public board: no names, no contact — just what a teacher needs to decide.
create or replace function public.list_tuition_posts(_district text default null, _subject text default null, _curriculum text default null,
                                                     _mode text default null, _limit int default 24, _offset int default 0)
returns json language sql stable security definer set search_path = '' as $$
  with f as (
    select p.* from public.tuition_posts p
    where p.status = 'open' and p.expires_at > now()
      and (_district is null or p.district = _district or p.mode = 'online')
      and (_subject is null or _subject = any (p.subjects) or 'All subjects' = any (p.subjects))
      and (_curriculum is null or p.curriculum = _curriculum)
      and (_mode is null or p.mode::text = _mode or p.mode = 'both')
  )
  select json_build_object('total', (select count(*) from f), 'items', coalesce((
    select json_agg(row_to_json(x)) from (
      select f.id, f.code, f.curriculum, f.board, f.level, f.group_stream, f.subjects, f.student_gender, f.mode::text as mode,
             f.district, f.thana, f.days, f.time_slot, f.days_per_week, f.budget_min, f.budget_max, f.negotiable,
             f.teacher_gender, f.preferred_institutions, f.min_experience, f.note, f.hand_raise_count, f.created_at,
             s.tsc_id as author_tsc_id,
             exists (select 1 from public.tuition_hand_raises h where h.post_id = f.id and h.teacher_id = auth.uid()) as i_raised
      from f left join public.student_profiles s on s.user_id = f.author_id
      order by f.created_at desc
      limit least(greatest(_limit, 1), 48) offset greatest(_offset, 0)) x), '[]'))
$$;

-- Verified teacher shows interest (free). Notifies the author.
create or replace function public.raise_hand(_post uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare _p public.tuition_posts; _count int;
begin
  if not exists (select 1 from public.teacher_profiles t where t.user_id = auth.uid() and t.verification_status in ('verified', 'active')) then
    raise exception 'only verified teachers can raise a hand' using errcode = 'TS403';
  end if;
  select * into _p from public.tuition_posts where id = _post and status = 'open' for update;
  if not found then raise exception 'post not open' using errcode = 'TS404'; end if;
  insert into public.tuition_hand_raises (post_id, teacher_id) values (_post, auth.uid()) on conflict do nothing;
  if found then
    update public.tuition_posts set hand_raise_count = hand_raise_count + 1 where id = _post returning hand_raise_count into _count;
    perform private.notify(_p.author_id, 'hand_raise', 'একজন Teacher আগ্রহী 🙋',
      format('আপনার Tuition Post %s-এ একজন verified teacher আগ্রহ দেখিয়েছেন। Profile দেখে যোগাযোগ করুন।', _p.code), jsonb_build_object('post_id', _post));
  end if;
  return coalesce(_count, _p.hand_raise_count);
end $$;

-- Author: my posts with interested teachers (public teacher cards only).
create or replace function public.my_tuition_posts() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]') from (
    select p.id, p.code, p.status, p.level, p.curriculum, p.subjects, p.mode::text as mode, p.district, p.thana, p.budget_min, p.budget_max,
           p.negotiable, p.hand_raise_count, p.created_at, p.expires_at, p.moderation_reason,
           coalesce((select json_agg(json_build_object('tsc_id', t.tsc_id, 'full_name', t.full_name, 'photo_url', t.profile_photo_url,
                                                       'line', concat_ws(' · ', nullif(trim(t.university_name), ''), t.department), 'raised_at', h.created_at)
                                     order by h.created_at desc)
                     from public.tuition_hand_raises h join public.teacher_profiles t on t.user_id = h.teacher_id
                     where h.post_id = p.id), '[]') as interested
    from public.tuition_posts p where p.author_id = auth.uid()
  ) x
$$;

create or replace function public.close_tuition_post(_post uuid, _filled boolean default true) returns void
language sql security definer set search_path = '' as $$
  update public.tuition_posts set status = case when _filled then 'filled' else 'closed' end::public.post_status, closed_at = now()
   where id = _post and author_id = auth.uid() and status in ('open', 'pending_review');
$$;

-- Admin moderation for flagged posts.
create or replace function public.admin_moderate_post(_post uuid, _approve boolean, _reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _p public.tuition_posts;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  update public.tuition_posts set status = case when _approve then 'open' else 'rejected' end::public.post_status,
         moderation_reason = coalesce(_reason, moderation_reason)
   where id = _post and status = 'pending_review' returning * into _p;
  if not found then raise exception 'not awaiting review'; end if;
  if _approve then perform private.alert_teachers_for_post(_post); end if;
  perform private.notify(_p.author_id, 'tuition_post', case when _approve then 'Tuition Post চালু হয়েছে' else 'Tuition Post প্রকাশ করা যায়নি' end,
    case when _approve then format('%s এখন teacher-রা দেখতে পাচ্ছেন।', _p.code) else coalesce('কারণ: ' || _reason, 'নোটে যোগাযোগের তথ্য ছিল।') end,
    jsonb_build_object('post_id', _post));
  perform public.log_admin_action(case when _approve then 'post_approved' else 'post_rejected' end, 'tuition_posts', _post, jsonb_build_object('reason', _reason));
end $$;

-- Daily: posts expire after 30 days.
create or replace function private.expire_tuition_posts() returns int
language sql security definer set search_path = '' as $$
  with x as (update public.tuition_posts set status = 'expired' where status = 'open' and expires_at < now() returning 1) select count(*)::int from x
$$;
select cron.schedule('expire-tuition-posts', '17 3 * * *', $$select private.expire_tuition_posts()$$);

revoke all on function private.find_contact(text), private.alert_teachers_for_post(uuid), private.expire_tuition_posts() from public, anon, authenticated;
revoke all on function public.create_tuition_post(jsonb), public.raise_hand(uuid), public.my_tuition_posts(), public.close_tuition_post(uuid, boolean),
  public.admin_moderate_post(uuid, boolean, text) from public, anon;
grant execute on function public.create_tuition_post(jsonb), public.raise_hand(uuid), public.my_tuition_posts(), public.close_tuition_post(uuid, boolean),
  public.admin_moderate_post(uuid, boolean, text) to authenticated;
revoke all on function public.list_tuition_posts(text, text, text, text, int, int) from public;
grant execute on function public.list_tuition_posts(text, text, text, text, int, int) to anon, authenticated;
