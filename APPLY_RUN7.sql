-- Daymaark Run 7 — paste in Supabase SQL Editor after Run 6.
-- Subscription is N200,000 per term, not per year.

alter table subscriptions
  alter column plan set default 'daymark_term',
  alter column interval set default 'term';

update subscriptions
   set plan = 'daymark_term',
       interval = 'term'
 where plan = 'daymark_annual' or interval = 'year';

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

  -- One payment covers one school term (~4 months).
  select id, greatest(now(), coalesce(current_period_end, now())) + interval '4 months'
    into v_sub_id, v_period_end
  from subscriptions
  where school_id = p_school_id
  order by created_at desc
  limit 1;

  if v_sub_id is null then
    insert into subscriptions (school_id, plan, interval)
    values (p_school_id, 'daymark_term', 'term')
    returning id into v_sub_id;
    v_period_end := now() + interval '4 months';
  end if;

  update subscriptions
     set status = 'active',
         plan = 'daymark_term',
         interval = 'term',
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

create or replace function start_school_trial()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (school_id, plan, interval)
  values (new.id, 'daymark_term', 'term');
  return new;
end;
$$;
