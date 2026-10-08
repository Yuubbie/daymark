-- Daymaark Run 8 — paste in Supabase SQL Editor after Run 7.
-- Lets an unattached signup claim a pending student/staff invite by email.

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
    -- Pending invite: unattached parent becomes student / teacher / admin.
    elsif old.school_id is null
       and new.school_id is not null
       and old.role = 'parent'
       and new.role in ('student', 'teacher', 'admin') then
      null;
    elsif old.role = 'proprietor' then
      raise exception 'the proprietor seat cannot be changed this way';
    elsif new.role = 'proprietor' then
      raise exception 'cannot appoint another proprietor this way';
    elsif not is_proprietor() and not is_admin() then
      raise exception 'cannot change roles';
    end if;
  end if;
  if new.student_id is distinct from old.student_id
     and not is_admin()
     and not (
       old.school_id is null
       and new.student_id is not null
       and new.role = 'student'
     ) then
    raise exception 'cannot rebind student login';
  end if;
  return new;
end;
$$;

create or replace function claim_pending_invite()
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_invite invites%rowtype;
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return false;
  end if;

  select email into v_email from profiles where id = v_uid;
  if v_email is null then
    select email into v_email from auth.users where id = v_uid;
  end if;
  if v_email is null then
    return false;
  end if;

  if exists (
    select 1 from profiles
     where id = v_uid
       and school_id is not null
       and (role <> 'parent' or student_id is not null)
  ) then
    return false;
  end if;

  select * into v_invite
  from invites
  where lower(email) = lower(v_email)
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  update profiles
     set school_id = v_invite.school_id,
         role = v_invite.role,
         student_id = v_invite.student_id,
         full_name = coalesce(full_name, v_invite.full_name),
         email = coalesce(email, v_email)
   where id = v_uid;

  update invites set accepted_at = now() where id = v_invite.id;
  return true;
end;
$$;

grant execute on function claim_pending_invite to authenticated;

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
  order by created_at desc
  limit 1;

  if found then
    insert into profiles (id, school_id, role, full_name, email, student_id)
    values (
      new.id,
      v_invite.school_id,
      v_invite.role,
      coalesce(new.raw_user_meta_data->>'full_name', v_invite.full_name),
      new.email,
      v_invite.student_id
    )
    on conflict (id) do update
      set school_id = excluded.school_id,
          role = excluded.role,
          student_id = excluded.student_id,
          email = excluded.email;
    update invites set accepted_at = now() where id = v_invite.id;
  else
    insert into profiles (id, school_id, role, full_name, email)
    values (new.id, null, 'parent', new.raw_user_meta_data->>'full_name', new.email)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
