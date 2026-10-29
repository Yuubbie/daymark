-- Daymaark Run 21 — HR, clinic, report comments, per-student billing.

alter type user_role add value if not exists 'hr';
alter type user_role add value if not exists 'clinic';

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','proprietor') from profiles where id = auth.uid()), false);
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','proprietor','teacher') from profiles where id = auth.uid()), false);
$$;

create or replace function is_hr()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role::text = 'hr' from profiles where id = auth.uid()), false);
$$;

create or replace function is_clinic()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role::text = 'clinic' from profiles where id = auth.uid()), false);
$$;

create or replace function is_hr_desk()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role::text in ('admin','proprietor','hr') from profiles where id = auth.uid()), false);
$$;

create or replace function is_clinic_desk()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role::text in ('proprietor','clinic') from profiles where id = auth.uid()), false);
$$;

grant execute on function is_hr, is_clinic, is_hr_desk, is_clinic_desk to authenticated;

create table if not exists staff_attendance (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  staff_id   uuid not null references profiles(id) on delete cascade,
  date       date not null,
  status     text not null check (status in ('present','absent','sick')),
  note       text,
  marked_by  uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, date)
);
create index if not exists idx_staff_attendance_school_date on staff_attendance (school_id, date);

alter table staff_attendance enable row level security;

drop policy if exists staff_attendance_select on staff_attendance;
create policy staff_attendance_select on staff_attendance for select to authenticated
  using (school_id = auth_school_id() and (is_staff() or is_hr()));

drop policy if exists staff_attendance_write on staff_attendance;
create policy staff_attendance_write on staff_attendance for all to authenticated
  using (school_id = auth_school_id() and is_hr_desk())
  with check (school_id = auth_school_id() and is_hr_desk());

create table if not exists clinic_visits (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  student_id   uuid not null references students(id) on delete cascade,
  visit_at     timestamptz not null default now(),
  complaint    text not null,
  treatment    text,
  sent_home    boolean not null default false,
  recorded_by  uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_clinic_visits_school on clinic_visits (school_id, visit_at desc);
create index if not exists idx_clinic_visits_student on clinic_visits (student_id, visit_at desc);

alter table clinic_visits enable row level security;

drop policy if exists clinic_visits_all on clinic_visits;
create policy clinic_visits_all on clinic_visits for all to authenticated
  using (school_id = auth_school_id() and is_clinic_desk())
  with check (school_id = auth_school_id() and is_clinic_desk());

drop policy if exists students_select_clinic on students;
create policy students_select_clinic on students for select to authenticated
  using (school_id = auth_school_id() and is_clinic());

drop policy if exists classes_select_clinic on classes;
create policy classes_select_clinic on classes for select to authenticated
  using (school_id = auth_school_id() and is_clinic());

drop policy if exists profiles_select_hr on profiles;
create policy profiles_select_hr on profiles for select to authenticated
  using (school_id = auth_school_id() and is_hr());

create table if not exists report_comments (
  id                     uuid primary key default gen_random_uuid(),
  school_id              uuid not null references schools(id) on delete cascade,
  student_id             uuid not null references students(id) on delete cascade,
  term_id                uuid references terms(id) on delete cascade,
  class_teacher_comment  text,
  principal_comment      text,
  updated_by             uuid references profiles(id),
  updated_at             timestamptz not null default now(),
  unique (student_id, term_id)
);

alter table report_comments enable row level security;

drop policy if exists report_comments_select on report_comments;
create policy report_comments_select on report_comments for select to authenticated
  using (
    school_id = auth_school_id()
    and (
      is_staff()
      or (current_student_id() is not null and student_id = current_student_id())
      or parent_may_view_results(student_id)
    )
  );

drop policy if exists report_comments_write on report_comments;
create policy report_comments_write on report_comments for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());

create or replace function list_hr_roster(p_date date default current_date)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_out jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not (is_staff() or is_hr()) then
    raise exception 'only the office can open the staff register';
  end if;
  v_school := auth_school_id();
  if v_school is null then raise exception 'no school on this account'; end if;

  select coalesce(jsonb_agg(row_to_json(x) order by x.full_name), '[]'::jsonb)
    into v_out
  from (
    select
      p.id,
      p.full_name,
      p.email,
      p.role::text as role,
      a.status,
      a.note
    from profiles p
    left join staff_attendance a
      on a.staff_id = p.id and a.date = p_date and a.school_id = v_school
    where p.school_id = v_school
      and p.is_active
      and p.role::text in ('proprietor','admin','teacher','hr','clinic')
  ) x;

  return v_out;
end;
$$;

grant execute on function list_hr_roster(date) to authenticated;

