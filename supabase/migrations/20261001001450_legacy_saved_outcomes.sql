-- Legacy saved_teachers / match_outcomes reference student_profiles.id / teacher_profiles.id (not auth user ids): map them.
insert into public.saved_teachers (user_id, teacher_id, created_at)
select sp.user_id, tp.user_id, l.created_at
from legacy.saved_teachers l
join public.student_profiles sp on sp.id = l.student_id
join public.teacher_profiles tp on tp.id = l.teacher_id
on conflict do nothing;

insert into public.match_outcomes (student_id, teacher_id, student_answer, teacher_answer, final_status, admin_note, created_at)
select distinct on (sp.user_id, tp.user_id) sp.user_id, tp.user_id, l.student_response, l.teacher_response,
       case when l.admin_decision = 'match' then 'matched' when l.admin_decision = 'no_match' then 'not_matched'
            when l.student_response is not null and l.student_response = l.teacher_response then l.student_response
            when l.student_response is not null and l.teacher_response is not null then 'disputed' else 'open' end,
       case when l.admin_decision is not null then 'old site: admin decided ' || l.admin_decision end,
       l.created_at
from legacy.match_outcomes l
join public.student_profiles sp on sp.id = l.student_id
join public.teacher_profiles tp on tp.id = l.teacher_id
order by sp.user_id, tp.user_id, (l.admin_decision = 'match') desc nulls last, l.updated_at desc
on conflict do nothing;

select private.recalc_teacher_stats(tp.user_id) from public.teacher_profiles tp where tp.user_id in (select teacher_id from public.match_outcomes);
