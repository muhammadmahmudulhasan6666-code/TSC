-- Public read API for the home page and teacher search. Base tables stay private: these
-- SECURITY DEFINER functions return an explicit, PII-free column list for verified teachers only.

-- ── Institutions: free-text university names → one canonical code ─────────────────────────
create table public.institutions (
  code varchar(16) primary key,
  name_en text not null,
  name_bn text not null,
  pattern text not null,           -- case-insensitive regex matched against the free-text name
  sort_order int not null default 100
);
alter table public.institutions enable row level security;
create policy public_read on public.institutions for select to anon, authenticated using (true);
grant select on public.institutions to anon;

insert into public.institutions (code, name_en, name_bn, pattern, sort_order) values
  ('CUET',  'Chittagong University of Engineering & Technology', 'চট্টগ্রাম প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', '(\mcuet\M|chittagong university of engineering|chattogram university of engineering)', 1),
  ('BUET',  'Bangladesh University of Engineering & Technology', 'বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়', '(\mbuet\M|bangladesh university of engineering)', 2),
  ('DU',    'University of Dhaka', 'ঢাকা বিশ্ববিদ্যালয়', '(\mdu\M|university of dhaka|dhaka university)', 3),
  ('CU',    'University of Chittagong', 'চট্টগ্রাম বিশ্ববিদ্যালয়', '(\mcu\M|university of chittagong|chittagong university$|chattogram university$)', 4),
  ('KUET',  'Khulna University of Engineering & Technology', 'খুলনা প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', '(\mkuet\M|khulna university of engineering)', 5),
  ('RUET',  'Rajshahi University of Engineering & Technology', 'রাজশাহী প্রকৌশল ও প্রযুক্তি বিশ্ববিদ্যালয়', '(\mruet\M|rajshahi university of engineering)', 6),
  ('SUST',  'Shahjalal University of Science & Technology', 'শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়', '(\msust\M|shahjalal university)', 7),
  ('RU',    'University of Rajshahi', 'রাজশাহী বিশ্ববিদ্যালয়', '(\mru\M|university of rajshahi|rajshahi university$)', 8),
  ('JU',    'Jahangirnagar University', 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', '(\mju\M|jahangirnagar)', 9),
  ('JnU',   'Jagannath University', 'জগন্নাথ বিশ্ববিদ্যালয়', '(\mjnu\M|jagannath)', 10),
  ('NSU',   'North South University', 'নর্থ সাউথ বিশ্ববিদ্যালয়', '(\mnsu\M|north south)', 11),
  ('BRACU', 'BRAC University', 'ব্র্যাক বিশ্ববিদ্যালয়', '(\mbracu?\M|brac university)', 12),
  ('IUT',   'Islamic University of Technology', 'ইসলামিক ইউনিভার্সিটি অব টেকনোলজি', '(\miut\M|islamic university of technology)', 13),
  ('MIST',  'Military Institute of Science & Technology', 'মিলিটারি ইনস্টিটিউট অব সায়েন্স অ্যান্ড টেকনোলজি', '(\mmist\M|military institute of science)', 14),
  ('CMC',   'Chittagong Medical College', 'চট্টগ্রাম মেডিকেল কলেজ', '(\mcmc\M|chittagong medical college|chattogram medical college)', 15),
  ('DMC',   'Dhaka Medical College', 'ঢাকা মেডিকেল কলেজ', '(\mdmc\M|dhaka medical college)', 16),
  ('BAUST', 'Bangladesh Army University of Science & Technology', 'বাংলাদেশ আর্মি ইউনিভার্সিটি অব সায়েন্স অ্যান্ড টেকনোলজি', '(\mbaust\M|army university of science)', 17),
  ('IIUC',  'International Islamic University Chittagong', 'আন্তর্জাতিক ইসলামী বিশ্ববিদ্যালয় চট্টগ্রাম', '(\miiuc\M|international islamic university chittagong)', 18);

create or replace function public.institution_code(_name text) returns text
language sql stable set search_path = '' as $$
  select i.code from public.institutions i
  where _name is not null and lower(trim(_name)) ~ i.pattern
  order by i.sort_order limit 1
$$;

-- ── Trust score (same formula as app/lib/trustScore.ts) ─────────────────────────────────────
create or replace function public.trust_score(_rating numeric, _completion numeric, _reviews int, _students int, _verified boolean, _certified boolean)
returns int language sql immutable set search_path = '' as $$
  select round(
      least(greatest(coalesce(_rating, 0) / 5, 0), 1) * 30
    + least(greatest(coalesce(_completion, 0) / 100, 0), 1) * 25
    + least(greatest(coalesce(_reviews, 0)::numeric / 50, 0), 1) * 20
    + least(greatest(coalesce(_students, 0)::numeric / 20, 0), 1) * 15
    + case when _verified then 7 else 0 end
    + case when _certified then 3 else 0 end)::int
$$;

-- ── Public teacher view (internal) ─────────────────────────────────────────────────────────
create or replace view private.public_teachers as
select
  t.tsc_id,
  t.full_name,
  t.gender::text as gender,
  t.profile_photo_url as photo_url,
  t.university_name,
  public.institution_code(t.university_name) as institution,
  t.department,
  t.academic_year,
  t.experience_years,
  t.subjects_offered as subjects,
  t.teaching_level,
  t.district,
  t.thana,
  t.teaching_mode_offered::text as mode,
  t.hourly_rate_online,
  t.monthly_rate_inperson,
  t.rate_negotiable,
  t.bio_summary,
  t.is_tsc_certified,
  t.is_online_certified,
  t.is_featured,
  t.average_rating,
  t.total_reviews,
  t.total_students_taught,
  public.trust_score(t.average_rating, t.booking_completion_rate, t.total_reviews, t.total_students_taught, true, t.is_tsc_certified) as trust_score,
  t.profile_completion_percentage as completion,
  t.created_at
from public.teacher_profiles t
join public.user_profiles u on u.user_id = t.user_id and u.user_status = 'active'
where t.verification_status in ('verified', 'active');

-- ── RPCs ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.get_home_stats() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'verified_teachers', (select count(*) from private.public_teachers),
    'students', (select count(*) from public.student_profiles s join public.user_profiles u on u.user_id = s.user_id and u.user_status = 'active'),
    'districts', (select count(distinct district) from private.public_teachers where district is not null),
    'institutions', (select count(distinct institution) from private.public_teachers where institution is not null),
    'subjects', (select count(distinct s) from private.public_teachers, unnest(subjects) s),
    'top_institutions', (select coalesce(json_agg(x order by x.n desc), '[]') from (
        select institution as code, count(*) as n from private.public_teachers where institution is not null
        group by institution order by count(*) desc limit 6) x)
  )
