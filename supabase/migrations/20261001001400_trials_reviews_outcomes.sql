-- Phase 2: free trial classes with a real lifecycle, reviews (admin-approved), match outcomes, saved teachers.
-- Trials are free (ADR 0001) but only between people who are already connected (accepted unlock or Smart Match),
-- so a free trial can never be used to get around the paid number unlock.

-- ── Connection: has this student/guardian been put in touch with this teacher? ─────────────────────────────
create or replace function private.connected(_student uuid, _teacher uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.contact_unlocks u
                  where u.status = 'accepted'
                    and ((u.requester_id = _student and u.target_id = _teacher) or (u.requester_id = _teacher and u.target_id = _student)))
      or exists (select 1 from public.smart_match_requests m
                  where m.requester_id = _student and m.status in ('proposed', 'completed')
                    and coalesce(m.teacher_2, m.teacher_1) = _teacher)
$$;

-- ── Trial bookings ──────────────────────────────────────────────────────────────────────────────────────────
create type public.trial_status as enum
  ('requested', 'accepted', 'rejected', 'cancelled', 'expired', 'awaiting_confirmation', 'completed', 'no_show', 'disputed');

create sequence public.trial_code_seq;
create table public.trial_bookings (
  id uuid primary key default gen_random_uuid(),
  code varchar(12) not null unique default ('B' || nextval('public.trial_code_seq')),
  student_id uuid not null references auth.users (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  status public.trial_status not null default 'requested',
  subject text not null,
  level text,
  topic text check (char_length(topic) <= 100),
  mode public.teaching_mode not null check (mode <> 'both'),
  scheduled_at timestamptz not null,
  duration_min int not null default 60 check (duration_min in (30, 45, 60, 90)),
  note text check (char_length(note) <= 150),
  reject_reason text,
  cancelled_by uuid,
  student_says text check (student_says in ('happened', 'no_show', 'problem')),
  teacher_says text check (teacher_says in ('happened', 'no_show', 'problem')),
  problem_note text check (char_length(problem_note) <= 300),
  ends_at timestamptz not null,
  completed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trial_student_idx on public.trial_bookings (student_id, scheduled_at desc);
create index trial_teacher_idx on public.trial_bookings (teacher_id, scheduled_at desc);
create index trial_status_idx on public.trial_bookings (status, ends_at);
create trigger trial_touch before update on public.trial_bookings for each row execute function private.touch_updated_at();
alter table public.trial_bookings enable row level security;
create policy party_read on public.trial_bookings for select to authenticated
  using (student_id = (select auth.uid()) or teacher_id = (select auth.uid()) or private.is_admin());

-- Ratings, completion rate and students taught are always recomputed from source rows.
create or replace function private.recalc_teacher_stats(_teacher uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.teacher_profiles t set
    average_rating = coalesce(r.avg_rating, 0),
    total_reviews = r.n,
    booking_completion_rate = coalesce(b.rate, t.booking_completion_rate),
    -- counts carried over from the old site are kept as a floor
    services_completed = greatest(b.done, coalesce(t.services_completed, 0)),
    total_students_taught = greatest(s.n, coalesce(t.total_students_taught, 0))
  from (select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as n from public.reviews where teacher_id = _teacher and status = 'approved') r,
       (select count(*) filter (where status = 'completed')::int as done,
               case when count(*) filter (where status in ('completed', 'no_show')) = 0 then null
                    else round(100.0 * count(*) filter (where status = 'completed') / count(*) filter (where status in ('completed', 'no_show')), 1) end as rate
          from public.trial_bookings where teacher_id = _teacher) b,
       (select count(distinct student_id)::int as n from public.match_outcomes where teacher_id = _teacher and final_status = 'matched') s
  where t.user_id = _teacher;
end $$;

create or replace function public.request_trial(_teacher_tsc text, _p jsonb) returns json
language plpgsql security definer set search_path = '' as $$
declare
  _me uuid := auth.uid();
  _t uuid;
  _at timestamptz := (_p ->> 'scheduled_at')::timestamptz;
  _row public.trial_bookings;
begin
  if _me is null then raise exception 'login required' using errcode = 'TS401'; end if;
  if private.has_role(_me, 'teacher') and not private.has_role(_me, 'student') then raise exception 'teachers cannot book trials' using errcode = 'TS403'; end if;
  select user_id into _t from public.teacher_profiles where upper(tsc_id) = upper(_teacher_tsc) and verification_status in ('verified', 'active');
  if _t is null then raise exception 'teacher not found' using errcode = 'TS404'; end if;
  if not private.connected(_me, _t) then raise exception 'unlock the teacher first' using errcode = 'TS409'; end if;
  if _at is null or _at < now() + interval '2 hours' or _at > now() + interval '30 days' then raise exception 'pick a time between 2 hours and 30 days from now' using errcode = 'TS422'; end if;
  if coalesce(private.find_contact(_p ->> 'note'), private.find_contact(_p ->> 'topic')) is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;
  if exists (select 1 from public.trial_bookings where student_id = _me and teacher_id = _t and status in ('requested', 'accepted', 'awaiting_confirmation')) then
    raise exception 'you already have an open trial with this teacher' using errcode = 'TS429';
  end if;

  insert into public.trial_bookings (student_id, teacher_id, subject, level, topic, mode, scheduled_at, duration_min, ends_at, note)
  values (_me, _t, _p ->> 'subject', nullif(_p ->> 'level', ''), nullif(trim(_p ->> 'topic'), ''), (_p ->> 'mode')::public.teaching_mode, _at,
          coalesce(nullif(_p ->> 'duration_min', '')::int, 60), _at + make_interval(mins => coalesce(nullif(_p ->> 'duration_min', '')::int, 60)), nullif(trim(_p ->> 'note'), ''))
  returning * into _row;
  perform private.notify(_t, 'trial', 'নতুন Trial Class request 📅',
    format('%s — %s। Accept বা Reject করুন।', _row.subject, to_char(_at at time zone 'Asia/Dhaka', 'DD Mon, HH12:MI AM')), jsonb_build_object('trial_id', _row.id));
  return json_build_object('id', _row.id, 'code', _row.code);
end $$;

create or replace function public.respond_trial(_trial uuid, _accept boolean, _reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _b public.trial_bookings;
begin
  update public.trial_bookings set status = case when _accept then 'accepted' else 'rejected' end::public.trial_status,
         reject_reason = case when _accept then null else left(_reason, 200) end
   where id = _trial and teacher_id = auth.uid() and status = 'requested' and scheduled_at > now() returning * into _b;
  if not found then raise exception 'not possible now'; end if;
  perform private.notify(_b.student_id, 'trial', case when _accept then 'Trial Class নিশ্চিত ✅' else 'Trial Class হচ্ছে না' end,
    case when _accept then format('%s — %s। সময়মতো তৈরি থাকুন।', _b.subject, to_char(_b.scheduled_at at time zone 'Asia/Dhaka', 'DD Mon, HH12:MI AM'))
         else coalesce('কারণ: ' || _reason || '। ', '') || 'অন্য সময় চেয়ে আবার request করতে পারেন।' end,
    jsonb_build_object('trial_id', _trial));
end $$;

create or replace function public.cancel_trial(_trial uuid, _reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _b public.trial_bookings; _me uuid := auth.uid();
begin
  update public.trial_bookings set status = 'cancelled', cancelled_by = _me, reject_reason = left(_reason, 200)
   where id = _trial and (student_id = _me or teacher_id = _me) and status in ('requested', 'accepted') and scheduled_at > now()
   returning * into _b;
  if not found then raise exception 'not possible now'; end if;
  perform private.notify(case when _me = _b.student_id then _b.teacher_id else _b.student_id end, 'trial', 'Trial Class বাতিল হয়েছে',
    format('%s (%s) বাতিল করা হয়েছে।', _b.subject, to_char(_b.scheduled_at at time zone 'Asia/Dhaka', 'DD Mon')) || coalesce(' কারণ: ' || _reason, ''),
    jsonb_build_object('trial_id', _trial));
end $$;

-- After the class: each side answers once. Agreement settles it; disagreement or a problem goes to admin.
create or replace function private.settle_trial(_b public.trial_bookings) returns public.trial_status
language plpgsql security definer set search_path = '' as $$
declare _s public.trial_status;
begin
  if 'problem' in (coalesce(_b.student_says, ''), coalesce(_b.teacher_says, '')) then _s := 'disputed';
  elsif _b.student_says is not null and _b.teacher_says is not null then
    _s := case when _b.student_says = _b.teacher_says then (case when _b.student_says = 'happened' then 'completed' else 'no_show' end)::public.trial_status
               else 'disputed' end;
  else return _b.status;
  end if;
  update public.trial_bookings set status = _s, completed_at = case when _s = 'completed' then now() end where id = _b.id;
  if _s = 'completed' then
    perform private.notify(_b.student_id, 'review', 'Trial কেমন হলো? ⭐',
      'এক মিনিটে review দিন — অন্য অভিভাবকদের সঠিক teacher বেছে নিতে সাহায্য করবে।', jsonb_build_object('trial_id', _b.id));
  end if;
  perform private.recalc_teacher_stats(_b.teacher_id);
  return _s;
end $$;

create or replace function public.confirm_trial(_trial uuid, _answer text, _note text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare _b public.trial_bookings; _me uuid := auth.uid();
begin
  if _answer not in ('happened', 'no_show', 'problem') then raise exception 'bad answer'; end if;
  if private.find_contact(_note) is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;
  select * into _b from public.trial_bookings where id = _trial and (student_id = _me or teacher_id = _me) for update;
  if not found or _b.status <> 'awaiting_confirmation' then raise exception 'not possible now'; end if;
  if _me = _b.student_id then
    if _b.student_says is not null then raise exception 'already answered'; end if;
    update public.trial_bookings set student_says = _answer, problem_note = coalesce(left(_note, 300), problem_note) where id = _trial returning * into _b;
  else
    if _b.teacher_says is not null then raise exception 'already answered'; end if;
    update public.trial_bookings set teacher_says = _answer, problem_note = coalesce(left(_note, 300), problem_note) where id = _trial returning * into _b;
  end if;
  return private.settle_trial(_b)::text;
end $$;

-- Every 15 minutes: finished classes ask both sides; stale requests expire; silence for 72 h counts as "happened".
create or replace function private.trial_tick() returns void
language plpgsql security definer set search_path = '' as $$
declare _b public.trial_bookings;
begin
  update public.trial_bookings set status = 'expired' where status = 'requested' and scheduled_at < now();
  for _b in update public.trial_bookings set status = 'awaiting_confirmation' where status = 'accepted' and ends_at < now() returning * loop
    perform private.notify(_b.student_id, 'trial', 'ক্লাস হয়েছে? 🙋', format('%s-এর Trial Class কেমন গেল — এক tap-এ জানান।', _b.subject), jsonb_build_object('trial_id', _b.id));
    perform private.notify(_b.teacher_id, 'trial', 'ক্লাস হয়েছে? 🙋', format('%s-এর Trial Class হয়েছে কিনা এক tap-এ জানান।', _b.subject), jsonb_build_object('trial_id', _b.id));
  end loop;
  for _b in select * from public.trial_bookings where status = 'awaiting_confirmation' and ends_at < now() - interval '72 hours'
              and coalesce(student_says, 'happened') = 'happened' and coalesce(teacher_says, 'happened') = 'happened' loop
    update public.trial_bookings set student_says = coalesce(student_says, 'happened'), teacher_says = coalesce(teacher_says, 'happened')
     where id = _b.id returning * into _b;
    perform private.settle_trial(_b);
  end loop;
end $$;
select cron.schedule('trial-tick', '*/15 * * * *', $$select private.trial_tick()$$);

create or replace function public.admin_resolve_trial(_trial uuid, _status text, _note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _b public.trial_bookings;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  if _status not in ('completed', 'no_show', 'cancelled') then raise exception 'bad status'; end if;
  update public.trial_bookings set status = _status::public.trial_status, admin_note = _note,
         completed_at = case when _status = 'completed' then now() end
   where id = _trial returning * into _b;
  if not found then raise exception 'trial not found'; end if;
  perform private.recalc_teacher_stats(_b.teacher_id);
  perform public.log_admin_action('trial_resolved', 'trial_bookings', _trial, jsonb_build_object('status', _status, 'note', _note));
end $$;

-- Both sides: my trials with the other person's card. Phones are not repeated here (they're on the unlock/match page).
create or replace function public.my_trials() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  return (select coalesce(json_agg(x order by x.scheduled_at desc), '[]') from (
    select b.id, b.code, b.status, b.subject, b.level, b.topic, b.mode::text as mode, b.scheduled_at, b.duration_min, b.note, b.reject_reason,
           case when b.student_id = auth.uid() then 'student' else 'teacher' end as my_role,
           case when b.student_id = auth.uid() then b.student_says else b.teacher_says end as my_answer,
           private.person_card(case when b.student_id = auth.uid() then b.teacher_id else b.student_id end) as person,
           exists (select 1 from public.reviews r where r.trial_id = b.id) as reviewed
    from public.trial_bookings b where b.student_id = auth.uid() or b.teacher_id = auth.uid()
  ) x);
end $$;

create or replace function public.admin_list_trials(_status text default 'disputed') returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.scheduled_at desc) from (
    select b.*, b.mode::text as mode_text, private.person_card(b.student_id) as student, private.person_card(b.teacher_id) as teacher
    from public.trial_bookings b where _status = 'all' or b.status::text = _status limit 200
  ) x), '[]') end
$$;

-- ── Reviews ─────────────────────────────────────────────────────────────────────────────────────────────────
create type public.review_status as enum ('pending', 'approved', 'rejected');
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  trial_id uuid references public.trial_bookings (id) on delete set null,
  rating int not null check (rating between 1 and 5),
  teaching int check (teaching between 1 and 5),
  communication int check (communication between 1 and 5),
  punctuality int check (punctuality between 1 and 5),
  tags text[] not null default '{}',
  comment text check (char_length(comment) <= 300),
  status public.review_status not null default 'pending',
  moderation_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (teacher_id, reviewer_id)
);
create index reviews_teacher_idx on public.reviews (teacher_id, created_at desc) where status = 'approved';
create index reviews_pending_idx on public.reviews (created_at) where status = 'pending';
alter table public.reviews enable row level security;
create policy own_or_admin on public.reviews for select to authenticated using (reviewer_id = (select auth.uid()) or private.is_admin());

-- Only someone who was actually connected with the teacher may review (no drive-by or fake reviews).
create or replace function public.submit_review(_teacher_tsc text, _p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid(); _t uuid; _id uuid; _trial uuid;
begin
  if _me is null then raise exception 'login required' using errcode = 'TS401'; end if;
  select user_id into _t from public.teacher_profiles where upper(tsc_id) = upper(_teacher_tsc);
  if _t is null then raise exception 'teacher not found' using errcode = 'TS404'; end if;
  if not private.connected(_me, _t) then raise exception 'only students who were in touch can review' using errcode = 'TS403'; end if;
  if private.find_contact(_p ->> 'comment') is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;
  select id into _trial from public.trial_bookings where student_id = _me and teacher_id = _t and status = 'completed' order by completed_at desc limit 1;
  insert into public.reviews (teacher_id, reviewer_id, trial_id, rating, teaching, communication, punctuality, tags, comment)
  values (_t, _me, _trial, (_p ->> 'rating')::int, nullif(_p ->> 'teaching', '')::int, nullif(_p ->> 'communication', '')::int,
          nullif(_p ->> 'punctuality', '')::int, coalesce(array(select jsonb_array_elements_text(_p -> 'tags')), '{}'), nullif(trim(_p ->> 'comment'), ''))
  on conflict (teacher_id, reviewer_id) do update set
    rating = excluded.rating, teaching = excluded.teaching, communication = excluded.communication, punctuality = excluded.punctuality,
    tags = excluded.tags, comment = excluded.comment, trial_id = coalesce(excluded.trial_id, public.reviews.trial_id),
    status = 'pending', reviewed_at = null, reviewed_by = null, created_at = now()
  returning id into _id;
  perform private.recalc_teacher_stats(_t);  -- an edited review leaves the average until re-approved
  return _id;
end $$;

create or replace function public.admin_review_review(_review uuid, _approve boolean, _reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _r public.reviews;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  update public.reviews set status = case when _approve then 'approved' else 'rejected' end::public.review_status,
         moderation_reason = _reason, reviewed_by = auth.uid(), reviewed_at = now()
   where id = _review returning * into _r;
  if not found then raise exception 'review not found'; end if;
  perform private.recalc_teacher_stats(_r.teacher_id);
  if _approve then
    perform private.notify(_r.teacher_id, 'review', format('নতুন review: %s★', _r.rating), 'আপনার profile-এ একটা নতুন review যোগ হয়েছে।', jsonb_build_object('review_id', _r.id));
  end if;
  perform public.log_admin_action(case when _approve then 'review_approved' else 'review_rejected' end, 'reviews', _review, jsonb_build_object('reason', _reason));
end $$;

create or replace function public.admin_list_reviews(_status text default 'pending') returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.created_at desc) from (
    select r.*, private.person_card(r.reviewer_id) as reviewer, private.person_card(r.teacher_id) as teacher,
           (select b.status from public.trial_bookings b where b.id = r.trial_id) as trial_status
    from public.reviews r where _status = 'all' or r.status::text = _status limit 200
  ) x), '[]') end
$$;

-- Public: approved reviews of a teacher. Reviewer shown by first name + class only.
create or replace function public.get_teacher_reviews(_tsc_id text, _limit int default 20) returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]') from (
    select r.id, r.rating, r.teaching, r.communication, r.punctuality, r.tags, r.comment, r.created_at, (r.trial_id is not null) as after_trial,
           split_part(coalesce(nullif(trim(s.full_name), ''), 'TSC Student'), ' ', 1) as reviewer_name, s.current_class as reviewer_class
    from public.reviews r join public.teacher_profiles t on t.user_id = r.teacher_id
    left join public.student_profiles s on s.user_id = r.reviewer_id
    where upper(t.tsc_id) = upper(_tsc_id) and r.status = 'approved'
    order by r.created_at desc limit least(_limit, 50)
  ) x
