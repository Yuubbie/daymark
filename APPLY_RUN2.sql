-- =============================================================================
-- Daymark — platform expansion
--   * proprietor / student helpers
--   * subscriptions + payments (N200,000/yr, 30-day trial)
--   * CBT: question banks, questions (objective / multiple_select / subjective /
--     comprehension), exams, share links, attempts, answers, marking + approval
--   * timetable, audience-scoped notices, fee-cleared gate, staff removal
-- =============================================================================

-- =============================================================================
-- 0. NEW ENUM TYPES
-- =============================================================================

do $$ begin
  create type question_type as enum ('objective', 'multiple_select', 'subjective', 'comprehension');
exception when duplicate_object then null; end $$;

do $$ begin
  create type exam_kind as enum ('assessment', 'exam', 'interview');
exception when duplicate_object then null; end $$;

do $$ begin
  create type exam_status as enum ('draft', 'published', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attempt_status as enum ('in_progress', 'submitted', 'marked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type result_status as enum ('in_progress', 'pending_marking', 'awaiting_approval', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type link_kind as enum ('student', 'parent', 'applicant', 'staff');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 0b. COLUMN EXPANSION (must precede helper functions that reference them)
-- =============================================================================

alter table profiles
  add column if not exists student_id uuid references students(id) on delete set null;

alter table students
  add column if not exists fee_cleared boolean not null default true;

alter table parent_student_links
  add column if not exists is_primary boolean not null default false;

-- =============================================================================
-- 1. HELPERS — extend the role model, then add new ones
-- Proprietor is an executive: passes every admin check and sees everything.
-- =============================================================================

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','proprietor') from profiles where id = auth.uid()), false);
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','proprietor','teacher') from profiles where id = auth.uid()), false);
$$;

create or replace function is_proprietor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'proprietor' from profiles where id = auth.uid()), false);
$$;

create or replace function is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'teacher' from profiles where id = auth.uid()), false);
$$;

create or replace function is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'student' from profiles where id = auth.uid()), false);
$$;

-- The students row a student login belongs to (NULL for everyone else).
create or replace function current_student_id()
returns uuid language sql stable security definer set search_path = public as $$
  select student_id from profiles where id = auth.uid();
$$;

-- Has this student's fees been cleared? Drives the "paid parents only" gate.
create or replace function is_fee_cleared(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select fee_cleared from students where id = p_student_id), false);
$$;

-- Is the current family allowed to read results for this student?
-- A linked parent, and the student having fees cleared.
create or replace function parent_may_view_results(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from parent_student_links l
    join students s on s.id = l.student_id
    where l.student_id = p_student_id
      and l.parent_id = auth.uid()
      and s.fee_cleared
  );
$$;

grant execute on function is_proprietor, is_teacher, is_student,
  current_student_id, is_fee_cleared, parent_may_view_results to authenticated;

-- =============================================================================
-- 2. SUBSCRIPTION + PAYMENTS
-- =============================================================================

create table if not exists subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references schools(id) on delete cascade,
  plan               text not null default 'daymark_annual',
  amount_kobo        bigint not null default 20000000,   -- N200,000.00
  currency           text not null default 'NGN',
  interval           text not null default 'year' check (interval in ('month','term','year')),
  status             text not null default 'trial'
                       check (status in ('trial','active','past_due','lapsed','cancelled')),
  trial_ends_at      timestamptz not null default (now() + interval '30 days'),
  current_period_end timestamptz,
  started_at         timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_subscriptions_school on subscriptions (school_id);

create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount_kobo     bigint not null,
  currency        text not null default 'NGN',
  provider        text not null default 'paystack',        -- paystack | flutterwave | transfer
  reference       text unique,
  status          text not null default 'pending'
                    check (status in ('pending','success','failed','refunded')),
  paid_at         timestamptz,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_payments_school on payments (school_id, created_at desc);

-- Start the 30-day trial the moment a school is created.
create or replace function start_school_trial()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (school_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists t_schools_trial on schools;
create trigger t_schools_trial after insert on schools
  for each row execute function start_school_trial();

-- Does the current school have an active (or in-trial) subscription?
create or replace function school_subscription_ok()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select s.status in ('trial','active') and (s.trial_ends_at > now() or s.current_period_end > now())
    from subscriptions s
    where s.school_id = auth_school_id()
    order by s.created_at desc
    limit 1
  ), false);
$$;
grant execute on function school_subscription_ok to authenticated;