$$;

create or replace function public.get_teacher_filters() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'districts', (select coalesce(json_agg(d order by n desc), '[]') from (select district d, count(*) n from private.public_teachers where district is not null group by 1) a),
    'subjects', (select coalesce(json_agg(s order by n desc), '[]') from (select s, count(*) n from private.public_teachers, unnest(subjects) s group by 1) b),
    'institutions', (select coalesce(json_agg(json_build_object('code', i.code, 'name_en', i.name_en, 'name_bn', i.name_bn) order by i.sort_order), '[]')
                       from public.institutions i where exists (select 1 from private.public_teachers p where p.institution = i.code))
  )
$$;

create or replace function public.search_teachers(
  _q text default null, _district text default null, _subject text default null, _mode text default null,
  _gender text default null, _institution text default null, _max_monthly numeric default null,
  _sort text default 'recommended', _limit int default 24, _offset int default 0
) returns json
language sql stable security definer set search_path = '' as $$
  with f as (
    select p.* from private.public_teachers p
    where (_q is null or _q = '' or concat_ws(' ', p.full_name, p.tsc_id, p.university_name, p.institution, p.department, p.district, p.thana, array_to_string(p.subjects, ' ')) ilike '%' || _q || '%')
      and (_district is null or p.district = _district)
      and (_subject is null or _subject = any (p.subjects))
      and (_mode is null or p.mode = _mode or p.mode = 'both')
      and (_gender is null or p.gender = _gender)
      and (_institution is null or p.institution = _institution)
      and (_max_monthly is null or p.monthly_rate_inperson is null or p.monthly_rate_inperson <= _max_monthly)
  )
  select json_build_object(
    'total', (select count(*) from f),
    'items', coalesce((
      select json_agg(row_to_json(x)) from (
        select tsc_id, full_name, gender, photo_url, university_name, institution, department, academic_year, experience_years,
               subjects, district, thana, mode, hourly_rate_online, monthly_rate_inperson, rate_negotiable,
               is_tsc_certified, is_online_certified, is_featured, average_rating, total_reviews, trust_score
        from f
        order by
          case when _sort = 'rating' then f.average_rating end desc nulls last,
          case when _sort = 'price' then coalesce(f.monthly_rate_inperson, f.hourly_rate_online * 12) end asc nulls last,
          case when _sort = 'newest' then f.created_at end desc,
          f.is_featured desc, f.trust_score desc, (f.photo_url is not null) desc, f.completion desc, f.created_at
        limit least(greatest(_limit, 1), 48) offset greatest(_offset, 0)
      ) x), '[]')
  )
$$;

revoke all on function public.get_home_stats(), public.get_teacher_filters(),
  public.search_teachers(text, text, text, text, text, text, numeric, text, int, int) from public;
grant execute on function public.get_home_stats(), public.get_teacher_filters(),
  public.search_teachers(text, text, text, text, text, text, numeric, text, int, int) to anon, authenticated;
revoke all on private.public_teachers from public, anon, authenticated;