$$;

-- What I may review / already reviewed (for the review form).
create or replace function public.my_review_for(_teacher_tsc text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'eligible', private.connected(auth.uid(), t.user_id),
    'review', (select row_to_json(r) from (select rating, teaching, communication, punctuality, tags, comment, status from public.reviews
                                            where teacher_id = t.user_id and reviewer_id = auth.uid()) r))
  from public.teacher_profiles t where upper(t.tsc_id) = upper(_teacher_tsc)
$$;

-- ── Match outcome: "did this become a tuition?" — asked to both sides, mismatch goes to admin ───────────────
create table public.match_outcomes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  student_answer text check (student_answer in ('matched', 'talking', 'not_matched')),
  teacher_answer text check (teacher_answer in ('matched', 'talking', 'not_matched')),
  final_status text not null default 'open' check (final_status in ('open', 'matched', 'not_matched', 'disputed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, teacher_id)
);
create trigger match_outcomes_touch before update on public.match_outcomes for each row execute function private.touch_updated_at();
alter table public.match_outcomes enable row level security;
create policy party_read on public.match_outcomes for select to authenticated
  using (student_id = (select auth.uid()) or teacher_id = (select auth.uid()) or private.is_admin());

-- Connections at least 2 days old that I haven't answered (or answered "talking" more than 7 days ago).
create or replace function public.pending_outcomes() returns json
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  pairs as (
    select case when u.requester_id = me.id then u.target_id else u.requester_id end as other, u.responded_at as since
      from public.contact_unlocks u, me where u.status = 'accepted' and me.id in (u.requester_id, u.target_id)
    union all
    select coalesce(m.teacher_2, m.teacher_1), m.assigned_at from public.smart_match_requests m, me
     where m.requester_id = me.id and m.status in ('proposed', 'completed')
    union all
    select m.requester_id, m.assigned_at from public.smart_match_requests m, me
     where coalesce(m.teacher_2, m.teacher_1) = me.id and m.status in ('proposed', 'completed')
  ),
  p as (
    select distinct on (other) other, since,
           case when private.has_role((select id from me), 'teacher') then 'teacher' else 'student' end as my_role
    from pairs where since < now() - interval '2 days' order by other, since
  )
  select coalesce(json_agg(json_build_object('person', private.person_card(p.other), 'my_role', p.my_role)), '[]')
  from p left join public.match_outcomes o
    on (p.my_role = 'student' and o.student_id = (select id from me) and o.teacher_id = p.other)
    or (p.my_role = 'teacher' and o.teacher_id = (select id from me) and o.student_id = p.other)
  where o.id is null
     or (p.my_role = 'student' and (o.student_answer is null or (o.student_answer = 'talking' and o.updated_at < now() - interval '7 days')))
     or (p.my_role = 'teacher' and (o.teacher_answer is null or (o.teacher_answer = 'talking' and o.updated_at < now() - interval '7 days')))
$$;

create or replace function public.answer_outcome(_other_tsc text, _answer text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  _me uuid := auth.uid(); _other uuid; _is_teacher boolean := private.has_role(auth.uid(), 'teacher');
  _s uuid; _t uuid; _o public.match_outcomes; _final text;
begin
  if _answer not in ('matched', 'talking', 'not_matched') then raise exception 'bad answer'; end if;
  select user_id into _other from public.teacher_profiles where upper(tsc_id) = upper(_other_tsc)
  union all select user_id from public.student_profiles where upper(tsc_id) = upper(_other_tsc) limit 1;
  if _other is null then raise exception 'not found' using errcode = 'TS404'; end if;
  if _is_teacher then _s := _other; _t := _me; else _s := _me; _t := _other; end if;
  if not private.connected(_s, _t) then raise exception 'not connected' using errcode = 'TS403'; end if;

  insert into public.match_outcomes (student_id, teacher_id, student_answer, teacher_answer)
  values (_s, _t, case when not _is_teacher then _answer end, case when _is_teacher then _answer end)
  on conflict (student_id, teacher_id) do update set
    student_answer = case when not _is_teacher then _answer else public.match_outcomes.student_answer end,
    teacher_answer = case when _is_teacher then _answer else public.match_outcomes.teacher_answer end
  returning * into _o;

  _final := case
    when _o.student_answer is null or _o.teacher_answer is null or 'talking' in (_o.student_answer, _o.teacher_answer) then 'open'
    when _o.student_answer = _o.teacher_answer then _o.student_answer
    else 'disputed' end;
  update public.match_outcomes set final_status = _final where id = _o.id and admin_note is null;  -- an admin decision stands
  perform private.recalc_teacher_stats(_t);
  return _final;
end $$;

create or replace function public.admin_resolve_outcome(_id uuid, _final text, _note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _o public.match_outcomes;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  if _final not in ('matched', 'not_matched') then raise exception 'bad status'; end if;
  update public.match_outcomes set final_status = _final, admin_note = _note where id = _id returning * into _o;
  perform private.recalc_teacher_stats(_o.teacher_id);
  perform public.log_admin_action('outcome_resolved', 'match_outcomes', _id, jsonb_build_object('final', _final, 'note', _note));
end $$;

create or replace function public.admin_list_outcomes(_status text default 'disputed') returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.updated_at desc) from (
    select o.*, private.person_card(o.student_id) as student, private.person_card(o.teacher_id) as teacher
    from public.match_outcomes o where _status = 'all' or o.final_status = _status limit 200
  ) x), '[]') end
