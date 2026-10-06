-- Teachers (and all staff) may add, edit and remove timetable periods
-- for their school. Admin / proprietor still see the full week.

drop policy if exists timetable_write_staff on timetable_slots;
create policy timetable_write_staff on timetable_slots for all to authenticated
  using (school_id = auth_school_id() and is_staff())
  with check (school_id = auth_school_id() and is_staff());
