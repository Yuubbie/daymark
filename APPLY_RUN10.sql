-- Daymaark Run 10 — paste in Supabase SQL Editor after Run 9.
-- Term report card from live attendance + approved CBT papers.
-- Parents need fees cleared. Staff and the student may always open it.

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
      jsonb_agg(jsonb_build_object('date', a.date, 'status', a.status) order by a.date),
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
      'name', v_school.name
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
    'subjects', v_subjects
  );
end;
$$;

grant execute on function student_term_report(uuid, uuid) to authenticated;
