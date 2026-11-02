-- Daymaark — paper marks (offline exams) and statement reports (Nursery / EYFS).
-- Safe to re-run. Paste as APPLY_RUN24.sql after Run 23.

-- ---------- class report format ----------
alter table classes
  add column if not exists report_kind text;

update classes
   set report_kind = 'numeric'
 where report_kind is null;

update classes
   set report_kind = 'statement'
 where coalesce(report_kind, 'numeric') is distinct from 'statement'
   and (
     name ~* '(nursery|eyfs|reception|creche|crèche|playgroup|kindergarten|early year|\bkg\b)'
     or coalesce(level, '') ~* '(nursery|eyfs|reception|creche|crèche|playgroup|kindergarten|early year|\bkg\b)'
   );

alter table classes
  alter column report_kind set default 'numeric';

alter table classes
  drop constraint if exists classes_report_kind_check;
alter table classes
  add constraint classes_report_kind_check
  check (report_kind in ('numeric', 'statement'));

-- ---------- paper marks (typed scores, no CBT sit) ----------
create table if not exists paper_marks (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  student_id   uuid not null references students(id) on delete cascade,
  class_id     uuid references classes(id) on delete set null,
  term_id      uuid references terms(id) on delete cascade,
  subject      text not null,
  title        text not null,
  kind         text not null default 'exam',
  score        numeric(8,2),
  total        numeric(8,2) not null,
  recorded_by  uuid references profiles(id),
  recorded_at  timestamptz not null default now(),
  unique (student_id, term_id, subject, title)
);

alter table paper_marks
  drop constraint if exists paper_marks_kind_check;
alter table paper_marks
  add constraint paper_marks_kind_check
  check (kind in ('assessment', 'exam'));

create index if not exists paper_marks_class_term on paper_marks (class_id, term_id);
create index if not exists paper_marks_student_term on paper_marks (student_id, term_id);

alter table paper_marks enable row level security;

drop policy if exists paper_marks_select on paper_marks;
create policy paper_marks_select on paper_marks for select to authenticated
  using (
    school_id = auth_school_id()
    and (
      is_staff()
      or student_id = current_student_id()
      or parent_may_view_results(student_id)
    )
  );

drop policy if exists paper_marks_write on paper_marks;
create policy paper_marks_write on paper_marks for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------- statement goals (school template) ----------
create table if not exists statement_goals (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  area       text not null,
  goal       text not null,
  position   int not null default 0,
  unique (school_id, area, goal)
);

alter table statement_goals enable row level security;

drop policy if exists statement_goals_select on statement_goals;
create policy statement_goals_select on statement_goals for select to authenticated
  using (school_id = auth_school_id());

drop policy if exists statement_goals_write on statement_goals;
create policy statement_goals_write on statement_goals for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

-- ---------- per-student statements ----------
create table if not exists report_statements (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  student_id   uuid not null references students(id) on delete cascade,
  term_id      uuid not null references terms(id) on delete cascade,
  area         text not null,
  goal         text not null,
  comment      text,
  level        text,
  position     int not null default 0,
  updated_by   uuid references profiles(id),
  updated_at   timestamptz not null default now(),
  unique (student_id, term_id, area, goal)
);

alter table report_statements
  drop constraint if exists report_statements_level_check;
alter table report_statements
  add constraint report_statements_level_check
  check (level is null or level in ('emerging', 'expected', 'exceeding'));

create index if not exists report_statements_student_term on report_statements (student_id, term_id);

alter table report_statements enable row level security;

drop policy if exists report_statements_select on report_statements;
create policy report_statements_select on report_statements for select to authenticated
  using (
    school_id = auth_school_id()
    and (
      is_staff()
      or student_id = current_student_id()
      or parent_may_view_results(student_id)
    )
  );

drop policy if exists report_statements_write on report_statements;
create policy report_statements_write on report_statements for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

