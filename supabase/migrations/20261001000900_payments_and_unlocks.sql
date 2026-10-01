-- Phase 1 money paths (ADR 0001): manual bKash review queue + contact unlock (৳100).
-- Every state change goes through SECURITY DEFINER functions; clients never write these tables directly.


-- ── Notifications helper (internal) ───────────────────────────────────────────────────────
create or replace function private.notify(_user uuid, _type text, _title text, _message text, _meta jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, message, metadata) values (_user, _type, _title, _message, coalesce(_meta, '{}'));
$$;
revoke all on function private.notify(uuid, text, text, text, jsonb) from public, anon, authenticated;

alter publication supabase_realtime add table public.notifications;

-- ── Contact unlocks ───────────────────────────────────────────────────────────────────────
create type public.unlock_status as enum
  ('awaiting_payment', 'payment_review', 'pending_teacher', 'accepted', 'rejected', 'expired', 'cancelled');

create table public.contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  status public.unlock_status not null default 'awaiting_payment',
  payment_request_id uuid references public.payment_requests (id),
  paid_at timestamptz,
  expires_at timestamptz,          -- teacher must answer before this (paid_at + 72 h)
  responded_at timestamptz,
  response_note text check (char_length(response_note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> teacher_id)
);
create index contact_unlocks_requester_idx on public.contact_unlocks (requester_id, created_at desc);
create index contact_unlocks_teacher_idx on public.contact_unlocks (teacher_id, status);
create index contact_unlocks_payment_idx on public.contact_unlocks (payment_request_id);
create index contact_unlocks_expiry_idx on public.contact_unlocks (expires_at) where status = 'pending_teacher';
-- One open unlock per student–teacher pair.
create unique index contact_unlocks_open_pair on public.contact_unlocks (requester_id, teacher_id)
  where status in ('awaiting_payment', 'payment_review', 'pending_teacher', 'accepted');
create trigger contact_unlocks_touch before update on public.contact_unlocks for each row execute function private.touch_updated_at();

alter table public.contact_unlocks enable row level security;
create policy party_read on public.contact_unlocks for select to authenticated
  using (requester_id = (select auth.uid()) or teacher_id = (select auth.uid()) or private.is_admin());

-- Student starts an unlock: creates the unlock + a server-priced payment request in one step.
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
  if _me is null then raise exception 'login required' using errcode = '28000'; end if;
  if private.has_role(_me, 'teacher') and not private.has_role(_me, 'student') then
    raise exception 'teachers cannot unlock teachers' using errcode = 'P0001';
  end if;

  select t.user_id into _teacher from public.teacher_profiles t
   where upper(t.tsc_id) = upper(_tsc_id) and t.verification_status in ('verified', 'active');
  if _teacher is null then raise exception 'teacher not found' using errcode = 'P0002'; end if;

  select * into _existing from public.contact_unlocks
   where requester_id = _me and teacher_id = _teacher
     and status in ('awaiting_payment', 'payment_review', 'pending_teacher', 'accepted');
  if found then
    return json_build_object('unlock_id', _existing.id, 'status', _existing.status, 'payment_request_id', _existing.payment_request_id);
  end if;

  select coalesce((value ->> 'monthly_request_limit')::int, 10) into _limit from public.platform_settings where key = 'contact_unlock';
  select count(*) into _used from public.contact_unlocks where requester_id = _me and created_at > now() - interval '30 days';
  if _used >= coalesce(_limit, 10) then raise exception 'monthly limit reached' using errcode = 'P0003'; end if;

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

