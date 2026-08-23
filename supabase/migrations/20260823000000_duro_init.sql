-- =============================================================================
-- Duro — initial schema, RLS, and RPCs
-- Supabase / Postgres 15+
-- Run: supabase migration new duro_init  (paste this in), then supabase db push
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

create type user_role as enum ('admin', 'teacher', 'parent');
create type attendance_status as enum ('present', 'absent', 'late', 'excused');

-- =============================================================================
-- 2. TABLES
-- =============================================================================

create table schools (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique not null,
  address           text,
  phone             text,
  logo_url          text,
  subscription_status text not null default 'trial',  -- trial | active | lapsed
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Mirrors auth.users. One profile per auth user. school_id is NULL until the
-- user is claimed by an invite (staff) or a claim code (parent).
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  school_id     uuid references schools(id) on delete cascade,
  role          user_role not null default 'parent',
  full_name     text,
  email         text,
  phone         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on profiles (school_id, role);

-- Terms exist so the PDF report has a real date boundary to pull against.
create table terms (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  name        text not null,                -- e.g. "First Term 2025/2026"
  start_date  date not null,
  end_date    date not null,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),
  check (end_date > start_date)
);
create index on terms (school_id);
create unique index one_current_term_per_school
  on terms (school_id) where is_current;

create table classes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  name        text not null,                -- "JSS 2A"
  level       text,                         -- "JSS 2"
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (school_id, name)
);
create index on classes (school_id);

-- Teacher <-> class assignment. subject NULL = form/class teacher.
create table class_teachers (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  teacher_id  uuid not null references profiles(id) on delete cascade,
  subject     text,
  is_form_teacher boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (class_id, teacher_id, subject)
);
create index on class_teachers (teacher_id);
create index on class_teachers (class_id);

create table students (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references schools(id) on delete cascade,
  class_id          uuid references classes(id) on delete set null,
  first_name        text not null,
  last_name         text not null,
  admission_number  text,
  date_of_birth     date,
  gender            text,
  photo_url         text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (school_id, admission_number)
);
create index on students (school_id);
create index on students (class_id);

