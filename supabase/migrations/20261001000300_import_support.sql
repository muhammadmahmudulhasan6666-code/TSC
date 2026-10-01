-- Support for importing the old system's users (code.md §9.5).
alter type public.curriculum_track add value if not exists 'technical';

-- Original free-text class value from the old site, kept for audit after normalising to a level code.
alter table public.student_profiles add column legacy_class_text text;

-- The importer runs `set local tsc.importing = 'on'` so imported auth.users rows don't get fresh profiles/TSC IDs.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  _role public.app_role;
  _name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  if coalesce(current_setting('tsc.importing', true), '') = 'on' then
    return new;
  end if;
  _role := case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end;

  insert into public.user_profiles (user_id, referral_code)
  values (new.id, upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
  insert into public.user_roles (user_id, role) values (new.id, _role);

  if _role = 'teacher' then
    insert into public.teacher_profiles (user_id, tsc_id, full_name)
    values (new.id, 'T' || nextval('public.teacher_tsc_id_seq'), _name);
    insert into public.teacher_private (user_id) values (new.id);
  else
    insert into public.student_profiles (user_id, tsc_id, full_name)
    values (new.id, 'S' || nextval('public.student_tsc_id_seq'), _name);
    insert into public.student_private (user_id) values (new.id);
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
