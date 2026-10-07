-- Daymaark Run 6 — paste in Supabase SQL Editor after Run 5.
-- Unblocks first-time school create (parent with no school becomes proprietor).

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
    elsif old.role = 'proprietor' then
      raise exception 'the proprietor seat cannot be changed this way';
    elsif new.role = 'proprietor' then
      raise exception 'cannot appoint another proprietor this way';
    elsif not is_proprietor() and not is_admin() then
      raise exception 'cannot change roles';
    end if;
  end if;
  if new.student_id is distinct from old.student_id and not is_admin() then
    raise exception 'cannot rebind student login';
  end if;
  return new;
end;
$$;
