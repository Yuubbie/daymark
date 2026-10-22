-- Daymaark Run 18 — ops may remove a school.
-- Test schools, abandoned trials. Type the name exactly. Profiles are
-- unhooked first so the two ops logins survive even if they sat in that
-- school. Parent and student rows cascade with the school.
--
-- Paste in Supabase SQL Editor after Run 17.

create or replace function ops_remove_school(
  p_school_id uuid,
  p_confirm_name text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  if not is_platform_admin() then
    raise exception 'forbidden';
  end if;

  if p_confirm_name is null or length(trim(p_confirm_name)) = 0 then
    raise exception 'type the school name exactly to remove it';
  end if;

  select name into v_name from schools where id = p_school_id;
  if not found then
    raise exception 'school not found';
  end if;

  if lower(trim(v_name)) is distinct from lower(trim(p_confirm_name)) then
    raise exception 'type the school name exactly to remove it';
  end if;

  update profiles set school_id = null where school_id = p_school_id;
  delete from schools where id = p_school_id;
end;
$$;

revoke all on function ops_remove_school from public, anon;
grant execute on function ops_remove_school(uuid, text) to authenticated;
