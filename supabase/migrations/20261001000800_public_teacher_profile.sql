-- One verified teacher's public profile (no PII: no phone, guardian, DOB or address).
create or replace function public.get_public_teacher(_tsc_id text) returns json
language sql stable security definer set search_path = '' as $$
  select row_to_json(p) from (
    select tsc_id, full_name, gender, photo_url, university_name, institution, department, academic_year, experience_years,
           subjects, teaching_level, district, thana, mode, hourly_rate_online, monthly_rate_inperson, rate_negotiable,
           bio_summary, is_tsc_certified, is_online_certified, is_featured, average_rating, total_reviews,
           total_students_taught, trust_score, created_at
    from private.public_teachers where upper(tsc_id) = upper(_tsc_id)
  ) p
$$;

-- TSC IDs of every public teacher (for pre-rendering profile pages and the sitemap).
create or replace function public.list_public_teacher_ids() returns setof text
language sql stable security definer set search_path = '' as $$
  select tsc_id from private.public_teachers order by tsc_id
$$;

revoke all on function public.get_public_teacher(text), public.list_public_teacher_ids() from public;
grant execute on function public.get_public_teacher(text), public.list_public_teacher_ids() to anon, authenticated;
