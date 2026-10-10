-- Daymaark Run 11 — paste in Supabase SQL Editor after Run 10.
-- Staff fee-reminder list (WhatsApp / SMS) and a fee line on the daily digest.

create or replace function list_fee_reminders()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not is_admin() then
    raise exception 'only an administrator or proprietor can list fee reminders';
  end if;
  v_school := auth_school_id();
  if v_school is null then
    raise exception 'no school on this account';
  end if;

  select coalesce(jsonb_agg(row_json order by parent_name), '[]'::jsonb)
    into v_out
  from (
    select
      jsonb_build_object(
        'parent_id', p.id,
        'parent_name', coalesce(p.full_name, p.email, 'Parent'),
        'phone', p.phone,
        'email', p.email,
        'children', jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'first_name', s.first_name,
            'last_name', s.last_name,
            'class_name', c.name
          )
          order by s.last_name, s.first_name
        )
      ) as row_json,
      coalesce(p.full_name, p.email, '') as parent_name
    from parent_student_links l
    join students s on s.id = l.student_id
    join profiles p on p.id = l.parent_id
    left join classes c on c.id = s.class_id
    where s.school_id = v_school
      and s.is_active
      and not s.fee_cleared
    group by p.id, p.full_name, p.phone, p.email
  ) t;

  return v_out;
end;
$$;

grant execute on function list_fee_reminders() to authenticated;

drop function if exists public.digest_payload_for_date(date);

create or replace function digest_payload_for_date(p_date date default current_date)
returns table (
  parent_id         uuid,
  digest_channel    text,
  phone             text,
  parent_name       text,
  student_id        uuid,
  student_name      text,
  attendance_status attendance_status,
  lessons           jsonb,
  fee_cleared       boolean
)
language sql stable security definer set search_path = public as $$
  select
    p.id                as parent_id,
    p.digest_channel,
    p.phone,
    p.full_name         as parent_name,
    s.id                as student_id,
    s.first_name || ' ' || s.last_name as student_name,
    a.status            as attendance_status,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'subject', l.subject,
          'topic', l.topic,
          'homework', l.homework
        )
      ) filter (where l.id is not null),
      '[]'::jsonb
    ) as lessons,
    s.fee_cleared       as fee_cleared
  from parent_student_links psl
  join profiles p on p.id = psl.parent_id
  join students s on s.id = psl.student_id
  left join attendance a on a.student_id = s.id and a.date = p_date
  left join lessons l on l.class_id = s.class_id and l.date = p_date
  where p.digest_channel <> 'none'
    and s.is_active
  group by p.id, p.digest_channel, p.phone, p.full_name, s.id, s.first_name, s.last_name, a.status, s.fee_cleared
  having a.status is not null or count(l.id) > 0;
$$;

revoke all on function public.digest_payload_for_date from public, anon, authenticated;
grant execute on function public.digest_payload_for_date to service_role;
