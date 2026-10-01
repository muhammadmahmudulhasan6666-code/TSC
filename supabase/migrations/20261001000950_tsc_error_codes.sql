-- Fix: 0900 used built-in SQLSTATEs (P0004 = assert_failure is not catchable by WHEN OTHERS; P0002/P0003 are
-- no_data_found/too_many_rows). TSC errors now use their own class 'TS' (TS4xx ≈ HTTP-style meaning):
--   TS401 login required · TS403 not allowed · TS404 not found · TS409 duplicate TrxID · TS422 bad TrxID
--   TS423 bad sender number · TS429 monthly limit.
create or replace function public.request_contact_unlock(_tsc_id text, _voucher uuid default null)
returns json language plpgsql security definer set search_path = '' as $$
declare
  _me uuid := auth.uid();
  _teacher uuid;
  _existing public.contact_unlocks;
  _limit int;
  _used int;
  _unlock public.contact_unlocks;
  _pay public.payment_requests;
begin
  if _me is null then raise exception 'login required' using errcode = 'TS401'; end if;
  if private.has_role(_me, 'teacher') and not private.has_role(_me, 'student') then
    raise exception 'teachers cannot unlock teachers' using errcode = 'TS403';
  end if;

  select t.user_id into _teacher from public.teacher_profiles t
   where upper(t.tsc_id) = upper(_tsc_id) and t.verification_status in ('verified', 'active');
  if _teacher is null then raise exception 'teacher not found' using errcode = 'TS404'; end if;

  select * into _existing from public.contact_unlocks
   where requester_id = _me and teacher_id = _teacher
     and status in ('awaiting_payment', 'payment_review', 'pending_teacher', 'accepted');
  if found then
    return json_build_object('unlock_id', _existing.id, 'status', _existing.status, 'payment_request_id', _existing.payment_request_id);
  end if;

  select coalesce((value ->> 'monthly_request_limit')::int, 10) into _limit from public.platform_settings where key = 'contact_unlock';
  select count(*) into _used from public.contact_unlocks where requester_id = _me and created_at > now() - interval '30 days';
  if _used >= coalesce(_limit, 10) then raise exception 'monthly limit reached' using errcode = 'TS429'; end if;

  insert into public.contact_unlocks (requester_id, teacher_id) values (_me, _teacher) returning * into _unlock;
  _pay := public.create_payment_request('contact_unlock', 'contact_unlocks', _unlock.id, _voucher);
  update public.contact_unlocks set payment_request_id = _pay.id where id = _unlock.id;

  -- Fully covered by a voucher: nothing to pay, goes straight to admin review.
  if _pay.amount_bdt = 0 then
    update public.payment_requests set trx_id = null where id = _pay.id;
    update public.contact_unlocks set status = 'payment_review' where id = _unlock.id;
  end if;
  return json_build_object('unlock_id', _unlock.id, 'status', case when _pay.amount_bdt = 0 then 'payment_review' else 'awaiting_payment' end, 'payment_request_id', _pay.id);
end $$;

create or replace function public.submit_payment_proof(_request uuid, _sender text, _trx text, _screenshot text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _trx_clean text := upper(regexp_replace(coalesce(_trx, ''), '\s', '', 'g'));
  _sender_clean text := regexp_replace(coalesce(_sender, ''), '[^0-9]', '', 'g');
begin
  if _trx_clean !~ '^[A-Z0-9]{8,12}$' then raise exception 'invalid trx id' using errcode = 'TS422'; end if;
  if _sender_clean !~ '^(88)?01[3-9][0-9]{8}$' then raise exception 'invalid sender number' using errcode = 'TS423'; end if;
  if exists (select 1 from public.payment_requests where trx_id = _trx_clean and id <> _request) then
    raise exception 'trx id already used' using errcode = 'TS409';
  end if;
  update public.payment_requests
     set sender_number = right(_sender_clean, 11), trx_id = _trx_clean, screenshot_key = _screenshot
   where id = _request and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request not found or not pending' using errcode = 'TS404'; end if;
  update public.contact_unlocks set status = 'payment_review'
   where payment_request_id = _request and status = 'awaiting_payment';
end $$;
