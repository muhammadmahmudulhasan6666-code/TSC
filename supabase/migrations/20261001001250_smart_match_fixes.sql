-- A rejected Smart Match payment frees its TrxID (same as contact unlocks) and tells the payer.
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
    update public.payment_requests set trx_id = null where id = new.id;
    perform private.notify(new.user_id, 'payment', 'Payment যাচাই করা যায়নি',
      coalesce('কারণ: ' || new.admin_note || '। ', '') || 'TrxID আর নম্বর আবার মিলিয়ে দেখে নতুন করে জমা দিন।', jsonb_build_object('match_id', _m.id));
  end if;
  return new;
end $$;
revoke all on function private.after_payment_review() from public, anon, authenticated;
