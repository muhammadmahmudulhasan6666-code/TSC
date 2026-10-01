-- bKash receiver (Mahmud, 2026-10-01) and legacy-Connects vouchers as a first-service discount.
update public.platform_settings
   set value = '{"number": "01609291050", "type": "personal"}'
 where key = 'bkash_receiver';

-- Legacy-Connects vouchers apply only to a user's first paid service (Mahmud: "1st service use discount").
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
    if _v.reason = 'legacy_connects' and exists (
      select 1 from public.payment_requests where user_id = auth.uid() and status = 'approved'
    ) then
      raise exception 'this voucher is only for your first service';
    end if;
    _discount := least(_v.amount_bdt, _price.price_bdt);
  end if;
  insert into public.payment_requests (user_id, service_code, ref_table, ref_id, list_price_bdt, discount_bdt, amount_bdt, voucher_id, reference_code)
  values (auth.uid(), _service, _ref_table, _ref_id, _price.price_bdt, _discount, _price.price_bdt - _discount, _voucher,
          'TSC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)))
  returning * into _row;
  return _row;
end $$;
revoke execute on function public.create_payment_request(text, text, uuid, uuid) from public, anon;
