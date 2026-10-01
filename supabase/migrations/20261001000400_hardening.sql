-- Advisor fixes: hide RLS helpers from the REST API, one permissive policy per action, FK indexes.

-- 1. Helpers move to a non-exposed schema (policies keep working: they reference functions by OID).
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.has_role(uuid, public.app_role) set schema private;
alter function public.is_admin() set schema private;
alter function public.is_super_admin() set schema private;
alter function public.touch_updated_at() set schema private;
revoke all on all functions in schema private from public, anon;
grant execute on function private.has_role(uuid, public.app_role), private.is_admin(), private.is_super_admin() to authenticated;

-- log_admin_action / handle_new_user call is_admin by schema-qualified name: re-point them.
create or replace function public.log_admin_action(_action text, _table text, _target uuid, _details jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'admin only'; end if;
  insert into public.admin_audit_log (admin_user_id, action_type, target_table, target_id, action_details)
  values (auth.uid(), _action, _table, _target, coalesce(_details, '{}'));
end $$;
revoke execute on function public.log_admin_action(text, text, uuid, jsonb) from public, anon;

do $$ begin
  if exists (select 1 from pg_proc where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- 2. Replace "admin_write FOR ALL" with per-action policies so SELECT/UPDATE each have one policy.
do $$
declare t text;
begin
  foreach t in array array['user_profiles','student_profiles','student_private','teacher_profiles','teacher_private',
                           'teacher_portfolios','notifications','vouchers','payment_requests','platform_settings','service_prices'] loop
    execute format('drop policy if exists admin_write on public.%I', t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check (private.is_admin())', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using (private.is_admin())', t);
  end loop;
end $$;

-- Tables where owners may update: one combined UPDATE policy.
do $$
declare t text;
begin
  foreach t in array array['user_profiles','student_profiles','student_private','teacher_profiles','teacher_private','notifications'] loop
    execute format('drop policy if exists own_update on public.%I', t);
    execute format('create policy owner_or_admin_update on public.%I for update to authenticated
                      using (user_id = (select auth.uid()) or private.is_admin())
                      with check (user_id = (select auth.uid()) or private.is_admin())', t);
  end loop;
  foreach t in array array['teacher_portfolios','vouchers','payment_requests','platform_settings','service_prices'] loop
    execute format('create policy admin_update on public.%I for update to authenticated using (private.is_admin()) with check (private.is_admin())', t);
  end loop;
end $$;

-- Notifications: admins may read all (merge into the single select policy).
drop policy own_read on public.notifications;
create policy own_read on public.notifications for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());

-- Public-read tables: one SELECT policy covering anon + authenticated (admin_write used to add a second one).
-- (public_read already includes `or private.is_admin()` via the re-pointed function OID.)

-- user_roles: split super-admin management per action.
drop policy super_admin_roles on public.user_roles;
create policy super_admin_insert on public.user_roles for insert to authenticated with check (private.is_super_admin());
create policy super_admin_update on public.user_roles for update to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy super_admin_delete on public.user_roles for delete to authenticated using (private.is_super_admin());

-- 3. Covering indexes for foreign keys.
create index if not exists admin_audit_log_admin_idx on public.admin_audit_log (admin_user_id);
create index if not exists payment_requests_reviewed_by_idx on public.payment_requests (reviewed_by);
create index if not exists payment_requests_service_idx on public.payment_requests (service_code);
create index if not exists payment_requests_voucher_idx on public.payment_requests (voucher_id);
create index if not exists platform_settings_updated_by_idx on public.platform_settings (updated_by);
create index if not exists vouchers_payment_idx on public.vouchers (redeemed_payment_id);