-- Proof submitted → linked unlock moves to payment_review (re-defines the earlier function).
create or replace function public.submit_payment_proof(_request uuid, _sender text, _trx text, _screenshot text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _trx_clean text := upper(regexp_replace(coalesce(_trx, ''), '\s', '', 'g'));
  _sender_clean text := regexp_replace(coalesce(_sender, ''), '[^0-9]', '', 'g');
begin
  if _trx_clean !~ '^[A-Z0-9]{8,12}$' then raise exception 'invalid trx id' using errcode = 'P0004'; end if;
  if _sender_clean !~ '^(88)?01[3-9][0-9]{8}$' then raise exception 'invalid sender number' using errcode = 'P0005'; end if;
  if exists (select 1 from public.payment_requests where trx_id = _trx_clean and id <> _request) then
    raise exception 'trx id already used' using errcode = 'P0006';
  end if;
  update public.payment_requests
     set sender_number = right(_sender_clean, 11), trx_id = _trx_clean, screenshot_key = _screenshot
   where id = _request and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'request not found or not pending' using errcode = 'P0002'; end if;
  update public.contact_unlocks set status = 'payment_review'
   where payment_request_id = _request and status = 'awaiting_payment';
end $$;

-- Admin approves/rejects a payment and the purchased service is activated in the same transaction.
create or replace function public.admin_review_payment(_request uuid, _approve boolean, _note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _p public.payment_requests;
  _u public.contact_unlocks;
  _teacher_name text;
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
    select coalesce(nullif(trim(full_name), ''), tsc_id) into _teacher_name from public.teacher_profiles where user_id = _u.teacher_id;
    if _approve then
      update public.contact_unlocks set status = 'pending_teacher', paid_at = now(), expires_at = now() + interval '72 hours' where id = _u.id;
      perform private.notify(_u.teacher_id, 'contact_request', 'নতুন Contact Request',
        'একজন student/guardian আপনার নম্বর চেয়েছেন। ৭২ ঘণ্টার মধ্যে Accept বা Reject করুন।', json_build_object('unlock_id', _u.id)::jsonb);
      perform private.notify(_p.user_id, 'payment', 'Payment যাচাই হয়েছে',
        format('৳%s পেয়েছি। %s-এর কাছে request পাঠানো হয়েছে — ৭২ ঘণ্টার মধ্যে উত্তর আসবে।', _p.amount_bdt, _teacher_name), json_build_object('unlock_id', _u.id)::jsonb);
    else
      update public.contact_unlocks set status = 'awaiting_payment' where id = _u.id;
      update public.payment_requests set trx_id = null where id = _request;  -- frees the TrxID slot
      -- A rejected request is closed; the student starts a fresh payment request for the same unlock.
      perform private.notify(_p.user_id, 'payment', 'Payment যাচাই করা যায়নি',
        coalesce('কারণ: ' || _note || '। ', '') || 'TrxID আর নম্বর আবার মিলিয়ে দেখে নতুন করে জমা দিন।', json_build_object('unlock_id', _u.id)::jsonb);
    end if;
  end if;

  perform public.log_admin_action(case when _approve then 'payment_approved' else 'payment_rejected' end, 'payment_requests', _request,
    json_build_object('service', _p.service_code, 'amount_bdt', _p.amount_bdt, 'note', _note)::jsonb);
end $$;

-- After a rejected payment, the student gets a fresh request for the same unlock.
create or replace function public.renew_unlock_payment(_unlock uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare _u public.contact_unlocks; _pay public.payment_requests;
begin
  select * into _u from public.contact_unlocks where id = _unlock and requester_id = auth.uid() and status = 'awaiting_payment' for update;
  if not found then raise exception 'nothing to renew'; end if;
  if exists (select 1 from public.payment_requests where id = _u.payment_request_id and status = 'pending') then
    return _u.payment_request_id;
  end if;
  _pay := public.create_payment_request('contact_unlock', 'contact_unlocks', _u.id, null);
  update public.contact_unlocks set payment_request_id = _pay.id where id = _u.id;
  return _pay.id;
end $$;

-- Teacher answers. Reject = full refund owed to the student (admin sends it back by bKash).
create or replace function public.respond_contact_unlock(_unlock uuid, _accept boolean, _note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare _u public.contact_unlocks;
begin
  select * into _u from public.contact_unlocks where id = _unlock and teacher_id = auth.uid() for update;
  if not found then raise exception 'request not found'; end if;
  if _u.status <> 'pending_teacher' then raise exception 'request is no longer open'; end if;
  update public.contact_unlocks
     set status = case when _accept then 'accepted' else 'rejected' end::public.unlock_status,
         responded_at = now(), response_note = left(_note, 200)
   where id = _unlock;
  if _accept then
    perform private.notify(_u.requester_id, 'contact_unlocked', 'নম্বর Unlock হয়েছে 🎉',
      'Teacher আপনার request গ্রহণ করেছেন। এখন নম্বর দেখতে পারবেন — আজই যোগাযোগ করুন।', json_build_object('unlock_id', _unlock)::jsonb);
  else
    update public.payment_requests set status = 'refund_due' where id = _u.payment_request_id and status = 'approved';
    perform private.notify(_u.requester_id, 'contact_rejected', 'Teacher এই মুহূর্তে available নন',
      'আপনার ৳১০০ পুরোটা ফেরত দেওয়া হবে (bKash-এ, যে নম্বর থেকে পাঠিয়েছিলেন)। চাইলে অন্য teacher দেখুন বা Smart Match নিন।', json_build_object('unlock_id', _unlock)::jsonb);
  end if;
end $$;

-- Hourly: unanswered requests expire after 72 h and their payment becomes refundable.
create or replace function private.expire_contact_unlocks() returns int
language plpgsql security definer set search_path = '' as $$
declare _n int := 0; _u record;
begin
  for _u in select * from public.contact_unlocks where status = 'pending_teacher' and expires_at < now() for update skip locked loop
    update public.contact_unlocks set status = 'expired' where id = _u.id;
    update public.payment_requests set status = 'refund_due' where id = _u.payment_request_id and status = 'approved';
    perform private.notify(_u.requester_id, 'contact_expired', 'Teacher সময়মতো উত্তর দেননি',
      'আপনার ৳১০০ পুরোটা ফেরত দেওয়া হবে। অন্য teacher দেখুন বা Smart Match নিন — আমরা খুঁজে দেব।', json_build_object('unlock_id', _u.id)::jsonb);
    _n := _n + 1;
  end loop;
  return _n;
end $$;

-- Admin marks a refund as sent.
create or replace function public.admin_mark_refunded(_request uuid, _note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare _p public.payment_requests;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  update public.payment_requests set status = 'refunded', admin_note = coalesce(_note, admin_note), reviewed_by = auth.uid(), reviewed_at = now()
   where id = _request and status = 'refund_due' returning * into _p;
  if not found then raise exception 'not awaiting refund'; end if;
  perform private.notify(_p.user_id, 'refund', 'টাকা ফেরত পাঠানো হয়েছে',
    format('৳%s আপনার bKash নম্বরে (%s) ফেরত পাঠানো হয়েছে।', _p.amount_bdt, _p.sender_number), '{}'::jsonb);
  perform public.log_admin_action('payment_refunded', 'payment_requests', _request, json_build_object('amount_bdt', _p.amount_bdt, 'note', _note)::jsonb);
end $$;

-- ── Read APIs ─────────────────────────────────────────────────────────────────────────────
-- Student: my unlocks (teacher phone only once accepted).
create or replace function public.my_unlocks() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]') from (
    select u.id, u.status, u.created_at, u.expires_at, u.responded_at, u.payment_request_id,
           p.status as payment_status, p.amount_bdt,
           t.tsc_id, t.full_name, t.profile_photo_url as photo_url, t.university_name, t.department,
           case when u.status = 'accepted' then up.phone_number end as phone
    from public.contact_unlocks u
    join public.teacher_profiles t on t.user_id = u.teacher_id
    left join public.user_profiles up on up.user_id = u.teacher_id
    left join public.payment_requests p on p.id = u.payment_request_id
    where u.requester_id = auth.uid()
  ) x
$$;

-- Teacher: incoming requests (student contact only once accepted).
create or replace function public.teacher_unlock_requests() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]') from (
    select u.id, u.status, u.created_at, u.expires_at, u.responded_at,
           s.tsc_id, s.full_name, s.current_class, s.curriculum, s.district, s.thana, s.subjects,
           case when u.status = 'accepted' then coalesce(sp.guardian_phone, up.phone_number) end as phone,
           case when u.status = 'accepted' then sp.guardian_name end as guardian_name
    from public.contact_unlocks u
    left join public.student_profiles s on s.user_id = u.requester_id
    left join public.student_private sp on sp.user_id = u.requester_id
    left join public.user_profiles up on up.user_id = u.requester_id
    where u.teacher_id = auth.uid() and u.status in ('pending_teacher', 'accepted', 'rejected', 'expired')
  ) x
$$;

-- One payment request with what the payer needs to see (own requests only).
create or replace function public.get_payment_request(_id uuid) returns json
language sql stable security definer set search_path = '' as $$
  select row_to_json(x) from (
    select p.id, p.service_code, s.name_bn, s.name_en, p.list_price_bdt, p.discount_bdt, p.amount_bdt, p.reference_code,
           p.status, p.trx_id, p.sender_number, p.admin_note, p.created_at, p.reviewed_at, p.ref_table, p.ref_id,
           (select value from public.platform_settings where key = 'bkash_receiver') as bkash
    from public.payment_requests p join public.service_prices s on s.code = p.service_code
    where p.id = _id and (p.user_id = auth.uid() or private.is_admin())
  ) x
$$;

-- Admin queue with payer identity.
create or replace function public.admin_list_payments(_status text default 'pending', _limit int default 100)
returns json language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.created_at desc) from (
    select p.id, p.service_code, s.name_bn, s.name_en, p.amount_bdt, p.list_price_bdt, p.discount_bdt, p.status, p.trx_id, p.sender_number,
           p.reference_code, p.admin_note, p.created_at, p.reviewed_at, p.ref_table, p.ref_id,
           au.email, coalesce(st.full_name, te.full_name) as full_name, coalesce(st.tsc_id, te.tsc_id) as tsc_id
    from public.payment_requests p
    join public.service_prices s on s.code = p.service_code
    join auth.users au on au.id = p.user_id
    left join public.student_profiles st on st.user_id = p.user_id
    left join public.teacher_profiles te on te.user_id = p.user_id
    where _status = 'all' or p.status::text = _status
    limit least(_limit, 500)
  ) x), '[]') end
