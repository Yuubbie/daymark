-- Daymaark Run 3 — paste in Supabase SQL Editor after Run 2.
-- Lets teachers add timetable periods. Admin still sees every class week.

drop policy if exists timetable_write_staff on timetable_slots;
create policy timetable_write_staff on timetable_slots for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());