$$;

-- ── Saved teachers ──────────────────────────────────────────────────────────────────────────────────────────
create table public.saved_teachers (
  user_id uuid not null references auth.users (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, teacher_id)
);
alter table public.saved_teachers enable row level security;
create policy own on public.saved_teachers for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.toggle_saved_teacher(_tsc_id text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare _t uuid;
begin
  if auth.uid() is null then raise exception 'login required' using errcode = 'TS401'; end if;
  select user_id into _t from public.teacher_profiles where upper(tsc_id) = upper(_tsc_id);
  if _t is null then raise exception 'teacher not found' using errcode = 'TS404'; end if;
  delete from public.saved_teachers where user_id = auth.uid() and teacher_id = _t;
  if found then return false; end if;
  insert into public.saved_teachers (user_id, teacher_id) values (auth.uid(), _t);
  return true;
end $$;

create or replace function public.my_saved_teachers() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(row_to_json(p) order by s.created_at desc), '[]')
  from public.saved_teachers s join public.teacher_profiles t on t.user_id = s.teacher_id
  join lateral (select * from private.public_teachers v where v.tsc_id = t.tsc_id) p on true
  where s.user_id = auth.uid()
$$;

create or replace function public.my_saved_ids() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(t.tsc_id), '{}') from public.saved_teachers s join public.teacher_profiles t on t.user_id = s.teacher_id where s.user_id = auth.uid()
$$;

