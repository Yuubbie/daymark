-- Daymaark Run 5 — paste in Supabase SQL Editor after Run 4.
-- Closes remaining holes: free subscriptions, removed staff, exam IDOR,
-- notice spam, role promotion, Paystack-only billing writes.

-- =============================================================================
-- 1. BILLING — nobody except service_role may activate a subscription
-- =============================================================================

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
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  select id, greatest(now(), coalesce(current_period_end, now())) + interval '4 months'
    into v_sub_id, v_period_end
  from subscriptions
  where school_id = p_school_id
  order by created_at desc
  limit 1;

  if v_sub_id is null then
    insert into subscriptions (school_id) values (p_school_id) returning id into v_sub_id;
    v_period_end := now() + interval '4 months';
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

revoke all on function public.activate_subscription from public, anon, authenticated;
grant execute on function public.activate_subscription to service_role;

drop policy if exists subscriptions_write on subscriptions;

do $$ begin
  revoke all on function public.digest_payload_for_date from public, anon, authenticated;
  grant execute on function public.digest_payload_for_date to service_role;
exception when undefined_function then
  raise notice 'digest_payload_for_date not present';
end $$;

-- Admins cannot flip schools.subscription_status by hand.
create or replace function protect_school_billing()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.subscription_status is distinct from old.subscription_status
     and auth.role() is distinct from 'service_role' then
    raise exception 'subscription status cannot be changed here';
  end if;
  return new;
end;
$$;

drop trigger if exists t_protect_school_billing on schools;
create trigger t_protect_school_billing
  before update on schools
  for each row execute function protect_school_billing();

-- =============================================================================
-- 2. REMOVED STAFF — is_active=false must not pass any role helper
-- =============================================================================

create or replace function auth_school_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid() and coalesce(is_active, true);
$$;

create or replace function auth_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and coalesce(is_active, true);
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role in ('admin','proprietor') from profiles
     where id = auth.uid() and coalesce(is_active, true)
  ), false);
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role in ('admin','proprietor','teacher') from profiles
     where id = auth.uid() and coalesce(is_active, true)
  ), false);
$$;

create or replace function is_proprietor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'proprietor' from profiles
     where id = auth.uid() and coalesce(is_active, true)
  ), false);
$$;

create or replace function is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'teacher' from profiles
     where id = auth.uid() and coalesce(is_active, true)
  ), false);
$$;

create or replace function is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select role = 'student' from profiles
     where id = auth.uid() and coalesce(is_active, true)
  ), false);
$$;

create or replace function current_student_id()
returns uuid language sql stable security definer set search_path = public as $$
  select student_id from profiles
   where id = auth.uid() and coalesce(is_active, true);
$$;

-- =============================================================================
-- 3. EXAMS — do not sit as another child; do not fetch papers early
-- =============================================================================

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

  if p_student_id is not null then
    if current_student_id() is distinct from p_student_id then
      raise exception 'cannot sit as another student';
    end if;
    v_student := p_student_id;
  else
    v_student := current_student_id();
  end if;

  insert into exam_attempts (school_id, exam_id, student_id, link_id,
                             applicant_name, applicant_email)
  values (v_link.school_id, v_link.exam_id, v_student, v_link.id,
          p_applicant_name, p_applicant_email)
  returning id into v_attempt_id;

  update exam_links set uses = uses + 1 where id = v_link.id;

  return v_attempt_id;
end;
$$;

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
        and v_exam.class_id = (select class_id from students where id = current_student_id())
        and (v_exam.opens_at is null or v_exam.opens_at <= now())
        and (v_exam.closes_at is null or v_exam.closes_at >= now()) then
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

drop policy if exists exam_questions_select_student on exam_questions;
create policy exam_questions_select_student on exam_questions for select to authenticated
  using (
    current_student_id() is not null
    and exists (
      select 1 from exams e
      join students s on s.id = current_student_id()
      where e.id = exam_id
        and e.status = 'published'
        and e.class_id = s.class_id
        and (e.opens_at is null or e.opens_at <= now())
        and (e.closes_at is null or e.closes_at >= now())
    )
  );

create or replace function protect_attempt_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.result_status is distinct from old.result_status
     and new.result_status = 'approved'
     and not is_admin() then
    raise exception 'only an administrator or proprietor can approve results';
  end if;
  if new.student_id is distinct from old.student_id then
    raise exception 'cannot reassign this attempt';
  end if;
  return new;
end;
$$;

drop trigger if exists t_protect_attempt_approval on exam_attempts;
create trigger t_protect_attempt_approval
  before update on exam_attempts
  for each row execute function protect_attempt_approval();

-- =============================================================================
-- 4. NOTICES — FOR ALL let any member insert. Split to update/delete.
-- =============================================================================

drop policy if exists announcements_update_owner on announcements;
drop policy if exists announcements_delete_owner on announcements;
create policy announcements_update_owner on announcements for update to authenticated
  using (school_id = auth_school_id() and (is_admin() or created_by = auth.uid()))
  with check (school_id = auth_school_id() and (is_admin() or created_by = auth.uid()));
create policy announcements_delete_owner on announcements for delete to authenticated
  using (school_id = auth_school_id() and (is_admin() or created_by = auth.uid()));

-- =============================================================================
-- 5. PROFILES — admin cannot promote to proprietor or rebind student_id
-- =============================================================================

create or replace function protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    -- First school create: parent with no school becomes proprietor.
    if old.school_id is null
       and new.school_id is not null
       and new.role = 'proprietor'
       and old.role in ('parent', 'proprietor') then
      null;
    elsif old.role = 'proprietor' then
      raise exception 'the proprietor seat cannot be changed this way';
    elsif new.role = 'proprietor' then
      raise exception 'cannot appoint another proprietor this way';
    elsif not is_proprietor() and not is_admin() then
      raise exception 'cannot change roles';
    end if;
  end if;
  if new.student_id is distinct from old.student_id and not is_admin() then
    raise exception 'cannot rebind student login';
  end if;
  return new;
end;
$$;

drop trigger if exists t_protect_profile_role on profiles;
create trigger t_protect_profile_role
  before update on profiles
  for each row execute function protect_profile_role();

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (
    school_id = auth_school_id()
    and role <> 'proprietor'
  );

-- =============================================================================
-- 6. FEE ORACLE — staff, linked parent, or the student. Else false.
-- =============================================================================

create or replace function is_fee_cleared(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select s.fee_cleared from students s
    where s.id = p_student_id
      and (
        is_staff()
        or current_student_id() = p_student_id
        or exists (
          select 1 from parent_student_links l
           where l.student_id = s.id and l.parent_id = auth.uid()
        )
      )
  ), false);
$$;

-- =============================================================================
-- 7. STUDENT PHOTOS — path must start with this school's id
-- =============================================================================

do $$ begin
  drop policy if exists "staff upload student photos" on storage.objects;
  create policy "staff upload student photos"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'student-photos'
      and public.is_staff()
      and (storage.foldername(name))[1] = public.auth_school_id()::text
    );
exception when others then
  raise notice 'student-photos storage policy skipped: %', sqlerrm;
end $$;