$$;

create or replace function public.admin_payment_counts() returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else json_build_object(
    'pending_with_proof', (select count(*) from public.payment_requests where status = 'pending' and (trx_id is not null or amount_bdt = 0)),
    'pending_no_proof', (select count(*) from public.payment_requests where status = 'pending' and trx_id is null and amount_bdt > 0),
    'refund_due', (select count(*) from public.payment_requests where status = 'refund_due')) end
$$;

-- Grants: authenticated only (anon never reaches money functions).
revoke all on function public.request_contact_unlock(text, uuid), public.submit_payment_proof(uuid, text, text, text),
  public.admin_review_payment(uuid, boolean, text), public.renew_unlock_payment(uuid), public.respond_contact_unlock(uuid, boolean, text),
  public.admin_mark_refunded(uuid, text), public.my_unlocks(), public.teacher_unlock_requests(), public.get_payment_request(uuid),
  public.admin_list_payments(text, int), public.admin_payment_counts() from public, anon;
grant execute on function public.request_contact_unlock(text, uuid), public.submit_payment_proof(uuid, text, text, text),
  public.admin_review_payment(uuid, boolean, text), public.renew_unlock_payment(uuid), public.respond_contact_unlock(uuid, boolean, text),
  public.admin_mark_refunded(uuid, text), public.my_unlocks(), public.teacher_unlock_requests(), public.get_payment_request(uuid),
  public.admin_list_payments(text, int), public.admin_payment_counts() to authenticated;
revoke all on function private.expire_contact_unlocks() from public, anon, authenticated;

-- Hourly expiry job.
create extension if not exists pg_cron;
select cron.schedule('expire-contact-unlocks', '7 * * * *', $$select private.expire_contact_unlocks()$$);
