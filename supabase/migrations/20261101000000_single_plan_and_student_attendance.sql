-- Daymaark — one plan (N1,000 per student per term) and student attendance.
--
-- Supersedes the three-plan pricing and the month/term/year activate_subscription
-- in 20261028000001_hr_clinic_billing.sql.

-- ---------- students may read their own register ----------
drop policy if exists attendance_select_student on attendance;
create policy attendance_select_student on attendance for select to authenticated
  using (student_id = current_student_id());

-- ---------- one plan: N1,000 per student per term ----------
alter table subscriptions
  alter column plan set default 'daymark_term',
  alter column interval set default 'term';

update subscriptions
   set plan = 'daymark_term',
       interval = 'term'
 where plan in ('daymark_month', 'daymark_year', 'month', 'year')
    or interval in ('month', 'year');

create or replace function start_school_trial()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (school_id, plan, interval)
  values (new.id, 'daymark_term', 'term');
  return new;
end;
$$;

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
      'term', jsonb_build_object(
        'key', 'daymark_term',
        'interval', 'term',
        'naira_per_student', 1000,
        'naira', v_n * 1000,
        'kobo', v_n * 100000
      )
    )
  );
end;
$$;

grant execute on function school_billing_quote(uuid) to authenticated, service_role;

create or replace function activate_subscription(
  p_school_id uuid,
  p_reference text,
  p_provider  text default 'paystack',
  p_amount_kobo bigint default 0,
  p_plan text default 'daymark_term'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sub_id uuid;
  v_period_end timestamptz;
  v_n int;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  select count(*)::int into v_n from students where school_id = p_school_id and is_active;
  if v_n < 1 then v_n := 1; end if;

  select id into v_sub_id
    from subscriptions
   where school_id = p_school_id
   order by created_at desc
   limit 1;

  v_period_end := greatest(now(), coalesce(
    (select current_period_end from subscriptions where id = v_sub_id), now()
  )) + interval '4 months';

  if v_sub_id is null then
    insert into subscriptions (school_id, plan, interval, billed_students)
    values (p_school_id, 'daymark_term', 'term', v_n)
    returning id into v_sub_id;
    v_period_end := now() + interval '4 months';
  end if;

  update subscriptions
     set status = 'active',
         plan = 'daymark_term',
         interval = 'term',
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

revoke all on function public.activate_subscription(uuid, text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid, text, text, bigint, text)
  to service_role;
