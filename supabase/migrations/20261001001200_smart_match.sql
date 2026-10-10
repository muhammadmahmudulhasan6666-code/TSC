-- Smart Match (৳250, ADR 0001): the guardian describes the need in full; after payment an admin hand-picks ONE
-- dedicated teacher, and if that doesn't work out, ONE replacement (max two). Assignment reveals both numbers.
-- If TSC can't propose anyone, the payment becomes refundable.

create type public.match_status as enum
  ('awaiting_payment', 'payment_review', 'searching', 'proposed', 'replacement_requested', 'completed', 'unfulfilled', 'cancelled');

create table public.smart_match_requests (
  id uuid primary key default gen_random_uuid(),
  code varchar(12) not null unique default ('M' || nextval('public.tuition_post_code_seq')),
  requester_id uuid not null references auth.users (id) on delete cascade,
  status public.match_status not null default 'awaiting_payment',
  payment_request_id uuid references public.payment_requests (id),
  -- requirement (same vocabulary as tuition posts)
  curriculum text not null,
  board text,
  level text not null,
  group_stream text,
  subjects text[] not null check (cardinality(subjects) between 1 and 8),
  student_gender text,
  mode public.teaching_mode not null,
  district text,
  thana text,
  days text[] not null default '{}',
  time_slot text,
  budget_min int,
  budget_max int,
  negotiable boolean not null default true,
  teacher_gender text not null default 'any',
  preferred_institutions text[] not null default '{}',
  min_experience int,
  -- what makes Smart Match "smart"
  goals text[] not null default '{}',             -- e.g. exam_prep, weak_basics, admission, homework, english_fluency
  learning_styles text[] not null default '{}',   -- visual, auditory, kinesthetic, reading_writing, practical, theoretical
  teacher_qualities text[] not null default '{}', -- experienced, patient, friendly, strict, punctual, expert, communicator, encouraging
  trial_topic text check (char_length(trial_topic) <= 100),
  note text check (char_length(note) <= 150),
  -- fulfilment
  teacher_1 uuid references auth.users (id),
  teacher_2 uuid references auth.users (id),
  assigned_at timestamptz,
  replacement_reason text check (char_length(replacement_reason) <= 200),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index smart_match_requester_idx on public.smart_match_requests (requester_id, created_at desc);
create index smart_match_status_idx on public.smart_match_requests (status, created_at);
create index smart_match_payment_idx on public.smart_match_requests (payment_request_id);
create index smart_match_t1_idx on public.smart_match_requests (teacher_1);
create index smart_match_t2_idx on public.smart_match_requests (teacher_2);
create trigger smart_match_touch before update on public.smart_match_requests for each row execute function private.touch_updated_at();

alter table public.smart_match_requests enable row level security;
create policy party_read on public.smart_match_requests for select to authenticated
  using (requester_id = (select auth.uid()) or teacher_1 = (select auth.uid()) or teacher_2 = (select auth.uid()) or private.is_admin());

create or replace function public.create_smart_match(_p jsonb, _voucher uuid default null) returns json
language plpgsql security definer set search_path = '' as $$
declare
  _me uuid := auth.uid();
  _bad text;
  _row public.smart_match_requests;
  _pay public.payment_requests;
begin
  if _me is null then raise exception 'login required' using errcode = 'TS401'; end if;
  if private.has_role(_me, 'teacher') and not private.has_role(_me, 'student') then raise exception 'teachers cannot request smart match' using errcode = 'TS403'; end if;
  _bad := coalesce(private.find_contact(_p ->> 'note'), private.find_contact(_p ->> 'trial_topic'));
  if _bad is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;

  insert into public.smart_match_requests (requester_id, curriculum, board, level, group_stream, subjects, student_gender, mode, district, thana,
     days, time_slot, budget_min, budget_max, negotiable, teacher_gender, preferred_institutions, min_experience,
     goals, learning_styles, teacher_qualities, trial_topic, note)
  values (_me, _p ->> 'curriculum', nullif(_p ->> 'board', ''), _p ->> 'level', nullif(_p ->> 'group_stream', ''),
     array(select jsonb_array_elements_text(_p -> 'subjects')), nullif(_p ->> 'student_gender', ''),
     (_p ->> 'mode')::public.teaching_mode, nullif(_p ->> 'district', ''), nullif(_p ->> 'thana', ''),
     coalesce(array(select jsonb_array_elements_text(_p -> 'days')), '{}'), nullif(_p ->> 'time_slot', ''),
     nullif(_p ->> 'budget_min', '')::int, nullif(_p ->> 'budget_max', '')::int, coalesce((_p ->> 'negotiable')::boolean, true),
     coalesce(nullif(_p ->> 'teacher_gender', ''), 'any'), coalesce(array(select jsonb_array_elements_text(_p -> 'preferred_institutions')), '{}'),
     nullif(_p ->> 'min_experience', '')::int,
     coalesce(array(select jsonb_array_elements_text(_p -> 'goals')), '{}'),
     coalesce(array(select jsonb_array_elements_text(_p -> 'learning_styles')), '{}'),
     coalesce(array(select jsonb_array_elements_text(_p -> 'teacher_qualities')), '{}'),
     nullif(trim(_p ->> 'trial_topic'), ''), nullif(trim(_p ->> 'note'), ''))
  returning * into _row;

  _pay := public.create_payment_request('smart_match', 'smart_match_requests', _row.id, _voucher);
  update public.smart_match_requests set payment_request_id = _pay.id,
         status = case when _pay.amount_bdt = 0 then 'payment_review' else 'awaiting_payment' end::public.match_status
   where id = _row.id;
  return json_build_object('id', _row.id, 'code', _row.code, 'payment_request_id', _pay.id, 'amount_bdt', _pay.amount_bdt);
end $$;

-- Payment proof → payment_review (extends the generic submit function for smart match).
create or replace function private.on_payment_proof() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.trx_id is not null and old.trx_id is null and new.service_code = 'smart_match' then
    update public.smart_match_requests set status = 'payment_review' where payment_request_id = new.id and status = 'awaiting_payment';
  end if;
  return new;
end $$;
create trigger payment_requests_proof after update of trx_id on public.payment_requests for each row execute function private.on_payment_proof();

-- Extend admin review: smart match approval starts the search; rejection asks the payer to resubmit.
create or replace function private.after_payment_review() returns trigger
language plpgsql security definer set search_path = '' as $$
declare _m public.smart_match_requests;
begin
  if new.service_code <> 'smart_match' or old.status <> 'pending' or new.status = 'pending' then return new; end if;
  select * into _m from public.smart_match_requests where id = new.ref_id;
  if new.status = 'approved' then
    update public.smart_match_requests set status = 'searching' where id = _m.id;
    perform private.notify(new.user_id, 'smart_match', 'Smart Match শুরু হয়েছে 🔍',
      format('৳%s পেয়েছি। আপনার চাহিদা মিলিয়ে TSC এখন একজন dedicated teacher খুঁজছে — সাধারণত ২৪–৪৮ ঘণ্টা লাগে।', new.amount_bdt), jsonb_build_object('match_id', _m.id));
  elsif new.status = 'rejected' then
    update public.smart_match_requests set status = 'awaiting_payment' where id = _m.id;
  end if;
  return new;
end $$;
create trigger payment_requests_reviewed after update of status on public.payment_requests for each row execute function private.after_payment_review();

-- Renew a rejected payment for a match.
create or replace function public.renew_match_payment(_match uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _m public.smart_match_requests; _pay public.payment_requests;
begin
  select * into _m from public.smart_match_requests where id = _match and requester_id = auth.uid() and status = 'awaiting_payment' for update;
  if not found then raise exception 'nothing to renew'; end if;
  if exists (select 1 from public.payment_requests where id = _m.payment_request_id and status = 'pending') then return _m.payment_request_id; end if;
  _pay := public.create_payment_request('smart_match', 'smart_match_requests', _m.id, null);
  update public.smart_match_requests set payment_request_id = _pay.id where id = _m.id;
  return _pay.id;
end $$;

-- Admin proposes a teacher (first or replacement). Both sides get each other's number via my_matches().
create or replace function public.admin_assign_match(_match uuid, _teacher_tsc text, _note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _m public.smart_match_requests; _t uuid;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  select * into _m from public.smart_match_requests where id = _match for update;
  if _m.status not in ('searching', 'replacement_requested') then raise exception 'match is not waiting for a teacher'; end if;
  select user_id into _t from public.teacher_profiles where upper(tsc_id) = upper(_teacher_tsc) and verification_status in ('verified', 'active');
  if _t is null then raise exception 'verified teacher not found'; end if;
  if _m.status = 'searching' then
    update public.smart_match_requests set teacher_1 = _t, status = 'proposed', assigned_at = now(), admin_note = coalesce(_note, admin_note) where id = _match;
  else
    if _t = _m.teacher_1 then raise exception 'pick a different teacher for the replacement'; end if;
    update public.smart_match_requests set teacher_2 = _t, status = 'proposed', assigned_at = now(), admin_note = coalesce(_note, admin_note) where id = _match;
  end if;
  perform private.notify(_m.requester_id, 'smart_match', 'আপনার Smart Match Teacher তৈরি 🎉',
    'TSC আপনার জন্য একজন dedicated teacher বেছে দিয়েছে। নম্বর দেখে আজই যোগাযোগ করুন।', jsonb_build_object('match_id', _match));
  perform private.notify(_t, 'smart_match', 'Smart Match — নতুন student',
    'TSC আপনাকে একজন student-এর জন্য recommend করেছে। Dashboard-এ বিস্তারিত ও নম্বর দেখুন।', jsonb_build_object('match_id', _match));
  perform public.log_admin_action('match_assigned', 'smart_match_requests', _match, jsonb_build_object('teacher', _teacher_tsc));
end $$;

-- Guardian asks for the one allowed replacement.
create or replace function public.request_match_replacement(_match uuid, _reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _m public.smart_match_requests;
begin
  select * into _m from public.smart_match_requests where id = _match and requester_id = auth.uid() for update;
  if not found or _m.status <> 'proposed' then raise exception 'not possible now'; end if;
  if _m.teacher_2 is not null then raise exception 'replacement already used' using errcode = 'TS429'; end if;
  if private.find_contact(_reason) is not null then raise exception 'contact details are not allowed' using errcode = 'TS422'; end if;
  update public.smart_match_requests set status = 'replacement_requested', replacement_reason = left(_reason, 200) where id = _match;
end $$;

create or replace function public.complete_match(_match uuid) returns void
language sql security definer set search_path = '' as $$
  update public.smart_match_requests set status = 'completed' where id = _match and requester_id = auth.uid() and status = 'proposed';
$$;

-- Admin: no suitable teacher → refund owed.
create or replace function public.admin_unfulfill_match(_match uuid, _note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare _m public.smart_match_requests;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  update public.smart_match_requests set status = 'unfulfilled', admin_note = coalesce(_note, admin_note)
   where id = _match and status in ('searching', 'replacement_requested') and teacher_1 is null returning * into _m;
  if not found then raise exception 'only matches with no teacher proposed can be refunded'; end if;
  update public.payment_requests set status = 'refund_due' where id = _m.payment_request_id and status = 'approved';
  perform private.notify(_m.requester_id, 'smart_match', 'দুঃখিত — এবার মানানসই teacher পাইনি',
    'আপনার Smart Match-এর পুরো টাকা ফেরত দেওয়া হবে। চাইলে Tuition Post দিন বা Teacher খুঁজুন।', jsonb_build_object('match_id', _match));
  perform public.log_admin_action('match_unfulfilled', 'smart_match_requests', _match, jsonb_build_object('note', _note));
end $$;

-- Guardian view (current teacher's card + number while proposed/completed).
create or replace function public.my_matches() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]') from (
    select m.id, m.code, m.status, m.level, m.curriculum, m.subjects, m.district, m.created_at, m.assigned_at, m.payment_request_id,
           p.status as payment_status, (m.teacher_2 is not null) as replacement_used,
           case when coalesce(m.teacher_2, m.teacher_1) is not null then private.person_card(coalesce(m.teacher_2, m.teacher_1)) end as teacher,
           case when m.status in ('proposed', 'completed') then private.contact_phone(coalesce(m.teacher_2, m.teacher_1)) end as teacher_phone
    from public.smart_match_requests m left join public.payment_requests p on p.id = m.payment_request_id
    where m.requester_id = auth.uid()
  ) x
$$;

-- Teacher view: students TSC matched them with.
create or replace function public.teacher_matches() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.assigned_at desc), '[]') from (
    select m.id, m.code, m.status, m.level, m.curriculum, m.subjects, m.mode::text as mode, m.district, m.thana, m.days, m.time_slot,
           m.budget_min, m.budget_max, m.goals, m.learning_styles, m.trial_topic, m.note, m.assigned_at,
           private.person_card(m.requester_id) as student,
           case when m.status in ('proposed', 'completed') then private.contact_phone(m.requester_id) end as phone
    from public.smart_match_requests m
    where coalesce(m.teacher_2, m.teacher_1) = auth.uid()
  ) x
$$;

-- Admin queue.
create or replace function public.admin_list_matches(_status text default 'open') returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.created_at) from (
    select m.*, m.mode::text as mode_text, au.email,
           private.person_card(m.requester_id) as requester,
           case when m.teacher_1 is not null then private.person_card(m.teacher_1) end as t1,
           case when m.teacher_2 is not null then private.person_card(m.teacher_2) end as t2
    from public.smart_match_requests m join auth.users au on au.id = m.requester_id
    where (_status = 'open' and m.status in ('searching', 'replacement_requested', 'payment_review'))
       or (_status = 'all') or m.status::text = _status
  ) x), '[]') end
$$;

revoke all on function private.on_payment_proof(), private.after_payment_review() from public, anon, authenticated;
revoke all on function public.create_smart_match(jsonb, uuid), public.renew_match_payment(uuid), public.admin_assign_match(uuid, text, text),
  public.request_match_replacement(uuid, text), public.complete_match(uuid), public.admin_unfulfill_match(uuid, text),
  public.my_matches(), public.teacher_matches(), public.admin_list_matches(text) from public, anon;
grant execute on function public.create_smart_match(jsonb, uuid), public.renew_match_payment(uuid), public.admin_assign_match(uuid, text, text),
  public.request_match_replacement(uuid, text), public.complete_match(uuid), public.admin_unfulfill_match(uuid, text),
  public.my_matches(), public.teacher_matches(), public.admin_list_matches(text) to authenticated;
