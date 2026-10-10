-- A deleted teacher account must not block deletion (or leave a dangling match): keep the match, drop the link.
alter table public.smart_match_requests drop constraint smart_match_requests_teacher_1_fkey,
  add constraint smart_match_requests_teacher_1_fkey foreign key (teacher_1) references auth.users (id) on delete set null;
alter table public.smart_match_requests drop constraint smart_match_requests_teacher_2_fkey,
  add constraint smart_match_requests_teacher_2_fkey foreign key (teacher_2) references auth.users (id) on delete set null;
