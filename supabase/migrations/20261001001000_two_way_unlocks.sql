-- Contact unlocks work both ways (Mahmud, 2026-10-01): whoever asks pays ৳100.
--   student/guardian → teacher  (any verified teacher)
--   teacher → student           (only verified teachers may ask for a student's contact)
-- The other side accepts (numbers revealed both ways, no refund) or declines / lets 72 h pass (full refund).

alter table public.contact_unlocks rename column teacher_id to target_id;
alter index public.contact_unlocks_teacher_idx rename to contact_unlocks_target_idx;

-- Public-safe card for either kind of person (counterpart in unlock lists).
create or replace function private.person_card(_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select jsonb_build_object('kind', 'teacher', 'tsc_id', t.tsc_id, 'full_name', t.full_name, 'photo_url', t.profile_photo_url,
                               'line', concat_ws(' · ', nullif(trim(t.university_name), ''), t.department),
                               'district', t.district, 'thana', t.thana, 'subjects', to_jsonb(t.subjects_offered))
       from public.teacher_profiles t where t.user_id = _user),
    (select jsonb_build_object('kind', 'student', 'tsc_id', s.tsc_id, 'full_name', s.full_name, 'photo_url', s.profile_photo_url,
                               'line', concat_ws(' · ', s.current_class, s.curriculum::text, nullif(trim(s.institution_name), '')),
                               'district', s.district, 'thana', s.thana, 'subjects', to_jsonb(s.subjects))
       from public.student_profiles s where s.user_id = _user),
    '{}'::jsonb)
$$;

-- Best contact number for a person: students → guardian phone first.
create or replace function private.contact_phone(_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select nullif(sp.guardian_phone, '') from public.student_private sp where sp.user_id = _user),
    (select nullif(up.phone_number, '') from public.user_profiles up where up.user_id = _user))
$$;
revoke all on function private.person_card(uuid), private.contact_phone(uuid) from public, anon, authenticated;

create or replace function public.request_contact_unlock(_tsc_id text, _voucher uuid default null)
returns json language plpgsql security definer set search_path = '' as $$
declare
  _me uuid := auth.uid();
  _target uuid;
  _existing public.contact_unlocks;
  _limit int;
  _used int;
  _unlock public.contact_unlocks;
  _pay public.payment_requests;
begin
  if _me is null then raise exception 'login required' using errcode = 'TS401'; end if;

  if upper(_tsc_id) like 'T%' then
    -- Asking for a teacher's number: any non-teacher account.
    if private.has_role(_me, 'teacher') then raise exception 'teachers cannot unlock teachers' using errcode = 'TS403'; end if;
    select t.user_id into _target from public.teacher_profiles t
     where upper(t.tsc_id) = upper(_tsc_id) and t.verification_status in ('verified', 'active');
  else
    -- Asking for a student's number: verified teachers only.
    if not exists (select 1 from public.teacher_profiles t where t.user_id = _me and t.verification_status in ('verified', 'active')) then
      raise exception 'only verified teachers can contact students' using errcode = 'TS403';
    end if;
    select s.user_id into _target from public.student_profiles s where upper(s.tsc_id) = upper(_tsc_id);
  end if;
  if _target is null then raise exception 'not found' using errcode = 'TS404'; end if;
  if _target = _me then raise exception 'cannot unlock yourself' using errcode = 'TS403'; end if;

  select * into _existing from public.contact_unlocks
   where requester_id = _me and target_id = _target
     and status in ('awaiting_payment', 'payment_review', 'pending_teacher', 'accepted');
  if found then
    return json_build_object('unlock_id', _existing.id, 'status', _existing.status, 'payment_request_id', _existing.payment_request_id);
  end if;

  select coalesce((value ->> 'monthly_request_limit')::int, 10) into _limit from public.platform_settings where key = 'contact_unlock';
  select count(*) into _used from public.contact_unlocks where requester_id = _me and created_at > now() - interval '30 days';
  if _used >= coalesce(_limit, 10) then raise exception 'monthly limit reached' using errcode = 'TS429'; end if;

  insert into public.contact_unlocks (requester_id, target_id) values (_me, _target) returning * into _unlock;
  _pay := public.create_payment_request('contact_unlock', 'contact_unlocks', _unlock.id, _voucher);
  update public.contact_unlocks set payment_request_id = _pay.id,
         status = case when _pay.amount_bdt = 0 then 'payment_review' else 'awaiting_payment' end::public.unlock_status
   where id = _unlock.id;
  return json_build_object('unlock_id', _unlock.id, 'status', case when _pay.amount_bdt = 0 then 'payment_review' else 'awaiting_payment' end, 'payment_request_id', _pay.id);
end $$;