-- Carry over the old site's data.
insert into public.saved_teachers (user_id, teacher_id, created_at)
select l.student_id, l.teacher_id, l.created_at from legacy.saved_teachers l
where exists (select 1 from auth.users where id = l.student_id) and exists (select 1 from auth.users where id = l.teacher_id)
on conflict do nothing;

insert into public.match_outcomes (student_id, teacher_id, student_answer, teacher_answer, final_status, created_at)
select distinct on (l.student_id, l.teacher_id) l.student_id, l.teacher_id, l.student_response, l.teacher_response,
       case when l.admin_decision = 'match' then 'matched' when l.admin_decision = 'no_match' then 'not_matched'
            when l.student_response is not null and l.student_response = l.teacher_response then l.student_response
            when l.student_response is not null and l.teacher_response is not null then 'disputed' else 'open' end,
       l.created_at
from legacy.match_outcomes l
where exists (select 1 from auth.users where id = l.student_id) and exists (select 1 from auth.users where id = l.teacher_id)
order by l.student_id, l.teacher_id, l.updated_at desc
on conflict do nothing;

select private.recalc_teacher_stats(user_id) from public.teacher_profiles;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function private.connected(uuid, uuid), private.recalc_teacher_stats(uuid), private.settle_trial(public.trial_bookings), private.trial_tick()
  from public, anon, authenticated;
