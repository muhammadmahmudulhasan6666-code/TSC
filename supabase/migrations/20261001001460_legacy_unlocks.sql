-- Contacts unlocked on the old site stay unlocked (numbers visible, trials and reviews allowed). One row per pair.
insert into public.contact_unlocks (id, requester_id, target_id, status, paid_at, responded_at, response_note, created_at)
select distinct on (l.requester_id, l.target_id)
       l.id, l.requester_id, l.target_id, l.status::text::public.unlock_status, l.created_at, l.response_at, l.response_notes, l.created_at
from legacy.contact_unlocks l
where l.status in ('accepted', 'rejected')
  and exists (select 1 from auth.users where id = l.requester_id) and exists (select 1 from auth.users where id = l.target_id)
order by l.requester_id, l.target_id, (l.status = 'accepted') desc, l.created_at desc
on conflict do nothing;