create or replace function public.admin_review_payment(_request uuid, _approve boolean, _note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _p public.payment_requests;
  _u public.contact_unlocks;
  _target_name text;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  select * into _p from public.payment_requests where id = _request for update;
  if not found or _p.status <> 'pending' then raise exception 'payment is not pending'; end if;
  if _approve and _p.amount_bdt > 0 and _p.trx_id is null then raise exception 'no bKash proof submitted yet'; end if;

  update public.payment_requests
     set status = case when _approve then 'approved' else 'rejected' end::public.payment_request_status,
         admin_note = _note, reviewed_by = auth.uid(), reviewed_at = now()
   where id = _request;
  if _approve and _p.voucher_id is not null then
    update public.vouchers set redeemed_at = now(), redeemed_payment_id = _request where id = _p.voucher_id;
  end if;

  if _p.service_code = 'contact_unlock' then
    select * into _u from public.contact_unlocks where id = _p.ref_id for update;
    _target_name := coalesce(nullif(trim(private.person_card(_u.target_id) ->> 'full_name'), ''), private.person_card(_u.target_id) ->> 'tsc_id');
    if _approve then
      update public.contact_unlocks set status = 'pending_teacher', paid_at = now(), expires_at = now() + interval '72 hours' where id = _u.id;
      perform private.notify(_u.target_id, 'contact_request', 'নতুন Contact Request',
        'একজন আপনার নম্বর চেয়েছেন। ৭২ ঘণ্টার মধ্যে Accept বা Reject করুন — Accept করলে দুজনের নম্বরই খুলবে।', json_build_object('unlock_id', _u.id)::jsonb);
      perform private.notify(_p.user_id, 'payment', 'Payment যাচাই হয়েছে',
        format('৳%s পেয়েছি। %s-এর কাছে request পাঠানো হয়েছে — ৭২ ঘণ্টার মধ্যে উত্তর আসবে।', _p.amount_bdt, _target_name), json_build_object('unlock_id', _u.id)::jsonb);
    else
      update public.contact_unlocks set status = 'awaiting_payment' where id = _u.id;
      update public.payment_requests set trx_id = null where id = _request;
      perform private.notify(_p.user_id, 'payment', 'Payment যাচাই করা যায়নি',
        coalesce('কারণ: ' || _note || '। ', '') || 'TrxID আর নম্বর আবার মিলিয়ে দেখে নতুন করে জমা দিন।', json_build_object('unlock_id', _u.id)::jsonb);
    end if;
  end if;

  perform public.log_admin_action(case when _approve then 'payment_approved' else 'payment_rejected' end, 'payment_requests', _request,
    json_build_object('service', _p.service_code, 'amount_bdt', _p.amount_bdt, 'note', _note)::jsonb);
end $$;

create or replace function public.respond_contact_unlock(_unlock uuid, _accept boolean, _note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare _u public.contact_unlocks;
begin
  select * into _u from public.contact_unlocks where id = _unlock and target_id = auth.uid() for update;
  if not found then raise exception 'request not found' using errcode = 'TS404'; end if;
  if _u.status <> 'pending_teacher' then raise exception 'request is no longer open'; end if;
  update public.contact_unlocks
     set status = case when _accept then 'accepted' else 'rejected' end::public.unlock_status,
         responded_at = now(), response_note = left(_note, 200)
   where id = _unlock;
  if _accept then
    perform private.notify(_u.requester_id, 'contact_unlocked', 'নম্বর Unlock হয়েছে 🎉',
      'আপনার request গ্রহণ করা হয়েছে। এখন নম্বর দেখতে পারবেন — আজই যোগাযোগ করুন।', json_build_object('unlock_id', _unlock)::jsonb);
  else
    update public.payment_requests set status = 'refund_due' where id = _u.payment_request_id and status = 'approved';
    perform private.notify(_u.requester_id, 'contact_rejected', 'এই মুহূর্তে রাজি হননি',
      'আপনার ৳১০০ পুরোটা ফেরত দেওয়া হবে (যে bKash নম্বর থেকে পাঠিয়েছিলেন)।', json_build_object('unlock_id', _unlock)::jsonb);
  end if;
end $$;

create or replace function private.expire_contact_unlocks() returns int
language plpgsql security definer set search_path = '' as $$
declare _n int := 0; _u record;
begin
  for _u in select * from public.contact_unlocks where status = 'pending_teacher' and expires_at < now() for update skip locked loop
    update public.contact_unlocks set status = 'expired' where id = _u.id;
    update public.payment_requests set status = 'refund_due' where id = _u.payment_request_id and status = 'approved';
    perform private.notify(_u.requester_id, 'contact_expired', 'সময়মতো উত্তর আসেনি',
      'আপনার ৳১০০ পুরোটা ফেরত দেওয়া হবে।', json_build_object('unlock_id', _u.id)::jsonb);
    _n := _n + 1;
  end loop;
  return _n;
end $$;

-- Outgoing (I asked) and incoming (asked of me), each with the counterpart's card and, once accepted, their phone.
drop function public.my_unlocks();
create or replace function public.my_unlocks() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]') from (
    select u.id, u.status, u.created_at, u.expires_at, u.responded_at, u.payment_request_id,
           p.status as payment_status, p.amount_bdt,
           private.person_card(u.target_id) as person,
           case when u.status = 'accepted' then private.contact_phone(u.target_id) end as phone
    from public.contact_unlocks u
    left join public.payment_requests p on p.id = u.payment_request_id
    where u.requester_id = auth.uid()
  ) x
$$;

drop function public.teacher_unlock_requests();
create or replace function public.incoming_unlock_requests() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]') from (
    select u.id, u.status, u.created_at, u.expires_at, u.responded_at,
           private.person_card(u.requester_id) as person,
           case when u.status = 'accepted' then private.contact_phone(u.requester_id) end as phone
    from public.contact_unlocks u
    where u.target_id = auth.uid() and u.status in ('pending_teacher', 'accepted', 'rejected', 'expired')
  ) x
$$;

revoke all on function public.my_unlocks(), public.incoming_unlock_requests() from public, anon;
grant execute on function public.my_unlocks(), public.incoming_unlock_requests() to authenticated;
