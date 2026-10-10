-- Admin control over tuition posts: review queue, clean a flagged note before approving, take down any post.

create or replace function public.admin_list_posts(_status text default 'pending_review', _limit int default 50) returns json
language sql stable security definer set search_path = '' as $$
  select case when not private.is_admin() then null else coalesce((select json_agg(x order by x.created_at desc) from (
    select p.id, p.code, p.status, p.curriculum, p.level, p.subjects, p.mode::text as mode, p.district, p.thana, p.budget_min, p.budget_max,
           p.note, p.moderation_reason, p.hand_raise_count, p.created_at, p.expires_at, au.email,
           private.person_card(p.author_id) as author
    from public.tuition_posts p join auth.users au on au.id = p.author_id
    where _status = 'all' or p.status::text = _status
    order by p.created_at desc limit least(_limit, 200)
  ) x), '[]') end
$$;

-- Replace the note (e.g. strip a phone number) — the cleaned text must pass the detector.
create or replace function public.admin_set_post_note(_post uuid, _note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  if private.find_contact(_note) is not null then raise exception 'note still contains contact details' using errcode = 'TS422'; end if;
  update public.tuition_posts set note = nullif(trim(_note), '') where id = _post;
  perform public.log_admin_action('post_note_edited', 'tuition_posts', _post, '{}'::jsonb);
end $$;

-- Take down a live post (spam, fake, abuse).
create or replace function public.admin_remove_post(_post uuid, _reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare _p public.tuition_posts;
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  update public.tuition_posts set status = 'rejected', moderation_reason = _reason where id = _post and status = 'open' returning * into _p;
  if not found then raise exception 'post is not live'; end if;
  perform private.notify(_p.author_id, 'tuition_post', 'Tuition Post সরানো হয়েছে', coalesce('কারণ: ' || _reason, ''), jsonb_build_object('post_id', _post));
  perform public.log_admin_action('post_removed', 'tuition_posts', _post, jsonb_build_object('reason', _reason));
end $$;

revoke all on function public.admin_list_posts(text, int), public.admin_set_post_note(uuid, text), public.admin_remove_post(uuid, text) from public, anon;
grant execute on function public.admin_list_posts(text, int), public.admin_set_post_note(uuid, text), public.admin_remove_post(uuid, text) to authenticated;
