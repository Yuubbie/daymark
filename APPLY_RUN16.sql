-- Daymaark Run 16 — a resumed attempt resumes for real.
--
-- Run 14 hands back the same attempt when a child refreshes or re-scans, but
-- the screen came back blank and the clock started over. That is worse than
-- losing the link: the child re-answers from nothing and Submit overwrites
-- whatever had been saved.
--
-- This adds one read for the holder of a live attempt: when it started, and
-- any answers already saved. Answers come back only while the attempt is in
-- progress; a submitted attempt returns none. The token must match the
-- attempt's own link, so a poster cannot read someone else's paper.
--
-- The client uses started_at to finish the original clock rather than grant a
-- fresh one, and keeps a draft in the browser as it goes.
--
-- Paste in Supabase SQL Editor after Run 15.

create or replace function linked_attempt_state(
  p_attempt_id uuid,
  p_token text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_attempt exam_attempts%rowtype;
  v_answers jsonb := '{}'::jsonb;
begin
  select * into v_attempt from exam_attempts where id = p_attempt_id;
  if not found then
    raise exception 'attempt not found';
  end if;

  if v_attempt.link_id is not null then
    if p_token is null or length(trim(p_token)) = 0 then
      raise exception 'exam token required';
    end if;
    if not exists (
      select 1 from exam_links
       where id = v_attempt.link_id
         and token = lower(trim(p_token))
         and not is_revoked
    ) then
      raise exception 'exam token does not match this attempt';
    end if;
  elsif v_attempt.student_id is not null then
    if current_student_id() is distinct from v_attempt.student_id then
      raise exception 'this attempt is not yours';
    end if;
  else
    raise exception 'cannot read this attempt';
  end if;

  if v_attempt.status = 'in_progress' then
    select coalesce(jsonb_object_agg(question_id, response), '{}'::jsonb)
      into v_answers
      from exam_answers
     where attempt_id = v_attempt.id;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'status', v_attempt.status,
    'started_at', v_attempt.started_at,
    'answers', v_answers
  );
end;
$$;

grant execute on function linked_attempt_state(uuid, text) to anon, authenticated;