-- Record a successful payment + extend the subscription. Called from the
-- payment webhook (service role) or manually by an operator.
create or replace function activate_subscription(
  p_school_id uuid,
  p_reference text,
  p_provider  text default 'paystack',
  p_amount_kobo bigint default 20000000
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sub_id uuid;
  v_period_end timestamptz;
begin
  select id, greatest(now(), coalesce(current_period_end, now())) + interval '1 year'
    into v_sub_id, v_period_end
  from subscriptions
  where school_id = p_school_id
  order by created_at desc
  limit 1;

  if v_sub_id is null then
    insert into subscriptions (school_id) values (p_school_id) returning id into v_sub_id;
    v_period_end := now() + interval '1 year';
  end if;

  update subscriptions
     set status = 'active',
         started_at = coalesce(started_at, now()),
         current_period_end = v_period_end
   where id = v_sub_id;

  insert into payments (school_id, subscription_id, amount_kobo, provider, reference, status, paid_at)
  values (p_school_id, v_sub_id, p_amount_kobo, p_provider, p_reference, 'success', now())
  on conflict (reference) do nothing;

  update schools set subscription_status = 'active' where id = p_school_id;

  return v_sub_id;
end;
$$;
grant execute on function activate_subscription to service_role;

-- =============================================================================
-- 4. CBT — QUESTION BANKS AND QUESTIONS
-- =============================================================================

create table if not exists question_banks (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  title       text not null,
  subject     text not null,
  class_id    uuid references classes(id) on delete set null,
  level       text,
  description text,
  is_archived boolean not null default false,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_question_banks_school on question_banks (school_id, subject);

create table if not exists questions (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  bank_id       uuid references question_banks(id) on delete cascade,
  question_type question_type not null,
  prompt        text not null,
  -- Comprehension: the shared passage. Sub-questions live in children.
  passage       text,
  -- Objective / multiple_select options: [{"id":"a","text":"..."}, ...]
  options       jsonb not null default '[]'::jsonb,
  -- Objective: {"correct":"a"} | multiple_select: {"correct":["a","c"]}
  -- Comprehension: {"children":[{"prompt":"...","options":[...],"correct":"a","marks":1}]}
  answer_key    jsonb,
  marks         numeric(6,2) not null default 1,
  difficulty    text check (difficulty in ('easy','medium','hard')),
  tags          text[] not null default '{}',
  explanation   text,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_questions_bank on questions (bank_id);
create index if not exists idx_questions_school on questions (school_id);

-- =============================================================================
-- 5. CBT — EXAMS, LINKS, ATTEMPTS, ANSWERS
-- =============================================================================

create table if not exists exams (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references schools(id) on delete cascade,
  title            text not null,
  subject          text,
  class_id         uuid references classes(id) on delete set null,
  term_id          uuid references terms(id) on delete set null,
  kind             exam_kind not null default 'assessment',
  status           exam_status not null default 'draft',
  instructions     text,
  duration_minutes int,
  opens_at         timestamptz,
  closes_at        timestamptz,
  shuffle_questions boolean not null default false,
  shuffle_options   boolean not null default false,
  allow_offline    boolean not null default true,
  pass_mark        numeric(6,2),
  created_by       uuid references profiles(id) on delete set null,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_exams_school on exams (school_id, status);
create index if not exists idx_exams_class on exams (class_id);

create table if not exists exam_questions (
  id          uuid primary key default gen_random_uuid(),
  exam_id     uuid not null references exams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  position    int not null default 0,
  marks       numeric(6,2),
  unique (exam_id, question_id)
);
create index if not exists idx_exam_questions_exam on exam_questions (exam_id, position);

-- A shareable link. Same idea as a Google Form link: no account needed to
-- open it. Used for a child on another device, and for staff interviews.
create table if not exists exam_links (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  exam_id     uuid not null references exams(id) on delete cascade,
  kind        link_kind not null default 'student',
  token       text unique not null,
  max_uses    int,
  uses        int not null default 0,
  expires_at  timestamptz,
  is_revoked  boolean not null default false,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_exam_links_exam on exam_links (exam_id);

create table if not exists exam_attempts (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  exam_id         uuid not null references exams(id) on delete cascade,
  student_id      uuid references students(id) on delete set null,
  link_id         uuid references exam_links(id) on delete set null,
  applicant_name  text,
  applicant_email text,
  status          attempt_status not null default 'in_progress',
  result_status   result_status not null default 'in_progress',
  score           numeric(8,2),
  total_marks     numeric(8,2),
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  marked_by       uuid references profiles(id) on delete set null,
  marked_at       timestamptz,
  reviewed_by     uuid references profiles(id) on delete set null,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_attempts_exam on exam_attempts (exam_id);
create index if not exists idx_attempts_student on exam_attempts (student_id);
create index if not exists idx_attempts_result on exam_attempts (school_id, result_status);

create table if not exists exam_answers (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references exam_attempts(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  response      jsonb,                       -- {"choice":"a"} | {"choices":["a","c"]} | {"text":"..."} | {"children":[...]}
  is_correct    boolean,
  marks_awarded numeric(6,2),
  feedback      text,
  marked_by     uuid references profiles(id) on delete set null,
  marked_at     timestamptz,
  unique (attempt_id, question_id)
);
create index if not exists idx_answers_attempt on exam_answers (attempt_id);

-- =============================================================================
-- 6. TIMETABLE
-- =============================================================================

create table if not exists timetable_slots (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  term_id     uuid references terms(id) on delete set null,
  day_of_week int not null check (day_of_week between 1 and 7),   -- 1 = Monday
  period      int not null default 1,
  start_time  time not null,
  end_time    time not null,
  subject     text not null,
  teacher_id  uuid references profiles(id) on delete set null,
  room        text,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists idx_timetable_class on timetable_slots (class_id, day_of_week, period);
create index if not exists idx_timetable_teacher on timetable_slots (teacher_id);

-- =============================================================================
-- 7. NOTICES — audience-scoped announcements
-- =============================================================================

alter table announcements
  add column if not exists audience text not null default 'all'
    check (audience in ('all','staff','teachers','parents','students'));
alter table announcements
  add column if not exists pinned boolean not null default false;
alter table announcements
  add column if not exists expires_at timestamptz;

-- =============================================================================
-- 8. updated_at TRIGGERS FOR NEW TABLES
-- =============================================================================

drop trigger if exists t_subscriptions_updated on subscriptions;
create trigger t_subscriptions_updated before update on subscriptions
  for each row execute function set_updated_at();
drop trigger if exists t_question_banks_updated on question_banks;
create trigger t_question_banks_updated before update on question_banks
  for each row execute function set_updated_at();
drop trigger if exists t_questions_updated on questions;
create trigger t_questions_updated before update on questions
  for each row execute function set_updated_at();
drop trigger if exists t_exams_updated on exams;
create trigger t_exams_updated before update on exams
  for each row execute function set_updated_at();

-- =============================================================================
-- 9. ROW LEVEL SECURITY
-- =============================================================================

alter table subscriptions    enable row level security;
alter table payments         enable row level security;
alter table question_banks   enable row level security;
alter table questions        enable row level security;
alter table exams            enable row level security;
alter table exam_questions   enable row level security;
alter table exam_links       enable row level security;
alter table exam_attempts    enable row level security;
alter table exam_answers     enable row level security;
alter table timetable_slots  enable row level security;

-- ---------- subscriptions / payments ----------
drop policy if exists subscriptions_select on subscriptions;
create policy subscriptions_select on subscriptions for select to authenticated
  using (school_id = auth_school_id());
drop policy if exists subscriptions_write on subscriptions;
create policy subscriptions_write on subscriptions for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

drop policy if exists payments_select on payments;
create policy payments_select on payments for select to authenticated
  using (school_id = auth_school_id() and is_admin());

-- ---------- question_banks ----------
drop policy if exists question_banks_select on question_banks;
create policy question_banks_select on question_banks for select to authenticated
  using (school_id = auth_school_id() and is_staff());
drop policy if exists question_banks_write on question_banks;
create policy question_banks_write on question_banks for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------- questions ----------
drop policy if exists questions_select on questions;
create policy questions_select on questions for select to authenticated
  using (school_id = auth_school_id() and is_staff());
drop policy if exists questions_write on questions;
create policy questions_write on questions for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------- exams ----------
-- Staff read all in their school; students read published exams for their
-- class; parents read published exams for a child's class (fee-cleared).
drop policy if exists exams_select_staff on exams;
create policy exams_select_staff on exams for select to authenticated
  using (school_id = auth_school_id() and is_staff());
drop policy if exists exams_select_student on exams;
create policy exams_select_student on exams for select to authenticated
  using (
    school_id = auth_school_id()
    and status = 'published'
    and class_id = (select class_id from students where id = current_student_id())
  );
drop policy if exists exams_select_parent on exams;
create policy exams_select_parent on exams for select to authenticated
  using (
    school_id = auth_school_id()
    and status = 'published'
    and exists (
      select 1 from parent_student_links l
      join students s on s.id = l.student_id
      where l.parent_id = auth.uid() and s.class_id = exams.class_id and s.fee_cleared
    )
  );
drop policy if exists exams_write_staff on exams;
create policy exams_write_staff on exams for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------- exam_questions ----------
drop policy if exists exam_questions_select_staff on exam_questions;
create policy exam_questions_select_staff on exam_questions for select to authenticated
  using (exists (select 1 from exams e where e.id = exam_id and e.school_id = auth_school_id() and is_staff()));
drop policy if exists exam_questions_write_staff on exam_questions;
create policy exam_questions_write_staff on exam_questions for all to authenticated
  using (exists (select 1 from exams e where e.id = exam_id and e.school_id = auth_school_id() and is_staff()))
  with check (exists (select 1 from exams e where e.id = exam_id and e.school_id = auth_school_id() and is_staff()));
-- Students may read the questions of a published exam for their class (so the
-- client can render offline). Auto-grading still happens server-side.
drop policy if exists exam_questions_select_student on exam_questions;
create policy exam_questions_select_student on exam_questions for select to authenticated
  using (
    current_student_id() is not null
    and exists (
      select 1 from exams e
      join students s on s.id = current_student_id()
      where e.id = exam_id and e.status = 'published' and e.class_id = s.class_id
    )
  );

-- ---------- exam_links ----------
drop policy if exists exam_links_staff on exam_links;
create policy exam_links_staff on exam_links for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------- exam_attempts ----------
drop policy if exists attempts_select_staff on exam_attempts;
create policy attempts_select_staff on exam_attempts for select to authenticated
  using (school_id = auth_school_id() and is_staff());
drop policy if exists attempts_select_student on exam_attempts;
create policy attempts_select_student on exam_attempts for select to authenticated
  using (student_id = current_student_id());
drop policy if exists attempts_select_parent on exam_attempts;
create policy attempts_select_parent on exam_attempts for select to authenticated
  using (
    result_status = 'approved'
    and exists (
      select 1 from parent_student_links l
      where l.parent_id = auth.uid() and l.student_id = exam_attempts.student_id
    )
    and is_fee_cleared(student_id)
  );
drop policy if exists attempts_write_staff on exam_attempts;
create policy attempts_write_staff on exam_attempts for update to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id());

-- ---------- exam_answers ----------
drop policy if exists answers_select_staff on exam_answers;
create policy answers_select_staff on exam_answers for select to authenticated
  using (
    exists (select 1 from exam_attempts a where a.id = attempt_id
            and a.school_id = auth_school_id() and is_staff())
  );
drop policy if exists answers_write_staff on exam_answers;
create policy answers_write_staff on exam_answers for all to authenticated
  using (
    exists (select 1 from exam_attempts a where a.id = attempt_id
            and a.school_id = auth_school_id() and is_staff())
  )
  with check (
    exists (select 1 from exam_attempts a where a.id = attempt_id
            and a.school_id = auth_school_id() and is_staff())
  );
drop policy if exists answers_select_student on exam_answers;
create policy answers_select_student on exam_answers for select to authenticated
  using (exists (select 1 from exam_attempts a where a.id = attempt_id
                 and a.student_id = current_student_id()));

-- ---------- timetable ----------
drop policy if exists timetable_select on timetable_slots;
create policy timetable_select on timetable_slots for select to authenticated
  using (
    school_id = auth_school_id()
    and (
      is_staff()
      or class_id = (select class_id from students where id = current_student_id())
      or class_id in (select parent_class_ids())
    )
  );
drop policy if exists timetable_write_staff on timetable_slots;
create policy timetable_write_staff on timetable_slots for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------- students: student sees self ----------
drop policy if exists students_select_self on students;
create policy students_select_self on students for select to authenticated
  using (id = current_student_id());

-- ---------- announcements: replace select with audience-aware version --------
drop policy if exists announcements_select on announcements;
create policy announcements_select on announcements for select to authenticated
  using (
    school_id = auth_school_id()
    and (expires_at is null or expires_at > now())
    and (
      is_staff()
      or (class_id is null and audience in ('all','parents','students'))
        and (
          case audience
            when 'students' then is_student()
            when 'parents'  then exists (select 1 from parent_student_links where parent_id = auth.uid())
            else true
          end
        )
      or class_id in (select parent_class_ids())
      or class_id = (select class_id from students where id = current_student_id())
    )
  );

-- =============================================================================
-- 10. RPCs — LINKED CBT (no-account attempts) AND GRADING
-- =============================================================================

-- Staff mint a shareable link for an exam.
create or replace function generate_exam_link(
  p_exam_id uuid,
  p_kind link_kind default 'student',
  p_max_uses int default null,
  p_expires_at timestamptz default (now() + interval '14 days')
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_token text;
begin
  if not is_staff() then
    raise exception 'only staff can generate exam links';
  end if;

  select school_id into v_school_id from exams where id = p_exam_id;
  if v_school_id is null or v_school_id <> auth_school_id() then
    raise exception 'exam not found in your school';
  end if;

  loop
    v_token := lower(translate(
      substr(encode(gen_random_bytes(12), 'base64'), 1, 12), '+/=OoIl01', 'abcdefghjk'
    ));
    exit when not exists (select 1 from exam_links where token = v_token);
  end loop;

  insert into exam_links (school_id, exam_id, kind, token, max_uses, expires_at, created_by)
  values (v_school_id, p_exam_id, p_kind, v_token, p_max_uses, p_expires_at, auth.uid());

  return v_token;
end;
$$;

-- Open an attempt from a link. Works for anonymous callers (a child on a
-- borrowed device, a job applicant) and for logged-in students alike.
create or replace function start_linked_attempt(
  p_token text,
  p_applicant_name text default null,
  p_applicant_email text default null,
  p_student_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_link exam_links%rowtype;
  v_exam exams%rowtype;
  v_attempt_id uuid;
  v_student uuid;
begin
  select * into v_link from exam_links
   where token = lower(trim(p_token))
     and not is_revoked
     and (expires_at is null or expires_at > now())
     and (max_uses is null or uses < max_uses);

  if not found then
    raise exception 'this exam link is invalid, expired, or has been used up';
  end if;

  select * into v_exam from exams where id = v_link.exam_id;
  if v_exam.status <> 'published' then
    raise exception 'this exam is not open';
  end if;
  if v_exam.opens_at is not null and v_exam.opens_at > now() then
    raise exception 'this exam has not opened yet';
  end if;
  if v_exam.closes_at is not null and v_exam.closes_at < now() then
    raise exception 'this exam has closed';
  end if;

  -- Prefer an identified student: explicit argument, else the logged-in one.
  v_student := coalesce(p_student_id, current_student_id());

  insert into exam_attempts (school_id, exam_id, student_id, link_id,
                             applicant_name, applicant_email)
  values (v_link.school_id, v_link.exam_id, v_student, v_link.id,
          p_applicant_name, p_applicant_email)
  returning id into v_attempt_id;

  update exam_links set uses = uses + 1 where id = v_link.id;

  return v_attempt_id;
end;
$$;

-- Auto-grade one answer. Returns (correct, marks). Handles all four types;
-- subjective (and un-keyed comprehension children) come back NULL = manual.
create or replace function autograde_answer(p_question questions, p_response jsonb)
returns table (is_correct boolean, marks numeric)
language plpgsql immutable as $$
declare
  v_total numeric := 0;
  v_all_correct boolean := true;
  v_any_auto boolean := false;
  v_correct text;
  v_multi text[];
  v_picked text[];
  v_child jsonb;
  v_child_correct text;
  v_child_pick text;
  v_hit int;
  v_wrong int;
begin
  if p_response is null then
    return query select false, 0::numeric;
    return;
  end if;

  if p_question.question_type = 'objective' then
    v_correct := p_question.answer_key->>'correct';
    if v_correct is null then
      return query select null::boolean, null::numeric;   -- manual
      return;
    end if;
    return query select (p_response->>'choice' = v_correct),
      case when p_response->>'choice' = v_correct then p_question.marks else 0 end;
    return;

  elsif p_question.question_type = 'multiple_select' then
    select array_agg(value) into v_multi
      from jsonb_array_elements_text(coalesce(p_question.answer_key->'correct','[]'::jsonb));
    if v_multi is null or array_length(v_multi, 1) is null then
      return query select null::boolean, null::numeric;
      return;
    end if;
    select array_agg(value) into v_picked
      from jsonb_array_elements_text(coalesce(p_response->'choices','[]'::jsonb));
    v_picked := coalesce(v_picked, '{}');
    -- Partial credit: (hits - wrong) / total correct, floored at 0.
    select count(*) into v_hit from unnest(v_picked) x where x = any(v_multi);
    select count(*) into v_wrong from unnest(v_picked) x where not (x = any(v_multi));
    return query select (v_hit = array_length(v_multi,1) and v_wrong = 0),
      greatest(0, least(p_question.marks, p_question.marks * (v_hit - v_wrong)::numeric / array_length(v_multi,1)));
    return;

  elsif p_question.question_type = 'comprehension' then
    v_total := 0;
    for v_child in select * from jsonb_array_elements(coalesce(p_question.answer_key->'children','[]'::jsonb))
    loop
      v_child_correct := v_child->>'correct';
      v_child_pick := p_response ->> ('child_' || coalesce(v_child->>'id',''));
      -- Children may be answered as {"child_<id>":"a"} or one array.
      if v_child_pick is null and jsonb_typeof(p_response->'children') = 'array' then
        v_child_pick := p_response->'children'->(coalesce((v_child->>'index')::int,0));
      end if;
      if v_child_correct is null then
        v_all_correct := false;                          -- manual child
      else
        v_any_auto := true;
        if v_child_pick = v_child_correct then
          v_total := v_total + coalesce((v_child->>'marks')::numeric, 0);
        else
          v_all_correct := false;
        end if;
      end if;
    end loop;
    if not v_any_auto then
      return query select null::boolean, null::numeric;
    else
      return query select v_all_correct, v_total;
    end if;
    return;
  end if;

  -- subjective
  return query select null::boolean, p_question.marks;   -- to be marked by a human
end;
$$;

-- Submit an attempt: grade what can be graded, queue the rest for a teacher.
create or replace function submit_linked_attempt(p_attempt_id uuid, p_answers jsonb)
returns table (score numeric, total numeric, result_status result_status)
language plpgsql security definer set search_path = public as $$
declare
  v_attempt exam_attempts%rowtype;
  v_exam exams%rowtype;
  v_rec record;
  v_q questions%rowtype;
  v_res record;
  v_total numeric := 0;
  v_score numeric := 0;
  v_has_manual boolean := false;
begin
  select * into v_attempt from exam_attempts where id = p_attempt_id;
  if not found then
    raise exception 'attempt not found';
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'this attempt was already submitted';
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  -- Snapshot the total marks for this exam.
  select coalesce(sum(coalesce(eq.marks, q.marks)), 0) into v_total
    from exam_questions eq join questions q on q.id = eq.question_id
   where eq.exam_id = v_exam.id;

  for v_rec in
    select eq.question_id
      from exam_questions eq
     where eq.exam_id = v_exam.id
  loop
    select q.* into v_q from questions q where q.id = v_rec.question_id;
    select * into v_res
      from autograde_answer(v_q, p_answers->(v_rec.question_id::text));

    if v_res.is_correct is null then
      v_has_manual := true;
    else
      v_score := v_score + coalesce(v_res.marks, 0);
    end if;

    insert into exam_answers (attempt_id, question_id, response, is_correct, marks_awarded)
    values (p_attempt_id, v_rec.question_id, p_answers->(v_rec.question_id::text),
            v_res.is_correct, v_res.marks)
    on conflict (attempt_id, question_id) do update
      set response = excluded.response,
          is_correct = excluded.is_correct,
          marks_awarded = excluded.marks_awarded;
  end loop;

  update exam_attempts
     set status = (case when v_has_manual then 'submitted' else 'marked' end)::attempt_status,
         result_status = (case when v_has_manual then 'pending_marking' else 'awaiting_approval' end)::result_status,
         score = v_score,
         total_marks = v_total,
         submitted_at = now()
   where id = p_attempt_id;

  return query select v_score, v_total,
    (case when v_has_manual then 'pending_marking' else 'awaiting_approval' end)::result_status;
end;
$$;

-- Teacher (or admin) marks / re-marks a single answer.
create or replace function mark_exam_answer(
  p_answer_id uuid,
  p_marks numeric,
  p_feedback text default null,
  p_is_correct boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_attempt_id uuid;
begin
  if not is_staff() then raise exception 'only staff can mark answers'; end if;

  select a.school_id, ans.attempt_id into v_school_id, v_attempt_id
    from exam_answers ans join exam_attempts a on a.id = ans.attempt_id
   where ans.id = p_answer_id;

  if v_school_id is null or v_school_id <> auth_school_id() then
    raise exception 'answer not found in your school';
  end if;

  update exam_answers
     set marks_awarded = p_marks,
         feedback = p_feedback,
         is_correct = coalesce(p_is_correct, p_marks > 0),
         marked_by = auth.uid(),
         marked_at = now()
   where id = p_answer_id;

  -- Recompute the attempt total from marked answers.
  update exam_attempts a
     set score = coalesce((select sum(marks_awarded) from exam_answers where attempt_id = v_attempt_id), 0),
         marked_by = auth.uid(),
         marked_at = now(),
         status = 'marked',
         result_status = 'awaiting_approval'::result_status
   where a.id = v_attempt_id;
end;
$$;

-- Correct a wrong answer key on the question itself, then re-grade everyone.
create or replace function update_question_answer_key(p_question_id uuid, p_answer_key jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'only staff can correct answer keys'; end if;
  if (select school_id from questions where id = p_question_id) <> auth_school_id() then
    raise exception 'question not found in your school';
  end if;

  update questions set answer_key = p_answer_key where id = p_question_id;
end;
$$;

-- Proprietor/admin approves or rejects a submitted result before parents see it.
create or replace function set_result_status(
  p_attempt_id uuid,
  p_status result_status,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'only an administrator or proprietor can approve results'; end if;
  if p_status not in ('approved','rejected','awaiting_approval') then
    raise exception 'invalid review status';
  end if;
  if (select school_id from exam_attempts where id = p_attempt_id) <> auth_school_id() then
    raise exception 'attempt not found in your school';
  end if;

  update exam_attempts
     set result_status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = p_note
   where id = p_attempt_id;
end;
$$;

-- Admin releases/publishes an exam (and can close it).
create or replace function set_exam_status(p_exam_id uuid, p_status exam_status)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'only staff can change exam status'; end if;
  if (select school_id from exams where id = p_exam_id) <> auth_school_id() then
    raise exception 'exam not found in your school';
  end if;

  update exams
     set status = p_status,
         published_at = case when p_status = 'published' then now() else published_at end
   where id = p_exam_id;
end;
$$;

-- =============================================================================
-- 11. RPCs — SCHOOL OVERSIGHT (fees, staff removal)
-- =============================================================================

create or replace function set_student_fee_cleared(p_student_id uuid, p_cleared boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'only an administrator or proprietor can change fee status'; end if;
  if (select school_id from students where id = p_student_id) <> auth_school_id() then
    raise exception 'student not found in your school';
  end if;
  update students set fee_cleared = p_cleared where id = p_student_id;
end;
$$;

-- Remove a teacher (or any member) who has left the school. Soft delete:
-- keeps history, revokes access. Guards against self- and proprietor-removal.
create or replace function remove_school_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_target profiles%rowtype;
begin
  if not is_admin() then raise exception 'only an administrator or proprietor can remove staff'; end if;

  select * into v_target from profiles where id = p_profile_id;
  if not found or v_target.school_id <> auth_school_id() then
    raise exception 'member not found in your school';
  end if;
  if v_target.id = auth.uid() then
    raise exception 'you cannot remove your own account';
  end if;
  if v_target.role = 'proprietor' then
    raise exception 'a proprietor account cannot be removed';
  end if;

  update profiles set is_active = false where id = p_profile_id;
  delete from class_teachers where teacher_id = p_profile_id;
end;
$$;

create or replace function reactivate_school_member(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'only an administrator or proprietor can reactivate staff'; end if;
  if (select school_id from profiles where id = p_profile_id) <> auth_school_id() then
    raise exception 'member not found in your school';
  end if;
  update profiles set is_active = true where id = p_profile_id;
end;
$$;

grant execute on function generate_exam_link, start_linked_attempt,
  submit_linked_attempt, mark_exam_answer, update_question_answer_key,
  set_result_status, set_exam_status, set_student_fee_cleared,
  remove_school_member, reactivate_school_member to authenticated;

-- Anonymous share-link attempts do not require an account.
grant execute on function start_linked_attempt, submit_linked_attempt to anon;

-- =============================================================================
-- 12. VIEWS
-- =============================================================================

create or replace view upcoming_birthdays
with (security_invoker = true) as
select
  s.id as student_id,
  s.school_id,
  s.class_id,
  c.name as class_name,
  s.first_name,
  s.last_name,
  s.date_of_birth,
  (s.date_of_birth + (extract(year from current_date)::int
                      - extract(year from s.date_of_birth)::int) * interval '1 year')::date as this_year_birthday,
  extract(day from s.date_of_birth)::int as birthday_day,
  extract(month from s.date_of_birth)::int as birthday_month
from students s
left join classes c on c.id = s.class_id
where s.is_active
  and s.date_of_birth is not null
  and (s.date_of_birth + (extract(year from current_date)::int
                          - extract(year from s.date_of_birth)::int) * interval '1 year')::date
      between current_date and current_date + interval '30 days';

grant select on upcoming_birthdays to authenticated;
-- =============================================================================
-- Daymark — exam paper RPC, student attempts, proprietor bootstrap
-- Answer keys never leave the server. Anonymous share-links work.
-- =============================================================================

-- School creator is the proprietor (executive), not a day-to-day admin.
create or replace function create_school_and_admin(p_school_name text, p_full_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if (select school_id from profiles where id = auth.uid()) is not null then
    raise exception 'user already belongs to a school';
  end if;

  v_slug := regexp_replace(lower(trim(p_school_name)), '[^a-z0-9]+', '-', 'g')
            || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into schools (name, slug) values (p_school_name, v_slug)
  returning id into v_school_id;

  update profiles
     set school_id = v_school_id,
         role = 'proprietor',
         full_name = coalesce(p_full_name, full_name)
   where id = auth.uid();

  return v_school_id;
end;
$$;

-- Strip the answer key from a question, keeping comprehension children prompts.
create or replace function question_public(q questions, p_marks numeric)
returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'id', q.id,
    'question_type', q.question_type,
    'prompt', q.prompt,
    'passage', q.passage,
    'options', q.options,
    'marks', coalesce(p_marks, q.marks),
    'children', case
      when q.question_type = 'comprehension' then (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', c->>'id',
            'prompt', c->>'prompt',
            'options', c->'options',
            'marks', coalesce((c->>'marks')::numeric, 1)
          )
        ), '[]'::jsonb)
        from jsonb_array_elements(coalesce(q.answer_key->'children', '[]'::jsonb)) c
      )
      else null
    end
  );
$$;

-- Public exam paper for a share-link. No account needed. No answer keys.
create or replace function exam_paper(p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_link exam_links%rowtype;
  v_exam exams%rowtype;
  v_questions jsonb;
begin
  select * into v_link from exam_links
   where token = lower(trim(p_token))
     and not is_revoked
     and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'this exam link is invalid or expired';
  end if;

  select * into v_exam from exams where id = v_link.exam_id;
  if v_exam.status <> 'published' then
    raise exception 'this exam is not open';
  end if;
  if v_exam.opens_at is not null and v_exam.opens_at > now() then
    raise exception 'this exam has not opened yet';
  end if;
  if v_exam.closes_at is not null and v_exam.closes_at < now() then
    raise exception 'this exam has closed';
  end if;

  select coalesce(jsonb_agg(question_public(q, eq.marks) order by eq.position), '[]'::jsonb)
    into v_questions
  from exam_questions eq
  join questions q on q.id = eq.question_id
  where eq.exam_id = v_exam.id;

  return jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'title', v_exam.title,
      'subject', v_exam.subject,
      'kind', v_exam.kind,
      'instructions', v_exam.instructions,
      'duration_minutes', v_exam.duration_minutes,
      'opens_at', v_exam.opens_at,
      'closes_at', v_exam.closes_at,
      'shuffle_questions', v_exam.shuffle_questions,
      'shuffle_options', v_exam.shuffle_options,
      'allow_offline', v_exam.allow_offline
    ),
    'questions', v_questions,
    'link_kind', v_link.kind,
    'token', v_link.token
  );
end;
$$;

-- Logged-in student (or staff preview) fetches a published exam without keys.
create or replace function exam_paper_for_id(p_exam_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_exam exams%rowtype;
  v_questions jsonb;
  v_ok boolean := false;
begin
  select * into v_exam from exams where id = p_exam_id;
  if not found then raise exception 'exam not found'; end if;

  if is_staff() and v_exam.school_id = auth_school_id() then
    v_ok := true;
  elsif current_student_id() is not null
        and v_exam.status = 'published'
        and v_exam.class_id = (select class_id from students where id = current_student_id()) then
    v_ok := true;
  end if;

  if not v_ok then
    raise exception 'you cannot sit this exam';
  end if;

  select coalesce(jsonb_agg(question_public(q, eq.marks) order by eq.position), '[]'::jsonb)
    into v_questions
  from exam_questions eq
  join questions q on q.id = eq.question_id
  where eq.exam_id = v_exam.id;

  return jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'title', v_exam.title,
      'subject', v_exam.subject,
      'kind', v_exam.kind,
      'instructions', v_exam.instructions,
      'duration_minutes', v_exam.duration_minutes,
      'opens_at', v_exam.opens_at,
      'closes_at', v_exam.closes_at,
      'shuffle_questions', v_exam.shuffle_questions,
      'shuffle_options', v_exam.shuffle_options,
      'allow_offline', v_exam.allow_offline
    ),
    'questions', v_questions
  );
end;
$$;

-- Logged-in student starts an attempt against a published exam.
create or replace function start_student_attempt(p_exam_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_exam exams%rowtype;
  v_student uuid;
  v_attempt_id uuid;
begin
  v_student := current_student_id();
  if v_student is null then
    raise exception 'only a student account can sit this exam from here; use a share link otherwise';
  end if;

  select * into v_exam from exams where id = p_exam_id;
  if not found or v_exam.status <> 'published' then
    raise exception 'this exam is not open';
  end if;
  if v_exam.class_id is distinct from (select class_id from students where id = v_student) then
    raise exception 'this exam is not for your class';
  end if;
  if v_exam.opens_at is not null and v_exam.opens_at > now() then
    raise exception 'this exam has not opened yet';
  end if;
  if v_exam.closes_at is not null and v_exam.closes_at < now() then
    raise exception 'this exam has closed';
  end if;

  insert into exam_attempts (school_id, exam_id, student_id)
  values (v_exam.school_id, v_exam.id, v_student)
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;

grant execute on function exam_paper to anon, authenticated;
grant execute on function exam_paper_for_id, start_student_attempt, question_public to authenticated;
grant execute on function create_school_and_admin to authenticated;
-- =============================================================================
-- Daymark — student logins via invite, so a child has their own account.
-- =============================================================================

alter table invites
  add column if not exists student_id uuid references students(id) on delete set null;

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite
  from invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if found then
    insert into profiles (id, school_id, role, full_name, email, student_id)
    values (new.id, v_invite.school_id, v_invite.role,
            coalesce(new.raw_user_meta_data->>'full_name', v_invite.full_name),
            new.email, v_invite.student_id);
    update invites set accepted_at = now() where id = v_invite.id;
  else
    insert into profiles (id, school_id, role, full_name, email)
    values (new.id, null, 'parent',
            new.raw_user_meta_data->>'full_name', new.email);
  end if;

  return new;
end;
$$;

-- Admin/proprietor invites a student to log in with their own email.
create or replace function invite_student_login(p_student_id uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_student students%rowtype;
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can invite a student login';
  end if;

  select * into v_student from students where id = p_student_id;
  if not found or v_student.school_id <> auth_school_id() then
    raise exception 'student not found in your school';
  end if;

  insert into invites (school_id, email, role, full_name, student_id, created_by)
  values (
    v_student.school_id,
    lower(trim(p_email)),
    'student',
    trim(v_student.first_name || ' ' || v_student.last_name),
    v_student.id,
    auth.uid()
  )
  on conflict (school_id, email) do update
    set role = 'student',
        student_id = excluded.student_id,
        full_name = excluded.full_name,
        accepted_at = null,
        expires_at = now() + interval '30 days'
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function invite_student_login to authenticated;
