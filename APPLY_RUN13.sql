-- Daymaark Run 13 — paste in Supabase SQL Editor after Run 12.
-- Admission enquiry: public form by school slug, office inbox, enrol to a class.
-- Not a CRM. One form, one list, enrol creates a student on the roster.

do $$ begin
  create type enquiry_status as enum ('new', 'contacted', 'offered', 'enrolled', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists admission_enquiries (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  child_first     text not null,
  child_last      text not null,
  seeking_class   text,
  date_of_birth   date,
  gender          text,
  guardian_name   text not null,
  guardian_phone  text not null,
  guardian_email  text,
  note            text,
  status          enquiry_status not null default 'new',
  staff_note      text,
  student_id      uuid references students(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists admission_enquiries_school_status
  on admission_enquiries (school_id, status, created_at desc);

drop trigger if exists t_enquiries_updated on admission_enquiries;
create trigger t_enquiries_updated
  before update on admission_enquiries
  for each row execute function set_updated_at();

alter table admission_enquiries enable row level security;

drop policy if exists enquiries_select_staff on admission_enquiries;
create policy enquiries_select_staff on admission_enquiries for select to authenticated
  using (school_id = auth_school_id() and is_staff());

grant select on admission_enquiries to authenticated;

create or replace function school_for_apply(p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school schools%rowtype;
begin
  if p_slug is null or length(trim(p_slug)) < 2 then
    raise exception 'school not found';
  end if;
  select * into v_school from schools where slug = lower(trim(p_slug));
  if not found then
    raise exception 'school not found';
  end if;
  return jsonb_build_object('id', v_school.id, 'name', v_school.name, 'slug', v_school.slug);
end;
$$;

grant execute on function school_for_apply(text) to anon, authenticated;

create or replace function submit_admission_enquiry(
  p_slug text,
  p_child_first text,
  p_child_last text,
  p_seeking_class text,
  p_date_of_birth date,
  p_gender text,
  p_guardian_name text,
  p_guardian_phone text,
  p_guardian_email text,
  p_note text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_id uuid;
  v_first text;
  v_last text;
  v_gname text;
  v_phone text;
  v_email text;
  v_class text;
  v_gender text;
  v_note text;
begin
  select id into v_school from schools where slug = lower(trim(p_slug));
  if v_school is null then
    raise exception 'school not found';
  end if;

  v_first := left(btrim(coalesce(p_child_first, '')), 60);
  v_last := left(btrim(coalesce(p_child_last, '')), 60);
  v_gname := left(btrim(coalesce(p_guardian_name, '')), 80);
  v_phone := regexp_replace(coalesce(p_guardian_phone, ''), '\D', '', 'g');
  v_email := nullif(lower(left(btrim(coalesce(p_guardian_email, '')), 120)), '');
  v_class := nullif(left(btrim(coalesce(p_seeking_class, '')), 40), '');
  v_gender := nullif(lower(left(btrim(coalesce(p_gender, '')), 16)), '');
  v_note := nullif(left(btrim(coalesce(p_note, '')), 280), '');

  if length(v_first) < 1 or length(v_last) < 1 then
    raise exception 'child name is required';
  end if;
  if length(v_gname) < 2 then
    raise exception 'guardian name is required';
  end if;
  if length(v_phone) < 10 or length(v_phone) > 15 then
    raise exception 'enter a valid phone number';
  end if;
  if v_gender is not null and v_gender not in ('girl', 'boy', 'other') then
    v_gender := null;
  end if;

  if exists (
    select 1 from admission_enquiries
     where school_id = v_school
       and guardian_phone = v_phone
       and lower(child_first) = lower(v_first)
       and lower(child_last) = lower(v_last)
       and created_at > now() - interval '24 hours'
  ) then
    raise exception 'this enquiry was already sent today';
  end if;

  if (
    select count(*) from admission_enquiries
     where school_id = v_school
       and guardian_phone = v_phone
       and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'too many enquiries from this number today';
  end if;

  insert into admission_enquiries (
    school_id, child_first, child_last, seeking_class, date_of_birth, gender,
    guardian_name, guardian_phone, guardian_email, note
  ) values (
    v_school, v_first, v_last, v_class, p_date_of_birth, v_gender,
    v_gname, v_phone, v_email, v_note
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function submit_admission_enquiry(text, text, text, text, date, text, text, text, text, text)
  to anon, authenticated;

create or replace function list_admission_enquiries()
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
    raise exception 'only an administrator or proprietor can list enquiries';
  end if;
  v_school := auth_school_id();
  if v_school is null then
    raise exception 'no school on this account';
  end if;

  select coalesce(jsonb_agg(row_json order by created_at desc), '[]'::jsonb)
    into v_out
  from (
    select jsonb_build_object(
      'id', e.id,
      'child_first', e.child_first,
      'child_last', e.child_last,
      'seeking_class', e.seeking_class,
      'date_of_birth', e.date_of_birth,
      'gender', e.gender,
      'guardian_name', e.guardian_name,
      'guardian_phone', e.guardian_phone,
      'guardian_email', e.guardian_email,
      'note', e.note,
      'status', e.status,
      'staff_note', e.staff_note,
      'student_id', e.student_id,
      'created_at', e.created_at
    ) as row_json,
    e.created_at
    from admission_enquiries e
    where e.school_id = v_school
    order by e.created_at desc
    limit 200
  ) t;

  return v_out;
end;
$$;

grant execute on function list_admission_enquiries() to authenticated;

create or replace function set_enquiry_status(
  p_enquiry_id uuid,
  p_status enquiry_status,
  p_staff_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row admission_enquiries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not is_admin() then
    raise exception 'only an administrator or proprietor can update an enquiry';
  end if;

  select * into v_row from admission_enquiries where id = p_enquiry_id;
  if not found or v_row.school_id is distinct from auth_school_id() then
    raise exception 'enquiry not found';
  end if;
  if v_row.status = 'enrolled' and p_status is distinct from 'enrolled' then
    raise exception 'an enrolled enquiry stays on the roster; remove the student from the class page';
  end if;

  update admission_enquiries
     set status = p_status,
         staff_note = case
           when p_staff_note is null then staff_note
           else nullif(left(btrim(p_staff_note), 280), '')
         end
   where id = p_enquiry_id;
end;
$$;

grant execute on function set_enquiry_status(uuid, enquiry_status, text) to authenticated;

create or replace function enrol_enquiry(p_enquiry_id uuid, p_class_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_row admission_enquiries%rowtype;
  v_class classes%rowtype;
  v_student uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not is_admin() then
    raise exception 'only an administrator or proprietor can enrol an enquiry';
  end if;

  select * into v_row from admission_enquiries where id = p_enquiry_id;
  if not found or v_row.school_id is distinct from auth_school_id() then
    raise exception 'enquiry not found';
  end if;
  if v_row.status = 'enrolled' and v_row.student_id is not null then
    return v_row.student_id;
  end if;

  select * into v_class from classes
   where id = p_class_id and school_id = v_row.school_id and is_active;
  if not found then
    raise exception 'class not found in your school';
  end if;

  insert into students (school_id, class_id, first_name, last_name, date_of_birth, gender)
  values (
    v_row.school_id,
    v_class.id,
    v_row.child_first,
    v_row.child_last,
    v_row.date_of_birth,
    v_row.gender
  )
  returning id into v_student;

  update admission_enquiries
     set status = 'enrolled', student_id = v_student
   where id = p_enquiry_id;

  return v_student;
end;
$$;

grant execute on function enrol_enquiry(uuid, uuid) to authenticated;
