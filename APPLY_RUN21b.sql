-- Daymaark Run 21b — paste this whole block. It puts activate_subscription
-- back (the three-line grant failed because the function was never saved).

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
    insert into subscriptions (school_id, plan, interval)
    values (p_school_id, v_plan, v_interval)
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
         amount_kobo = p_amount_kobo,
         started_at = coalesce(started_at, now()),
         current_period_end = v_period_end
   where id = v_sub_id;

  begin
    update subscriptions set billed_students = v_n where id = v_sub_id;
  exception when undefined_column then
    null;
  end;

  insert into payments (school_id, subscription_id, amount_kobo, provider, reference, status, paid_at)
  values (p_school_id, v_sub_id, p_amount_kobo, p_provider, p_reference, 'success', now())
  on conflict (reference) do nothing;

  update schools set subscription_status = 'active' where id = p_school_id;

  return v_sub_id;
end;
$$;

revoke all on function public.activate_subscription(uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid, text, text, bigint, text) to service_role;
