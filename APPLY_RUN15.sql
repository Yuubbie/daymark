-- Daymaark Run 15 — keep the poster link stable, and let a resumed attempt
-- submit from whichever poster the child actually scanned.
--
-- Two follow-ups to Run 14:
--   1. generate_exam_link hands back the same open student link instead of
--      minting a fresh one every time staff press Link or Poster. One paper,
--      one address, so two photocopied posters cannot disagree.
--   2. Resuming an attempt on a different link rebinds it to that link.
--      Submit checks the token against the attempt's link, so without this a
--      child who started on poster A and carried on from poster B could never
--      submit, and the attempt would sit in progress forever.
--
-- Also takes a per-paper, per-name advisory lock so two phones pressing Start
-- on the same name at the same instant make one attempt, not two.
--
-- Paste in Supabase SQL Editor after Run 14.

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
  v_existing text;
begin
  if not is_staff() then
    raise exception 'only staff can generate exam links';
  end if;

  select school_id into v_school_id from exams where id = p_exam_id;
  if v_school_id is null or v_school_id <> auth_school_id() then
    raise exception 'exam not found in your school';
  end if;

  -- Reuse an open, uncapped, unexpired link for this paper and kind. Staff
  -- pressing Link then Poster should hand out one address, not two.
  if p_max_uses is null then
    select token into v_existing from exam_links
     where exam_id = p_exam_id
       and kind = p_kind
       and not is_revoked
       and max_uses is null
       and (expires_at is null or expires_at > now())
     order by created_at desc
     limit 1;
    if found then
      return v_existing;
    end if;
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

  -- Two phones pressing Start as the same name must not race into two rows.
  -- The lock is released when this transaction commits.
  perform pg_advisory_xact_lock(hashtext(
    v_link.exam_id::text || ':' || coalesce(v_student::text, 'name:' || v_name)
  ));

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
      -- Rebind to the link they are holding, so Submit accepts their token.
      if v_existing.link_id is distinct from v_link.id then
        update exam_attempts set link_id = v_link.id where id = v_existing.id;
      end if;
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

grant execute on function generate_exam_link(uuid, link_kind, int, timestamptz) to authenticated;
grant execute on function start_linked_attempt(text, text, text, uuid) to anon, authenticated;
