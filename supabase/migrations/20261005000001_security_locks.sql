-- Bind exam submit to the sitter (share-link token or logged-in student).
-- Staff-only inserts into the student-photos bucket.

drop function if exists submit_linked_attempt(uuid, jsonb);

create or replace function submit_linked_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_token text default null
)
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
  v_link_ok boolean := false;
begin
  select * into v_attempt from exam_attempts where id = p_attempt_id;
  if not found then
    raise exception 'attempt not found';
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'this attempt was already submitted';
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  if v_attempt.link_id is not null then
    if p_token is null or length(trim(p_token)) = 0 then
      raise exception 'exam token required';
    end if;
    select exists (
      select 1 from exam_links
       where id = v_attempt.link_id
         and token = lower(trim(p_token))
         and not is_revoked
    ) into v_link_ok;
    if not v_link_ok then
      raise exception 'exam token does not match this attempt';
    end if;
  elsif v_attempt.student_id is not null then
    if current_student_id() is distinct from v_attempt.student_id then
      raise exception 'this attempt is not yours';
    end if;
  else
    raise exception 'cannot submit this attempt';
  end if;

  if v_exam.duration_minutes is not null
     and now() > v_attempt.started_at + ((v_exam.duration_minutes + 30) * interval '1 minute') then
    raise exception 'this attempt has expired';
  end if;

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

grant execute on function submit_linked_attempt(uuid, jsonb, text) to anon, authenticated;

do $$ begin
  drop policy if exists "teachers upload student photos" on storage.objects;
  drop policy if exists "staff upload student photos" on storage.objects;
  create policy "staff upload student photos"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'student-photos' and public.is_staff());
exception when others then
  raise notice 'student-photos storage policy skipped: %', sqlerrm;
end $$;