-- ---------- seed EYFS / Nursery goals ----------
create or replace function seed_statement_goals(p_school_id uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
begin
  v_school := coalesce(p_school_id, auth_school_id());
  if v_school is null then
    raise exception 'no school';
  end if;
  if exists (select 1 from statement_goals where school_id = v_school) then
    return;
  end if;
  insert into statement_goals (school_id, area, goal, position) values
    (v_school, 'Communication & Language', 'Fluency', 10),
    (v_school, 'Communication & Language', 'Understanding', 20),
    (v_school, 'Communication & Language', 'Speaking', 30),
    (v_school, 'Literacy', 'Writing', 40),
    (v_school, 'Literacy', 'Reading', 50),
    (v_school, 'Mathematics', 'Numbering & Counting', 60),
    (v_school, 'Mathematics', 'Sorting', 70),
    (v_school, 'Mathematics', 'Shapes & Positioning', 80),
    (v_school, 'Mathematics', 'Reasoning', 90),
    (v_school, 'Understanding the World', 'The World', 100),
    (v_school, 'Understanding the World', 'The animals in the world', 110),
    (v_school, 'Understanding the World', 'The community', 120),
    (v_school, 'Personal, Social and Emotional Development', 'All About me', 130),
    (v_school, 'Personal, Social and Emotional Development', 'My community', 140),
    (v_school, 'Personal, Social and Emotional Development', 'Rules & roles', 150),
    (v_school, 'Expressive Arts and Design', 'Skim & sketch', 160),
    (v_school, 'Expressive Arts and Design', 'Artistry', 170);
end;
$$;

grant execute on function seed_statement_goals(uuid) to authenticated;

create or replace function list_statement_goals()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  v_school := auth_school_id();
  if v_school is null then
    raise exception 'no school';
  end if;
  perform seed_statement_goals(v_school);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id,
      'area', g.area,
      'goal', g.goal,
      'position', g.position
    ) order by g.position, g.area, g.goal)
    from statement_goals g
    where g.school_id = v_school
  ), '[]'::jsonb);
end;
$$;

grant execute on function list_statement_goals() to authenticated;

-- ---------- save / list paper marks ----------
create or replace function save_paper_mark(
  p_student_id uuid,
  p_subject text,
  p_title text,
  p_kind text default 'exam',
  p_score numeric default null,
  p_total numeric default 100
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_student students%rowtype;
  v_term terms%rowtype;
  v_kind text;
  v_id uuid;
begin
  if auth.uid() is null or not is_staff() then
    raise exception 'forbidden';
  end if;
  select * into v_student from students where id = p_student_id and is_active;
  if not found or v_student.school_id is distinct from auth_school_id() then
    raise exception 'student not found';
  end if;
  select * into v_term from terms where school_id = v_student.school_id and is_current limit 1;
  if not found then
    raise exception 'set the current term first';
  end if;
  v_kind := case when p_kind = 'assessment' then 'assessment' else 'exam' end;
  if p_score is null then
    delete from paper_marks
     where student_id = p_student_id
       and term_id = v_term.id
       and lower(btrim(subject)) = lower(btrim(p_subject))
       and lower(btrim(title)) = lower(btrim(p_title));
    return null;
  end if;
  if p_total is null or p_total <= 0 then
    raise exception 'total marks must be greater than zero';
  end if;
  if p_score < 0 or p_score > p_total then
    raise exception 'score must sit between 0 and the paper total';
  end if;
  insert into paper_marks (
    school_id, student_id, class_id, term_id, subject, title, kind, score, total, recorded_by, recorded_at
  ) values (
    v_student.school_id,
    p_student_id,
    v_student.class_id,
    v_term.id,
    btrim(p_subject),
    btrim(p_title),
    v_kind,
    p_score,
    p_total,
    auth.uid(),
    now()
  )
  on conflict (student_id, term_id, subject, title) do update
    set score = excluded.score,
        total = excluded.total,
        kind = excluded.kind,
        class_id = excluded.class_id,
        recorded_by = excluded.recorded_by,
        recorded_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function save_paper_mark(uuid, text, text, text, numeric, numeric) to authenticated;

create or replace function list_paper_marks(p_class_id uuid, p_subject text default null, p_title text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_term uuid;
begin
  if auth.uid() is null or not is_staff() then
    raise exception 'forbidden';
  end if;
  select id into v_term from terms where school_id = auth_school_id() and is_current limit 1;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'student_id', m.student_id,
      'subject', m.subject,
      'title', m.title,
      'kind', m.kind,
      'score', m.score,
      'total', m.total
    ) order by m.subject, m.title)
    from paper_marks m
    where m.school_id = auth_school_id()
      and m.class_id = p_class_id
      and (v_term is null or m.term_id = v_term)
      and (p_subject is null or lower(btrim(m.subject)) = lower(btrim(p_subject)))
      and (p_title is null or lower(btrim(m.title)) = lower(btrim(p_title)))
  ), '[]'::jsonb);
end;
$$;

grant execute on function list_paper_marks(uuid, text, text) to authenticated;

