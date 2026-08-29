-- =============================================================================
-- Daymark — daily digest notifications
-- Adds: profiles.digest_channel, push_subscriptions table, and the RPC the
-- Edge Function uses to read who gets notified about which students today.
-- =============================================================================

-- ---------- profiles.digest_channel ----------
-- push  = free, sent via the browser's Push API to an installed PWA.
-- sms   = paid fallback, opt-in only, for parents without push support.
-- none  = no digest at all.
-- Default is push: it costs nothing and needs no DND-registry compliance,
-- unlike SMS in Nigeria.
alter table profiles
  add column digest_channel text not null default 'push'
    check (digest_channel in ('push', 'sms', 'none'));

-- ---------- push_subscriptions ----------
-- One row per browser/device a parent (or staff member) has enabled push on.
-- A person can have more than one (phone + a shared tablet at home, say).
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (profile_id, endpoint)
);
create index on push_subscriptions (profile_id);

alter table push_subscriptions enable row level security;

-- A person manages only their own subscriptions.
create policy push_subscriptions_own on push_subscriptions for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

grant select, insert, update, delete on push_subscriptions to authenticated;

-- ---------- RPC: today's digest payload ----------
-- SECURITY DEFINER because the Edge Function calls this with the service
-- role, cutting across every school at once — RLS would otherwise block a
-- cross-school read. It only ever returns data, never accepts a filter that
-- could be used to snoop; the shape is fixed and deliberate.
--
-- One row per (parent, child) pair that has something worth telling them:
-- today's attendance mark and/or today's lesson and homework for that
-- child's class. Silence for a child with nothing posted today — an empty
-- digest for one kid does not need to interrupt a parent's evening.
create or replace function digest_payload_for_date(p_date date default current_date)
returns table (
  parent_id         uuid,
  digest_channel    text,
  phone             text,
  parent_name       text,
  student_id        uuid,
  student_name      text,
  attendance_status attendance_status,
  lessons           jsonb
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
    ) as lessons
  from parent_student_links psl
  join profiles p on p.id = psl.parent_id
  join students s on s.id = psl.student_id
  left join attendance a on a.student_id = s.id and a.date = p_date
  left join lessons l on l.class_id = s.class_id and l.date = p_date
  where p.digest_channel <> 'none'
    and s.is_active
  group by p.id, p.digest_channel, p.phone, p.full_name, s.id, s.first_name, s.last_name, a.status
  having a.status is not null or count(l.id) > 0;
$$;

grant execute on function digest_payload_for_date to service_role;