revoke all on function public.request_trial(text, jsonb), public.respond_trial(uuid, boolean, text), public.cancel_trial(uuid, text),
  public.confirm_trial(uuid, text, text), public.admin_resolve_trial(uuid, text, text), public.my_trials(), public.admin_list_trials(text),
  public.submit_review(text, jsonb), public.admin_review_review(uuid, boolean, text), public.admin_list_reviews(text), public.my_review_for(text),
  public.pending_outcomes(), public.answer_outcome(text, text), public.admin_resolve_outcome(uuid, text, text), public.admin_list_outcomes(text),
  public.toggle_saved_teacher(text), public.my_saved_teachers(), public.my_saved_ids() from public, anon;
grant execute on function public.request_trial(text, jsonb), public.respond_trial(uuid, boolean, text), public.cancel_trial(uuid, text),
  public.confirm_trial(uuid, text, text), public.admin_resolve_trial(uuid, text, text), public.my_trials(), public.admin_list_trials(text),
  public.submit_review(text, jsonb), public.admin_review_review(uuid, boolean, text), public.admin_list_reviews(text), public.my_review_for(text),
  public.pending_outcomes(), public.answer_outcome(text, text), public.admin_resolve_outcome(uuid, text, text), public.admin_list_outcomes(text),
  public.toggle_saved_teacher(text), public.my_saved_teachers(), public.my_saved_ids() to authenticated;
revoke all on function public.get_teacher_reviews(text, int) from public;
grant execute on function public.get_teacher_reviews(text, int) to anon, authenticated;