create table parent_student_links (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  parent_id     uuid not null references profiles(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade,
  relationship  text default 'parent',      -- parent | guardian | other
  created_at    timestamptz not null default now(),
  unique (parent_id, student_id)
);
create index on parent_student_links (parent_id);
create index on parent_student_links (student_id);

-- Parent onboarding: staff generates a code per student, parent redeems it.
create table claim_codes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  code        text unique not null,
  created_by  uuid references profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  used_at     timestamptz,
  used_by     uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on claim_codes (school_id);
create index on claim_codes (student_id);

-- Staff onboarding: admin pre-authorises an email + role before signup.
create table invites (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  email       text not null,
  role        user_role not null default 'teacher',
  full_name   text,
  created_by  uuid references profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now(),
  unique (school_id, email)
);
create index on invites (lower(email));

create table attendance (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  date        date not null default current_date,
  status      attendance_status not null,
  note        text,
  marked_by   uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (student_id, date)
);
create index on attendance (school_id, date);
create index on attendance (class_id, date);
create index on attendance (student_id, date desc);

-- Lesson + homework are one row on purpose: one entry per subject per day is
-- the whole teacher ask. Keep the form to a single screen.
create table lessons (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references schools(id) on delete cascade,
  class_id          uuid not null references classes(id) on delete cascade,
  subject           text not null,
  date              date not null default current_date,
  topic             text not null,
  summary           text,
  homework          text,
  homework_due_date date,
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (class_id, subject, date)
);
create index on lessons (school_id, date desc);
create index on lessons (class_id, date desc);

create table announcements (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  class_id      uuid references classes(id) on delete cascade,  -- NULL = school-wide
  title         text not null,
  body          text not null,
  created_by    uuid references profiles(id) on delete set null,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index on announcements (school_id, published_at desc);
create index on announcements (class_id, published_at desc);

-- =============================================================================
-- 3. updated_at TRIGGER
-- =============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger t_schools_updated  before update on schools  for each row execute function set_updated_at();
create trigger t_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger t_students_updated before update on students for each row execute function set_updated_at();
create trigger t_attend_updated   before update on attendance for each row execute function set_updated_at();
create trigger t_lessons_updated  before update on lessons  for each row execute function set_updated_at();

-- =============================================================================
-- 4. AUTH HELPERS
-- SECURITY DEFINER so policies can read profiles without recursing into
-- profiles' own RLS. search_path pinned to prevent hijacking.
-- =============================================================================

create or replace function auth_school_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','teacher') from profiles where id = auth.uid()), false);
$$;

-- Does the current teacher teach this class?
create or replace function teaches_class(p_class_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_teachers
    where class_id = p_class_id and teacher_id = auth.uid()
  );
$$;

-- Is the current user a linked parent of this student?
create or replace function is_parent_of(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from parent_student_links
    where student_id = p_student_id and parent_id = auth.uid()
  );
$$;

-- Every class the current parent has a child in (drives class-scoped reads).
create or replace function parent_class_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct s.class_id
  from parent_student_links l
  join students s on s.id = l.student_id
  where l.parent_id = auth.uid() and s.class_id is not null;
$$;

grant execute on function auth_school_id, auth_role, is_admin, is_staff,
  teaches_class, is_parent_of, parent_class_ids to authenticated;

-- =============================================================================
-- 5. NEW USER TRIGGER
-- On signup: match a pending staff invite by email, else land as an
-- unattached parent who must redeem a claim code.
-- =============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_invite invites%rowtype;
begin
  select * into v_invite
  from invites
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if found then
    insert into profiles (id, school_id, role, full_name, email)
    values (new.id, v_invite.school_id, v_invite.role,
            coalesce(new.raw_user_meta_data->>'full_name', v_invite.full_name), new.email);
    update invites set accepted_at = now() where id = v_invite.id;
  else
    insert into profiles (id, school_id, role, full_name, email)
    values (new.id, null, 'parent',
            new.raw_user_meta_data->>'full_name', new.email);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- 6. RPCs
-- =============================================================================

-- Bootstrap: an authenticated user with no school creates one and becomes admin.
create or replace function create_school_and_admin(p_school_name text, p_full_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if (select school_id from profiles where id = auth.uid()) is not null then
    raise exception 'user already belongs to a school';
  end if;

  v_slug := regexp_replace(lower(trim(p_school_name)), '[^a-z0-9]+', '-', 'g')
            || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into schools (name, slug) values (p_school_name, v_slug)
  returning id into v_school_id;

  update profiles
     set school_id = v_school_id,
         role = 'admin',
         full_name = coalesce(p_full_name, full_name)
   where id = auth.uid();

  return v_school_id;
end;
$$;

-- Staff generates a short, human-readable claim code for a student.
create or replace function generate_claim_code(p_student_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid;
  v_code text;
begin
  if not is_staff() then
    raise exception 'only staff can generate claim codes';
  end if;

  select school_id into v_school_id from students where id = p_student_id;
  if v_school_id is null or v_school_id <> auth_school_id() then
    raise exception 'student not found in your school';
  end if;

  loop
    -- 8 chars, no ambiguous 0/O/1/I
    v_code := upper(
      translate(substr(encode(gen_random_bytes(8), 'base64'), 1, 8),
                '+/=OoIl01', 'ABCDEFGHJ')
    );
    exit when not exists (select 1 from claim_codes where code = v_code);
  end loop;

  insert into claim_codes (school_id, student_id, code, created_by)
  values (v_school_id, p_student_id, v_code, auth.uid());

  return v_code;
end;
$$;

-- Parent redeems a code: attaches them to the school and links the child.
create or replace function redeem_claim_code(p_code text, p_relationship text default 'parent')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cc claim_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_cc from claim_codes
   where code = upper(trim(p_code)) and used_at is null and expires_at > now();

  if not found then
    raise exception 'invalid or expired code';
  end if;

  -- A parent belongs to one school in v1.
  update profiles
     set school_id = v_cc.school_id,
         role = case when role = 'parent' then 'parent' else role end
   where id = auth.uid()
     and (school_id is null or school_id = v_cc.school_id);

  if not found then
    raise exception 'your account is already attached to a different school';
  end if;

  insert into parent_student_links (school_id, parent_id, student_id, relationship)
  values (v_cc.school_id, auth.uid(), v_cc.student_id, p_relationship)
  on conflict (parent_id, student_id) do nothing;

  update claim_codes
     set used_at = now(), used_by = auth.uid()
   where id = v_cc.id;

  return v_cc.student_id;
end;
$$;

grant execute on function create_school_and_admin, generate_claim_code,
  redeem_claim_code to authenticated;

-- =============================================================================
-- 7. ROW LEVEL SECURITY
-- =============================================================================

alter table schools              enable row level security;
alter table profiles             enable row level security;
alter table terms                enable row level security;
alter table classes              enable row level security;
alter table class_teachers       enable row level security;
alter table students             enable row level security;
alter table parent_student_links enable row level security;
alter table claim_codes          enable row level security;
alter table invites              enable row level security;
alter table attendance           enable row level security;
alter table lessons              enable row level security;
alter table announcements        enable row level security;

-- ---------- schools ----------
create policy schools_select on schools for select to authenticated
  using (id = auth_school_id());
create policy schools_update on schools for update to authenticated
  using (id = auth_school_id() and is_admin())
  with check (id = auth_school_id());

-- ---------- profiles ----------
create policy profiles_select_self on profiles for select to authenticated
  using (id = auth.uid());
-- Staff see everyone in their school; parents see only themselves (above).
create policy profiles_select_school on profiles for select to authenticated
  using (school_id = auth_school_id() and is_staff());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = auth_role() and school_id is not distinct from auth_school_id());
create policy profiles_update_admin on profiles for update to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id());

-- ---------- terms ----------
create policy terms_select on terms for select to authenticated
  using (school_id = auth_school_id());
create policy terms_write on terms for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

-- ---------- classes ----------
-- Everyone in the school can read the class list (parents need class names).
create policy classes_select on classes for select to authenticated
  using (school_id = auth_school_id());
create policy classes_write on classes for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

-- ---------- class_teachers ----------
-- Parents need this to see "who teaches my child" — readable school-wide.
create policy class_teachers_select on class_teachers for select to authenticated
  using (school_id = auth_school_id());
create policy class_teachers_write on class_teachers for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

-- ---------- students ----------
create policy students_select_admin on students for select to authenticated
  using (school_id = auth_school_id() and is_admin());
create policy students_select_teacher on students for select to authenticated
  using (school_id = auth_school_id() and teaches_class(class_id));
create policy students_select_parent on students for select to authenticated
  using (is_parent_of(id));
create policy students_write_admin on students for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());
-- Teachers may create students in their own class (fast roster entry).
create policy students_insert_teacher on students for insert to authenticated
  with check (school_id = auth_school_id() and teaches_class(class_id));

-- ---------- parent_student_links ----------
create policy psl_select_own on parent_student_links for select to authenticated
  using (parent_id = auth.uid());
create policy psl_select_staff on parent_student_links for select to authenticated
  using (school_id = auth_school_id() and is_staff());
create policy psl_delete_admin on parent_student_links for delete to authenticated
  using (school_id = auth_school_id() and is_admin());
-- Inserts happen only through redeem_claim_code().

-- ---------- claim_codes ----------
create policy claim_codes_select_staff on claim_codes for select to authenticated
  using (school_id = auth_school_id() and is_staff());
create policy claim_codes_delete_staff on claim_codes for delete to authenticated
  using (school_id = auth_school_id() and is_staff());
-- Inserts happen only through generate_claim_code().

-- ---------- invites ----------
create policy invites_admin on invites for all to authenticated
  using (school_id = auth_school_id() and is_admin())
  with check (school_id = auth_school_id() and is_admin());

-- ---------- attendance ----------
create policy attendance_select_admin on attendance for select to authenticated
  using (school_id = auth_school_id() and is_admin());
create policy attendance_select_teacher on attendance for select to authenticated
  using (school_id = auth_school_id() and teaches_class(class_id));
create policy attendance_select_parent on attendance for select to authenticated
  using (is_parent_of(student_id));
create policy attendance_insert_teacher on attendance for insert to authenticated
  with check (school_id = auth_school_id() and (is_admin() or teaches_class(class_id)));
create policy attendance_update_teacher on attendance for update to authenticated
  using (school_id = auth_school_id() and (is_admin() or teaches_class(class_id)))
  with check (school_id = auth_school_id());
create policy attendance_delete_admin on attendance for delete to authenticated
  using (school_id = auth_school_id() and is_admin());

-- ---------- lessons ----------
create policy lessons_select_staff on lessons for select to authenticated
  using (school_id = auth_school_id() and is_staff());
create policy lessons_select_parent on lessons for select to authenticated
  using (class_id in (select parent_class_ids()));
create policy lessons_insert_teacher on lessons for insert to authenticated
  with check (school_id = auth_school_id() and (is_admin() or teaches_class(class_id)));
create policy lessons_update_teacher on lessons for update to authenticated
  using (school_id = auth_school_id() and (is_admin() or teaches_class(class_id)))
  with check (school_id = auth_school_id());
create policy lessons_delete_owner on lessons for delete to authenticated
  using (school_id = auth_school_id() and (is_admin() or created_by = auth.uid()));

-- ---------- announcements ----------
create policy announcements_select on announcements for select to authenticated
  using (
    school_id = auth_school_id()
    and (
      class_id is null                                   -- school-wide
      or is_staff()
      or class_id in (select parent_class_ids())         -- parent's child's class
    )
  );
create policy announcements_insert_staff on announcements for insert to authenticated
  with check (
    school_id = auth_school_id()
    and (is_admin() or (auth_role() = 'teacher' and class_id is not null and teaches_class(class_id)))
  );
create policy announcements_update_owner on announcements for all to authenticated
  using (school_id = auth_school_id() and (is_admin() or created_by = auth.uid()))
  with check (school_id = auth_school_id());

-- =============================================================================
-- 8. VIEWS
-- security_invoker = true so the caller's RLS still applies.
-- =============================================================================

-- Attendance % per student, all-time and current term.
create view student_attendance_summary
with (security_invoker = true) as
select
  s.id                as student_id,
  s.school_id,
  s.class_id,
  s.first_name,
  s.last_name,
  count(a.id)                                              as days_recorded,
  count(*) filter (where a.status = 'present')             as days_present,
  count(*) filter (where a.status = 'absent')              as days_absent,
  count(*) filter (where a.status = 'late')                as days_late,
  round(
    100.0 * count(*) filter (where a.status in ('present','late'))
    / nullif(count(a.id), 0)
  , 1)                                                     as attendance_pct
from students s
left join attendance a on a.student_id = s.id
where s.is_active
group by s.id;

-- Admin flagged-students view: low attendance or a recent absence streak.
create view flagged_students
with (security_invoker = true) as
select
  s.id            as student_id,
  s.school_id,
  s.class_id,
  c.name          as class_name,
  s.first_name,
  s.last_name,
  sum.attendance_pct,
  sum.days_absent,
  (
    select count(*) from attendance a2
    where a2.student_id = s.id
      and a2.date >= current_date - interval '14 days'
      and a2.status = 'absent'
  ) as absences_last_14_days,
  case
    when sum.attendance_pct < 75 then 'low_attendance'
    when (
      select count(*) from attendance a3
      where a3.student_id = s.id
        and a3.date >= current_date - interval '14 days'
        and a3.status = 'absent'
    ) >= 3 then 'recent_absences'
  end as flag_reason
from students s
join classes c on c.id = s.class_id
join student_attendance_summary sum on sum.student_id = s.id
where s.is_active
  and sum.days_recorded > 0
  and (
    sum.attendance_pct < 75
    or (
      select count(*) from attendance a4
      where a4.student_id = s.id
        and a4.date >= current_date - interval '14 days'
        and a4.status = 'absent'
    ) >= 3
  );

-- Teacher compliance: which classes have no lesson entry today.
-- This is the admin nudge screen that keeps the product from going empty.
create view lesson_posting_today
with (security_invoker = true) as
select
  c.id          as class_id,
  c.school_id,
  c.name        as class_name,
  count(l.id)   as lessons_posted_today,
  (count(l.id) = 0) as missing_today
from classes c
left join lessons l on l.class_id = c.id and l.date = current_date
where c.is_active
group by c.id;

grant select on student_attendance_summary, flagged_students, lesson_posting_today
  to authenticated;
