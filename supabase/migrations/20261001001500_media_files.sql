-- Every file uploaded through /api/upload is recorded here; private-file access is decided by can_read_file().
create table public.media_files (
  key text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  mime text not null,
  size_bytes int not null,
  is_private boolean not null,
  created_at timestamptz not null default now()
);
create index media_files_owner_idx on public.media_files (owner_id, created_at desc);
alter table public.media_files enable row level security;
create policy own_or_admin on public.media_files for select to authenticated using (owner_id = (select auth.uid()) or private.is_admin());

create or replace function public.register_upload(_key text, _kind text, _mime text, _size int, _private boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare _me uuid := auth.uid();
begin
  if _me is null then raise exception 'login required' using errcode = 'TS401'; end if;
  if split_part(_key, '/', 2) <> _me::text then raise exception 'bad key' using errcode = 'TS403'; end if;
  if _kind = 'question' and not private.is_admin() then raise exception 'admin only' using errcode = 'TS403'; end if;
  if _kind in ('material', 'video', 'teaching', 'brand') and not (private.has_role(_me, 'teacher') or private.is_admin()) then
    raise exception 'teachers only' using errcode = 'TS403';
  end if;
  -- Light abuse guard: at most 60 uploads per hour per person.
  if (select count(*) from public.media_files where owner_id = _me and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too many uploads' using errcode = 'TS429';
  end if;
  insert into public.media_files (key, owner_id, kind, mime, size_bytes, is_private) values (_key, _me, _kind, _mime, _size, _private);
end $$;

-- Owner or admin; legacy files (old-site paths contain the owner's user id) count as owned. Modules extend this
-- (e.g. MyNotes buyers) by adding their own rule below.
create or replace function public.can_read_file(_key text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare _me uuid := auth.uid();
begin
  if _me is null then return false; end if;
  if private.is_admin() then return true; end if;
  if exists (select 1 from public.media_files where key = _key and owner_id = _me) then return true; end if;
  if position(_me::text in _key) > 0 then return true; end if;
  return false;
end $$;

revoke all on function public.register_upload(text, text, text, int, boolean), public.can_read_file(text) from public, anon;
grant execute on function public.register_upload(text, text, text, int, boolean), public.can_read_file(text) to authenticated;