create or replace function mark_staff_day(
  p_staff_id uuid,
  p_date date,
  p_status text,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_hr_desk() then
    raise exception 'only HR, an administrator or the proprietor can mark staff';
  end if;
  if p_status not in ('present','absent','sick') then
    raise exception 'status must be present, absent or sick';
  end if;
  if not exists (
    select 1 from profiles
     where id = p_staff_id
       and school_id = auth_school_id()
       and is_active
       and role::text in ('proprietor','admin','teacher','hr','clinic')
  ) then
    raise exception 'staff not found in your school';
  end if;

  insert into staff_attendance (school_id, staff_id, date, status, note, marked_by)
  values (auth_school_id(), p_staff_id, p_date, p_status, nullif(btrim(p_note), ''), auth.uid())
  on conflict (staff_id, date) do update
    set status = excluded.status,
        note = excluded.note,
        marked_by = excluded.marked_by,
        updated_at = now();
end;
$$;

grant execute on function mark_staff_day(uuid, date, text, text) to authenticated;

create or replace function list_clinic_visits(p_limit int default 80)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_out jsonb;
begin
  if not is_clinic_desk() then
    raise exception 'only the clinic and the proprietor can open clinic notes';
  end if;

  select coalesce(jsonb_agg(row_to_json(x) order by x.visit_at desc), '[]'::jsonb)
    into v_out
  from (
    select
      v.id,
      v.student_id,
      v.visit_at,
      v.complaint,
      v.treatment,
      v.sent_home,
      s.first_name,
      s.last_name,
      c.name as class_name
    from clinic_visits v
    join students s on s.id = v.student_id
    left join classes c on c.id = s.class_id
    where v.school_id = auth_school_id()
    order by v.visit_at desc
    limit greatest(1, least(coalesce(p_limit, 80), 200))
  ) x;

  return v_out;
end;
$$;

grant execute on function list_clinic_visits(int) to authenticated;

create or replace function record_clinic_visit(
  p_student_id uuid,
  p_complaint text,
  p_treatment text default null,
  p_sent_home boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not is_clinic_desk() then
    raise exception 'only the clinic and the proprietor can record a visit';
  end if;
  if nullif(btrim(p_complaint), '') is null then
    raise exception 'what was wrong?';
  end if;
  if not exists (
    select 1 from students
     where id = p_student_id and school_id = auth_school_id() and is_active
  ) then
    raise exception 'student not found in your school';
  end if;

  insert into clinic_visits (school_id, student_id, complaint, treatment, sent_home, recorded_by)
  values (
    auth_school_id(),
    p_student_id,
    btrim(p_complaint),
    nullif(btrim(p_treatment), ''),
    coalesce(p_sent_home, false),
    auth.uid()
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function record_clinic_visit(uuid, text, text, boolean) to authenticated;

create or replace function upsert_report_comment(
  p_student_id uuid,
  p_class_teacher_comment text default null,
  p_principal_comment text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_term uuid;
  v_school uuid;
begin
  if not is_staff() then
    raise exception 'only teachers and the office can write report comments';
  end if;
  v_school := auth_school_id();
  if not exists (
    select 1 from students where id = p_student_id and school_id = v_school and is_active
  ) then
    raise exception 'student not found in your school';
  end if;
  select id into v_term from terms where school_id = v_school and is_current limit 1;

  insert into report_comments (
    school_id, student_id, term_id,
    class_teacher_comment, principal_comment, updated_by
  )
  values (
    v_school, p_student_id, v_term,
    nullif(btrim(p_class_teacher_comment), ''),
    nullif(btrim(p_principal_comment), ''),
    auth.uid()
  )
  on conflict (student_id, term_id) do update
    set class_teacher_comment = excluded.class_teacher_comment,
        principal_comment = excluded.principal_comment,
        updated_by = excluded.updated_by,
        updated_at = now();
end;
$$;

grant execute on function upsert_report_comment(uuid, text, text) to authenticated;

create or replace function set_staff_role(p_profile_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_current text;
  v_admins int;
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can change roles';
  end if;
  if p_role not in ('teacher', 'admin', 'hr', 'clinic') then
    raise exception 'role must be teacher, admin, hr or clinic';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;

  select role::text into v_current
    from profiles
   where id = p_profile_id
     and school_id = auth_school_id();

  if v_current is null then
    raise exception 'staff not found in your school';
  end if;
  if v_current = 'proprietor' then
    raise exception 'the proprietor seat cannot be changed this way';
  end if;
  if v_current not in ('teacher', 'admin', 'hr', 'clinic') then
    raise exception 'that seat cannot be moved this way';
  end if;

  if v_current = 'admin' and p_role is distinct from 'admin' then
    select count(*) into v_admins
      from profiles
     where school_id = auth_school_id()
       and role = 'admin'
       and is_active;
    if v_admins <= 1 then
      raise exception 'keep at least one administrator';
    end if;
  end if;

  update profiles
     set role = p_role::user_role
   where id = p_profile_id;
end;
$$;

grant execute on function set_staff_role(uuid, text) to authenticated;

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
  v_class_comment text;
  v_principal_comment text;
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
        e.kind,
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
          'submitted_at', att.submitted_at
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
    ) p
    group by subject
  ) g;

  if v_term.id is not null then
    select class_teacher_comment, principal_comment
      into v_class_comment, v_principal_comment
      from report_comments
     where student_id = p_student_id and term_id = v_term.id;
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
      else jsonb_build_object('id', v_class.id, 'name', v_class.name)
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
    'comments', jsonb_build_object(
      'class_teacher', v_class_comment,
      'principal', v_principal_comment
    )
  );
end;
$$;

grant execute on function student_term_report(uuid, uuid) to authenticated;

alter table subscriptions
  add column if not exists billed_students integer;

create or replace function school_billing_quote(p_school_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_n int;
begin
  if auth.uid() is null and auth.role() is distinct from 'service_role' then
    raise exception 'not authenticated';
  end if;

  if auth.role() = 'service_role' then
    v_school := p_school_id;
  else
    v_school := auth_school_id();
    if p_school_id is not null and p_school_id is distinct from v_school then
      raise exception 'school_id does not match your school';
    end if;
    if not is_admin() then
      raise exception 'only the proprietor or admin can see billing';
    end if;
  end if;

  if v_school is null then
    raise exception 'no school';
  end if;

  select count(*)::int into v_n
    from students
   where school_id = v_school and is_active;
  if v_n < 1 then v_n := 1; end if;

  return jsonb_build_object(
    'school_id', v_school,
    'student_count', v_n,
    'plans', jsonb_build_object(
      'month', jsonb_build_object(
        'key', 'daymark_month',
        'interval', 'month',
        'naira_per_student', 1500,
        'naira', v_n * 1500,
        'kobo', v_n * 150000
      ),
      'term', jsonb_build_object(
        'key', 'daymark_term',
        'interval', 'term',
        'naira_per_student', 3500,
        'naira', v_n * 3500,
        'kobo', v_n * 350000
      ),
      'year', jsonb_build_object(
        'key', 'daymark_year',
        'interval', 'year',
        'naira_per_student', 10000,
        'naira', v_n * 10000,
        'kobo', v_n * 1000000
      )
    )
  );
end;
$$;

grant execute on function school_billing_quote(uuid) to authenticated, service_role;

drop function if exists public.activate_subscription(uuid, text, text, bigint);
drop function if exists public.activate_subscription(uuid, text, text, bigint, text);

create or replace function activate_subscription(
  p_school_id uuid,
  p_reference text,
  p_provider  text default 'paystack',
  p_amount_kobo bigint default 0,
  p_plan text default 'daymark_month'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sub_id uuid;
  v_period_end timestamptz;
  v_plan text;
  v_interval text;
  v_n int;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  v_plan := case
    when p_plan in ('daymark_term', 'term') then 'daymark_term'
    when p_plan in ('daymark_year', 'year') then 'daymark_year'
    else 'daymark_month'
  end;
  v_interval := case v_plan
    when 'daymark_term' then 'term'
    when 'daymark_year' then 'year'
    else 'month'
  end;

  select count(*)::int into v_n from students where school_id = p_school_id and is_active;
  if v_n < 1 then v_n := 1; end if;

  select id into v_sub_id
    from subscriptions
   where school_id = p_school_id
   order by created_at desc
   limit 1;

  v_period_end := case v_interval
    when 'term' then greatest(now(), coalesce(
      (select current_period_end from subscriptions where id = v_sub_id), now()
    )) + interval '4 months'
    when 'year' then greatest(now(), coalesce(
      (select current_period_end from subscriptions where id = v_sub_id), now()
    )) + interval '1 year'
    else greatest(now(), coalesce(
      (select current_period_end from subscriptions where id = v_sub_id), now()
    )) + interval '1 month'
  end;

  if v_sub_id is null then
    insert into subscriptions (school_id, plan, interval, billed_students)
    values (p_school_id, v_plan, v_interval, v_n)
    returning id into v_sub_id;
    v_period_end := case v_interval
      when 'term' then now() + interval '4 months'
      when 'year' then now() + interval '1 year'
      else now() + interval '1 month'
    end;
  end if;

  update subscriptions
     set status = 'active',
         plan = v_plan,
         interval = v_interval,
         billed_students = v_n,
         amount_kobo = p_amount_kobo,
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

revoke all on function public.activate_subscription(uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid, text, text, bigint, text) to service_role;
