-- =============================================================================
-- Daymark — student logins via invite, so a child has their own account.
-- =============================================================================

alter table invites
  add column if not exists student_id uuid references students(id) on delete set null;

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
    insert into profiles (id, school_id, role, full_name, email, student_id)
    values (new.id, v_invite.school_id, v_invite.role,
            coalesce(new.raw_user_meta_data->>'full_name', v_invite.full_name),
            new.email, v_invite.student_id);
    update invites set accepted_at = now() where id = v_invite.id;
  else
    insert into profiles (id, school_id, role, full_name, email)
    values (new.id, null, 'parent',
            new.raw_user_meta_data->>'full_name', new.email);
  end if;

  return new;
end;
$$;

-- Admin/proprietor invites a student to log in with their own email.
create or replace function invite_student_login(p_student_id uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_student students%rowtype;
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can invite a student login';
  end if;

  select * into v_student from students where id = p_student_id;
  if not found or v_student.school_id <> auth_school_id() then
    raise exception 'student not found in your school';
  end if;

  insert into invites (school_id, email, role, full_name, student_id, created_by)
  values (
    v_student.school_id,
    lower(trim(p_email)),
    'student',
    trim(v_student.first_name || ' ' || v_student.last_name),
    v_student.id,
    auth.uid()
  )
  on conflict (school_id, email) do update
    set role = 'student',
        student_id = excluded.student_id,
        full_name = excluded.full_name,
        accepted_at = null,
        expires_at = now() + interval '30 days'
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function invite_student_login to authenticated;
