-- Daymaark Run 17 — ops desk for the two people who run Daymaark.
-- Not a school role. yomipeculiar@gmail.com and daymaarkapp@gmail.com keep
-- their school logins; /ops is an extra door on the same account.
--
-- The list is schools and proprietors: name, phone, email, address, slug,
-- trial/active/lapsed, roster counts, last register tick. That is a sales
-- list. Parent phones and emails stay in the school. Counts of linked
-- parents tell you if the claim-code loop works; the contacts do not.
--
-- Paste in Supabase SQL Editor after Run 16.

create table if not exists platform_admins (
  email     text primary key,
  added_at  timestamptz not null default now()
);

alter table platform_admins enable row level security;

insert into platform_admins (email) values
  ('yomipeculiar@gmail.com'),
  ('daymaarkapp@gmail.com')
on conflict (email) do nothing;

create or replace function is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from platform_admins
     where email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

revoke all on function is_platform_admin from public, anon;
grant execute on function is_platform_admin() to authenticated;

create or replace function ops_school_list()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then
    raise exception 'forbidden';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc)
    from (
      select
        s.id,
        s.name,
        s.slug,
        s.subscription_status,
        s.address,
        s.phone,
        (s.logo_url is not null) as has_crest,
        s.created_at,
        sub.status as sub_status,
        sub.trial_ends_at,
        sub.current_period_end,
        (select count(*)::int from students st
          where st.school_id = s.id and st.is_active) as students,
        (select count(*)::int from classes c
          where c.school_id = s.id and c.is_active) as classes,
        (select count(*)::int from profiles p
          where p.school_id = s.id
            and coalesce(p.is_active, true)
            and p.role in ('admin', 'proprietor', 'teacher')) as staff,
        (select count(distinct l.parent_id)::int from parent_student_links l
          where l.school_id = s.id) as parents,
        (select max(a.date) from attendance a
          where a.school_id = s.id) as last_register,
        (select max(ea.created_at) from exam_attempts ea
          where ea.school_id = s.id) as last_attempt,
        prop.full_name as proprietor_name,
        prop.email as proprietor_email,
        prop.phone as proprietor_phone
      from schools s
      left join lateral (
        select status, trial_ends_at, current_period_end
          from subscriptions
         where school_id = s.id
         order by created_at desc
         limit 1
      ) sub on true
      left join lateral (
        select full_name, email, phone
          from profiles
         where school_id = s.id
           and role = 'proprietor'
           and coalesce(is_active, true)
         order by created_at asc
         limit 1
      ) prop on true
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function ops_school_list from public, anon;
grant execute on function ops_school_list() to authenticated;

-- Billing is N200,000 per month, not per term. Amount stays the same;
-- only the period changes. School admins still cannot flip this by hand.

alter table subscriptions
  alter column plan set default 'daymark_month',
  alter column interval set default 'month';

update subscriptions
   set plan = 'daymark_month',
       interval = 'month'
 where plan in ('daymark_annual', 'daymark_term')
    or interval in ('year', 'term');

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

  select id, greatest(now(), coalesce(current_period_end, now())) + interval '1 month'
    into v_sub_id, v_period_end
  from subscriptions
  where school_id = p_school_id
  order by created_at desc
  limit 1;

  if v_sub_id is null then
    insert into subscriptions (school_id, plan, interval)
    values (p_school_id, 'daymark_month', 'month')
    returning id into v_sub_id;
    v_period_end := now() + interval '1 month';
  end if;

  update subscriptions
     set status = 'active',
         plan = 'daymark_month',
         interval = 'month',
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
  values (new.id, 'daymark_month', 'month');
  return new;
end;
$$;
