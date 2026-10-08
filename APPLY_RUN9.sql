-- Daymaark Run 9 — paste in Supabase SQL Editor after Run 8.
-- Staff RPCs for listing bank questions and saving a draft paper.
-- Fixes Failed to fetch on Set a paper (client table select).

create or replace function list_bank_questions(p_bank_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not is_staff() then
    raise exception 'only staff can list bank questions';
  end if;
  v_school := auth_school_id();
  if v_school is null then
    raise exception 'no school on this account';
  end if;
  if not exists (
    select 1 from question_banks
     where id = p_bank_id and school_id = v_school
  ) then
    raise exception 'bank not found in your school';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'bank_id', q.bank_id,
        'question_type', q.question_type,
        'prompt', q.prompt,
        'passage', q.passage,
        'options', q.options,
        'marks', q.marks,
        'tags', coalesce(to_jsonb(q.tags), '[]'::jsonb)
      )
      order by q.created_at desc
    ),
    '[]'::jsonb
  )
    into v_out
  from questions q
  where q.bank_id = p_bank_id
    and q.school_id = v_school;

  return v_out;
end;
$$;

grant execute on function list_bank_questions(uuid) to authenticated;

create or replace function create_exam_paper(
  p_title text,
  p_subject text,
  p_class_id uuid,
  p_kind exam_kind,
  p_duration_minutes int,
  p_instructions text,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_question_ids uuid[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_exam_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not is_staff() then
    raise exception 'only staff can set a paper';
  end if;
  v_school := auth_school_id();
  if v_school is null then
    raise exception 'no school on this account';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'name the paper';
  end if;
  if p_question_ids is null or coalesce(array_length(p_question_ids, 1), 0) = 0 then
    raise exception 'pick at least one question from the bank';
  end if;
  if p_class_id is not null and not exists (
    select 1 from classes where id = p_class_id and school_id = v_school
  ) then
    raise exception 'class not found in your school';
  end if;
  if exists (
    select 1
    from unnest(p_question_ids) as qid
    where not exists (
      select 1 from questions q
       where q.id = qid and q.school_id = v_school
    )
  ) then
    raise exception 'a selected question is not in your school';
  end if;

  insert into exams (
    school_id, title, subject, class_id, kind,
    duration_minutes, instructions, allow_offline, opens_at, closes_at, created_by
  ) values (
    v_school,
    trim(p_title),
    nullif(trim(coalesce(p_subject, '')), ''),
    p_class_id,
    p_kind,
    p_duration_minutes,
    p_instructions,
    true,
    p_opens_at,
    p_closes_at,
    auth.uid()
  )
  returning id into v_exam_id;

  insert into exam_questions (exam_id, question_id, position)
  select v_exam_id, qid, ord::int
  from unnest(p_question_ids) with ordinality as t(qid, ord);

  return v_exam_id;
end;
$$;

grant execute on function create_exam_paper(
  text, text, uuid, exam_kind, int, text, timestamptz, timestamptz, uuid[]
) to authenticated;
