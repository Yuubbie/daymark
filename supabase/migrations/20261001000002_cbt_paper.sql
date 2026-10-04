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