-- ---------- save / list statements ----------
create or replace function save_report_statement(
  p_student_id uuid,
  p_area text,
  p_goal text,
  p_comment text default null,
  p_level text default null,
  p_position int default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_student students%rowtype;
  v_term terms%rowtype;
  v_level text;
  v_id uuid;
begin
  if auth.uid() is null or not is_staff() then
    raise exception 'forbidden';
  end if;
  select * into v_student from students where id = p_student_id and is_active;
  if not found or v_student.school_id is distinct from auth_school_id() then
    raise exception 'student not found';
  end if;
  select * into v_term from terms where school_id = v_student.school_id and is_current limit 1;
  if not found then
    raise exception 'set the current term first';
  end if;
  v_level := case p_level
    when 'emerging' then 'emerging'
    when 'expected' then 'expected'
    when 'exceeding' then 'exceeding'
    else null
  end;
  if coalesce(nullif(btrim(p_comment), ''), '') = '' and v_level is null then
    delete from report_statements
     where student_id = p_student_id
       and term_id = v_term.id
       and area = btrim(p_area)
       and goal = btrim(p_goal);
    return null;
  end if;
  insert into report_statements (
    school_id, student_id, term_id, area, goal, comment, level, position, updated_by, updated_at
  ) values (
    v_student.school_id,
    p_student_id,
    v_term.id,
    btrim(p_area),
    btrim(p_goal),
    nullif(btrim(p_comment), ''),
    v_level,
    p_position,
    auth.uid(),
    now()
  )
  on conflict (student_id, term_id, area, goal) do update
    set comment = excluded.comment,
        level = excluded.level,
        position = excluded.position,
        updated_by = excluded.updated_by,
        updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function save_report_statement(uuid, text, text, text, text, int) to authenticated;

create or replace function list_report_statements(p_student_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_term uuid;
  v_student students%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v_student from students where id = p_student_id;
  if not found or v_student.school_id is distinct from auth_school_id() then
    raise exception 'student not found';
  end if;
  if not (
    is_staff()
    or current_student_id() = p_student_id
    or parent_may_view_results(p_student_id)
  ) then
    raise exception 'forbidden';
  end if;
  select id into v_term from terms where school_id = v_student.school_id and is_current limit 1;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'area', s.area,
      'goal', s.goal,
      'comment', s.comment,
      'level', s.level,
      'position', s.position
    ) order by s.position, s.area, s.goal)
    from report_statements s
    where s.student_id = p_student_id
      and (v_term is null or s.term_id = v_term)
  ), '[]'::jsonb);
end;
$$;

grant execute on function list_report_statements(uuid) to authenticated;

