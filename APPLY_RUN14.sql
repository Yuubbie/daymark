-- Daymaark Run 14 — one attempt per name on a share link.
-- A child on a borrowed phone types a name. That name — lowercased and
-- whitespace-collapsed — may open only one attempt on a paper. If the attempt
-- is still in progress we hand it back (a refresh, a dropped connection, a
-- battery death resumes rather than burns a use). If it was submitted, the
-- name is spent. Identified students key on student_id instead.
--
-- Paste in Supabase SQL Editor after Run 13.

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
  v_name text;
  v_existing exam_attempts%rowtype;
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

  if p_student_id is not null then
    if current_student_id() is distinct from p_student_id then
      raise exception 'cannot sit as another student';
    end if;
    v_student := p_student_id;
  else
    v_student := current_student_id();
  end if;

  v_name := lower(regexp_replace(trim(coalesce(p_applicant_name, '')), '\s+', ' ', 'g'));

  if v_student is null and v_name = '' then
    raise exception 'enter your name to sit this paper';
  end if;

  -- Prefer a live attempt over a spent one when both somehow exist.
  if v_student is not null then
    select * into v_existing from exam_attempts
     where exam_id = v_link.exam_id and student_id = v_student
     order by (status <> 'in_progress'), created_at asc
     limit 1;
  else
    select * into v_existing from exam_attempts
     where exam_id = v_link.exam_id
       and lower(regexp_replace(trim(coalesce(applicant_name, '')), '\s+', ' ', 'g')) = v_name
     order by (status <> 'in_progress'), created_at asc
     limit 1;
  end if;

  if found then
    if v_existing.status = 'in_progress' then
      return v_existing.id;
    end if;
    raise exception 'this name has already sat this paper';
  end if;

  insert into exam_attempts (school_id, exam_id, student_id, link_id,
                             applicant_name, applicant_email)
  values (v_link.school_id, v_link.exam_id, v_student, v_link.id,
          nullif(trim(p_applicant_name), ''), nullif(trim(p_applicant_email), ''))
  returning id into v_attempt_id;

  update exam_links set uses = uses + 1 where id = v_link.id;

  return v_attempt_id;
end;
$$;

grant execute on function start_linked_attempt(text, text, text, uuid) to anon, authenticated;