-- ---------- term report includes paper marks + statements ----------
create or replace function student_term_report(p_student_id uuid, p_term_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_student students%rowtype;
  v_term terms%rowtype;
  v_class classes%rowtype;
  v_school schools%rowtype;
  v_ok boolean := false;
  v_days int := 0;
  v_present int := 0;
  v_late int := 0;
  v_absent int := 0;
  v_excused int := 0;
  v_marks jsonb := '[]'::jsonb;
  v_subjects jsonb := '[]'::jsonb;
  v_statements jsonb := '[]'::jsonb;
  v_class_comment text;
  v_principal_comment text;
  v_kind text := 'numeric';
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_student from students where id = p_student_id and is_active;
  if not found then
    raise exception 'student not found';
  end if;

  if is_staff() and v_student.school_id = auth_school_id() then
    v_ok := true;
  elsif current_student_id() is not null and current_student_id() = p_student_id then
    v_ok := true;
  elsif parent_may_view_results(p_student_id) then
    v_ok := true;
  end if;

  if not v_ok then
    if exists (
      select 1 from parent_student_links
       where parent_id = auth.uid() and student_id = p_student_id
    ) and not is_fee_cleared(p_student_id) then
      raise exception 'fees are outstanding; the report stays locked until the school marks this child as cleared';
    end if;
    raise exception 'you cannot open this report';
  end if;

  select * into v_school from schools where id = v_student.school_id;
  if v_student.class_id is not null then
    select * into v_class from classes where id = v_student.class_id;
  end if;
  v_kind := coalesce(v_class.report_kind, 'numeric');

  if p_term_id is not null then
    select * into v_term
      from terms
     where id = p_term_id and school_id = v_student.school_id;
  else
    select * into v_term
      from terms
     where school_id = v_student.school_id and is_current
     limit 1;
  end if;

  select
    count(*)::int,
    count(*) filter (where status = 'present')::int,
    count(*) filter (where status = 'late')::int,
    count(*) filter (where status = 'absent')::int,
    count(*) filter (where status = 'excused')::int,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', a.date,
          'status', a.status,
          'note', nullif(btrim(a.note), '')
        )
        order by a.date
      ),
      '[]'::jsonb
    )
    into v_days, v_present, v_late, v_absent, v_excused, v_marks
  from attendance a
  where a.student_id = p_student_id
    and (
      v_term.id is null
      or (a.date >= v_term.start_date and a.date <= v_term.end_date)
    );

  if v_kind = 'numeric' then
    select coalesce(jsonb_agg(subj order by subject), '[]'::jsonb)
      into v_subjects
    from (
      select
        subject,
        jsonb_build_object(
          'subject', subject,
          'average', round(avg(pct)::numeric, 1),
          'papers', jsonb_agg(paper order by kind, title)
        ) as subj
      from (
        select
          coalesce(nullif(trim(e.subject), ''), 'Unassigned') as subject,
          e.kind::text as kind,
          e.title,
          case
            when att.total_marks is not null and att.total_marks > 0
              then (att.score / att.total_marks) * 100
            else null
          end as pct,
          jsonb_build_object(
            'exam_id', e.id,
            'title', e.title,
            'kind', e.kind,
            'score', att.score,
            'total', att.total_marks,
            'percent', case
              when att.total_marks is not null and att.total_marks > 0
                then round((att.score / att.total_marks) * 100, 1)
              else null
            end,
            'submitted_at', att.submitted_at,
            'source', 'cbt'
          ) as paper
        from exam_attempts att
        join exams e on e.id = att.exam_id
        where att.student_id = p_student_id
          and att.result_status = 'approved'
          and (
            v_term.id is null
            or e.term_id = v_term.id
            or coalesce(att.submitted_at, att.started_at)::date
                 between v_term.start_date and v_term.end_date
          )

        union all

        select
          coalesce(nullif(trim(m.subject), ''), 'Unassigned') as subject,
          coalesce(m.kind, 'exam') as kind,
          m.title,
          case
            when m.total is not null and m.total > 0
              then (m.score / m.total) * 100
            else null
          end as pct,
          jsonb_build_object(
            'exam_id', m.id,
            'title', m.title,
            'kind', coalesce(m.kind, 'exam'),
            'score', m.score,
            'total', m.total,
            'percent', case
              when m.total is not null and m.total > 0
                then round((m.score / m.total) * 100, 1)
              else null
            end,
            'submitted_at', m.recorded_at,
            'source', 'paper'
          ) as paper
        from paper_marks m
        where m.student_id = p_student_id
          and (
            v_term.id is null
            or m.term_id = v_term.id
          )
      ) p
      group by subject
    ) g;
  end if;

  if v_term.id is not null then
    select class_teacher_comment, principal_comment
      into v_class_comment, v_principal_comment
      from report_comments
     where student_id = p_student_id and term_id = v_term.id;

    if v_kind = 'statement' then
      select coalesce(jsonb_agg(jsonb_build_object(
        'area', s.area,
        'goal', s.goal,
        'comment', s.comment,
        'level', s.level,
        'position', s.position
      ) order by s.position, s.area, s.goal), '[]'::jsonb)
        into v_statements
        from report_statements s
       where s.student_id = p_student_id and s.term_id = v_term.id;
    end if;
  end if;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'id', v_student.id,
      'first_name', v_student.first_name,
      'last_name', v_student.last_name,
      'admission_number', v_student.admission_number,
      'photo_url', v_student.photo_url,
      'fee_cleared', v_student.fee_cleared
    ),
    'school', jsonb_build_object(
      'id', v_school.id,
      'name', v_school.name,
      'logo_url', v_school.logo_url
    ),
    'class', case
      when v_class.id is null then null
      else jsonb_build_object(
        'id', v_class.id,
        'name', v_class.name,
        'level', v_class.level,
        'report_kind', v_kind
      )
    end,
    'term', case
      when v_term.id is null then null
      else jsonb_build_object(
        'id', v_term.id,
        'name', v_term.name,
        'start_date', v_term.start_date,
        'end_date', v_term.end_date
      )
    end,
    'report_kind', v_kind,
    'attendance', jsonb_build_object(
      'days', v_days,
      'present', v_present,
      'late', v_late,
      'absent', v_absent,
      'excused', v_excused,
      'percent', case
        when v_days > 0 then round(((v_present + v_late)::numeric / v_days) * 100, 1)
        else null
      end,
      'marks', v_marks
    ),
    'subjects', v_subjects,
    'statements', v_statements,
    'comments', jsonb_build_object(
      'class_teacher', v_class_comment,
      'principal', v_principal_comment
    )
  );
end;
$$;

grant execute on function student_term_report(uuid, uuid) to authenticated;
