-- Daymaark Run 22 — Greenfield demo: HR, clinic, report comments, household.
-- Paste in Supabase SQL Editor AFTER Run 19 (demo school) and Run 21 (HR/clinic).
-- Safe to re-run. Other schools are untouched.
--
-- Password for every demo login: DaymaarkDemo2026
--
--   hr.demo@daymaark.app           Mrs. Halima Sani      /hr
--   clinic.demo@daymaark.app       Nurse Amaka Cole      /clinic
--   teacher2.demo@daymaark.app     Mr. Tunde Adewale     /teacher  (absent today)
--   teacher3.demo@daymaark.app     Ms. Chioma Nnaji      /teacher  (sick today)
--
-- Library has no table yet (Coming soon page). Nothing to seed.
-- Parent household: Adaeze Okonkwo + Kamsi Okonkwo on parent.demo@daymaark.app

create extension if not exists pgcrypto with schema extensions;

create or replace function demo_ensure_user(p_email text, p_name text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_id uuid;
  v_instance uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email);
  if found then
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           confirmation_token = '',
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
             || jsonb_build_object('full_name', p_name, 'email_verified', true),
           updated_at = now()
     where id = v_id;
    return v_id;
  end if;

  v_id := gen_random_uuid();
  v_instance := coalesce(
    (select instance_id from auth.users limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    v_instance, v_id, 'authenticated', 'authenticated', lower(p_email),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name, 'email_verified', true),
    now(), now(), '', '', '', ''
  );

  begin
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id,
      jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
      'email', v_id::text, now(), now(), now()
    );
  exception when others then
    begin
      insert into auth.identities (
        id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_id,
        jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
        'email', now(), now(), now()
      );
    exception when others then
      null;
    end;
  end;

  return v_id;
end;
$$;

do $$
declare
  v_pw text := 'DaymaarkDemo2026';
  v_school uuid;
  v_term uuid;
  v_jss1a uuid;
  v_p4a uuid;
  v_prop uuid;
  v_admin uuid;
  v_teach uuid;
  v_hr uuid;
  v_clinic uuid;
  v_teach2 uuid;
  v_teach3 uuid;
  v_parent uuid;
  v_adaeze uuid;
  v_kamsi uuid;
  v_tunde uuid;
  v_bola uuid;
  v_ibrahim uuid;
  v_sade uuid;
  v_exam uuid;
  v_q3 uuid;
  v_dow int;
begin
  if to_regclass('public.staff_attendance') is null
     or to_regclass('public.clinic_visits') is null
     or to_regclass('public.report_comments') is null then
    raise exception 'Run 21 is missing. Paste APPLY_RUN21.sql first, then this file.';
  end if;

  select id into v_school from schools where slug = 'greenfield-demo';
  if v_school is null then
    raise exception 'Greenfield demo school not found. Paste APPLY_RUN19.sql first.';
  end if;

  select id into v_term from terms where school_id = v_school and is_current limit 1;
  select id into v_jss1a from classes where school_id = v_school and name = 'JSS 1A';
  select id into v_p4a from classes where school_id = v_school and name = 'Primary 4A';
  select id into v_prop from profiles where email = 'proprietor.demo@daymaark.app' and school_id = v_school;
  select id into v_admin from profiles where email = 'admin.demo@daymaark.app' and school_id = v_school;
  select id into v_teach from profiles where email = 'teacher.demo@daymaark.app' and school_id = v_school;
  select id into v_parent from profiles where email = 'parent.demo@daymaark.app' and school_id = v_school;
  select id into v_adaeze from students where school_id = v_school and admission_number = 'GFA-2401';
  select id into v_tunde from students where school_id = v_school and admission_number = 'GFA-2407';
  select id into v_bola from students where school_id = v_school and admission_number = 'GFA-2403';
  select id into v_ibrahim from students where school_id = v_school and admission_number = 'GFA-2405';
  select id into v_sade from students where school_id = v_school and admission_number = 'GFA-1401';

  if v_prop is null or v_adaeze is null then
    raise exception 'Greenfield seats are incomplete. Re-run APPLY_RUN19.sql, then this file.';
  end if;

  v_hr     := demo_ensure_user('hr.demo@daymaark.app',       'Mrs. Halima Sani',  v_pw);
  v_clinic := demo_ensure_user('clinic.demo@daymaark.app',   'Nurse Amaka Cole',  v_pw);
  v_teach2 := demo_ensure_user('teacher2.demo@daymaark.app', 'Mr. Tunde Adewale', v_pw);
  v_teach3 := demo_ensure_user('teacher3.demo@daymaark.app', 'Ms. Chioma Nnaji',  v_pw);

  insert into profiles (id, role, full_name, email)
  values
    (v_hr,     'parent', 'Mrs. Halima Sani',  'hr.demo@daymaark.app'),
    (v_clinic, 'parent', 'Nurse Amaka Cole',  'clinic.demo@daymaark.app'),
    (v_teach2, 'parent', 'Mr. Tunde Adewale', 'teacher2.demo@daymaark.app'),
    (v_teach3, 'parent', 'Ms. Chioma Nnaji',  'teacher3.demo@daymaark.app')
  on conflict (id) do nothing;

  begin
    alter table profiles disable trigger t_protect_profile_role;
  exception when undefined_object then
    null;
  end;

  update profiles
     set school_id = v_school,
         role = 'hr',
         full_name = 'Mrs. Halima Sani',
         email = 'hr.demo@daymaark.app',
         phone = '08072219033',
         is_active = true
   where id = v_hr;

  update profiles
     set school_id = v_school,
         role = 'clinic',
         full_name = 'Nurse Amaka Cole',
         email = 'clinic.demo@daymaark.app',
         phone = '08081120447',
         is_active = true
   where id = v_clinic;

  update profiles
     set school_id = v_school,
         role = 'teacher',
         full_name = 'Mr. Tunde Adewale',
         email = 'teacher2.demo@daymaark.app',
         phone = '08045501920',
         is_active = true
   where id = v_teach2;

  update profiles
     set school_id = v_school,
         role = 'teacher',
         full_name = 'Ms. Chioma Nnaji',
         email = 'teacher3.demo@daymaark.app',
         phone = '08093301811',
         is_active = true
   where id = v_teach3;

  insert into invites (school_id, email, role, full_name, created_by, accepted_at)
  values
    (v_school, 'hr.demo@daymaark.app',       'hr',     'Mrs. Halima Sani',  v_prop, now()),
    (v_school, 'clinic.demo@daymaark.app',   'clinic', 'Nurse Amaka Cole',  v_prop, now()),
    (v_school, 'teacher2.demo@daymaark.app', 'teacher','Mr. Tunde Adewale', v_prop, now()),
    (v_school, 'teacher3.demo@daymaark.app', 'teacher','Ms. Chioma Nnaji',  v_prop, now())
  on conflict (school_id, email) do update
     set role = excluded.role,
         full_name = excluded.full_name,
         accepted_at = coalesce(invites.accepted_at, now());

  if v_jss1a is not null and v_teach2 is not null then
    insert into class_teachers (school_id, class_id, teacher_id, subject, is_form_teacher)
    values (v_school, v_jss1a, v_teach2, 'Social Studies', false)
    on conflict (class_id, teacher_id, subject) do nothing;
  end if;

  if v_p4a is not null and v_teach3 is not null then
    insert into class_teachers (school_id, class_id, teacher_id, subject, is_form_teacher)
    values (v_school, v_p4a, v_teach3, null, true)
    on conflict (class_id, teacher_id, subject) do nothing;
  end if;

  -- Sibling on the same parent login so Household fees has two children.
  if v_p4a is not null then
    select id into v_kamsi
      from students
     where school_id = v_school and admission_number = 'GFA-1405';
    if v_kamsi is null then
      insert into students (
        school_id, class_id, first_name, last_name,
        admission_number, date_of_birth, gender, fee_cleared
      ) values (
        v_school, v_p4a, 'Kamsi', 'Okonkwo',
        'GFA-1405', '2016-08-22', 'male', true
      )
      returning id into v_kamsi;
    else
      update students
         set class_id = v_p4a,
             first_name = 'Kamsi',
             last_name = 'Okonkwo',
             fee_cleared = true,
             is_active = true
       where id = v_kamsi;
    end if;

    if v_parent is not null then
      insert into parent_student_links (school_id, parent_id, student_id, relationship, is_primary)
      values (v_school, v_parent, v_kamsi, 'mother', false)
      on conflict (parent_id, student_id) do nothing;
    end if;
  end if;

  delete from staff_attendance where school_id = v_school;

  insert into staff_attendance (school_id, staff_id, date, status, note, marked_by)
  select
    v_school,
    p.id,
    d::date,
    case
      when p.email = 'teacher2.demo@daymaark.app' and d::date = current_date then 'absent'
      when p.email = 'teacher3.demo@daymaark.app' and d::date = current_date then 'sick'
      when p.email = 'teacher3.demo@daymaark.app' and extract(isodow from d) = 3 then 'sick'
      when p.email = 'teacher2.demo@daymaark.app' and extract(isodow from d) = 1 then 'absent'
      else 'present'
    end,
    case
      when p.email = 'teacher2.demo@daymaark.app' and d::date = current_date then 'Family errand, called in'
      when p.email = 'teacher3.demo@daymaark.app' and d::date = current_date then 'Malaria, clinic confirmed'
      else null
    end,
    v_hr
  from profiles p
  cross join generate_series(current_date - 9, current_date, interval '1 day') d
  where p.school_id = v_school
    and p.is_active
    and p.role::text in ('proprietor','admin','teacher','hr','clinic')
    and extract(isodow from d) between 1 and 5;

  delete from clinic_visits where school_id = v_school;

  if v_tunde is not null then
    insert into clinic_visits (school_id, student_id, visit_at, complaint, treatment, sent_home, recorded_by)
    values (
      v_school, v_tunde, now() - interval '2 hours 10 minutes',
      'Fever. Mother called this morning.',
      'Temperature 38.6. Paracetamol. Rest in sick bay, then sent home.',
      true, v_clinic
    );
  end if;

  if v_bola is not null then
    insert into clinic_visits (school_id, student_id, visit_at, complaint, treatment, sent_home, recorded_by)
    values (
      v_school, v_bola, now() - interval '1 day 3 hours',
      'Headache after assembly.',
      'Water, rest, returned to class after second period.',
      false, v_clinic
    );
  end if;

  if v_sade is not null then
    insert into clinic_visits (school_id, student_id, visit_at, complaint, treatment, sent_home, recorded_by)
    values (
      v_school, v_sade, now() - interval '3 days 5 hours',
      'Cut on the left knee at break.',
      'Cleaned, plastered. Parent not called.',
      false, v_clinic
    );
  end if;

  if v_ibrahim is not null then
    insert into clinic_visits (school_id, student_id, visit_at, complaint, treatment, sent_home, recorded_by)
    values (
      v_school, v_ibrahim, now() - interval '6 days 2 hours',
      'Stomach ache. Skipped breakfast.',
      'ORS, observation. Returned to class.',
      false, v_clinic
    );
  end if;

  if v_term is not null then
    if v_adaeze is not null then
      insert into report_comments (
        school_id, student_id, term_id,
        class_teacher_comment, principal_comment, updated_by
      ) values (
        v_school, v_adaeze, v_term,
        'Adaeze is steady and kind. Mathematics is her strongest seat. Keep the reading at home.',
        'A credit to JSS 1A. Promote this consistency into the examination.',
        v_teach
      )
      on conflict (student_id, term_id) do update
        set class_teacher_comment = excluded.class_teacher_comment,
            principal_comment = excluded.principal_comment,
            updated_by = excluded.updated_by,
            updated_at = now();
    end if;

    if v_bola is not null then
      insert into report_comments (
        school_id, student_id, term_id,
        class_teacher_comment, principal_comment, updated_by
      ) values (
        v_school, v_bola, v_term,
        'Bola is bright but late on Wednesdays. Punctuality first, then the work will follow.',
        'Attendance must hold. The office will speak with the guardian.',
        v_teach
      )
      on conflict (student_id, term_id) do update
        set class_teacher_comment = excluded.class_teacher_comment,
            principal_comment = excluded.principal_comment,
            updated_by = excluded.updated_by,
            updated_at = now();
    end if;

    if v_tunde is not null then
      insert into report_comments (
        school_id, student_id, term_id,
        class_teacher_comment, principal_comment, updated_by
      ) values (
        v_school, v_tunde, v_term,
        'Tunde tries. Mondays are the weak mark. Work sent home when he is away.',
        'Health first. The register will recover if the absences stop.',
        v_prop
      )
      on conflict (student_id, term_id) do update
        set class_teacher_comment = excluded.class_teacher_comment,
            principal_comment = excluded.principal_comment,
            updated_by = excluded.updated_by,
            updated_at = now();
    end if;
  end if;

  -- Approve Adaeze's CA so the term card has a subject line.
  select e.id into v_exam
    from exams e
   where e.school_id = v_school
     and e.title = 'JSS 1 Mathematics CA 1'
   limit 1;

  if v_exam is not null and v_adaeze is not null then
    select q.id into v_q3
      from exam_questions eq
      join questions q on q.id = eq.question_id
     where eq.exam_id = v_exam
       and q.question_type = 'subjective'
     limit 1;

    if v_q3 is not null then
      update exam_answers a
         set is_correct = true,
             marks_awarded = 3,
             feedback = 'Clear algebra. One arithmetic slip on the last line.',
             marked_by = v_teach,
             marked_at = now() - interval '1 hour'
        from exam_attempts t
       where a.attempt_id = t.id
         and t.exam_id = v_exam
         and t.student_id = v_adaeze
         and a.question_id = v_q3;
    end if;

    update exam_attempts
       set status = 'marked',
           result_status = 'approved',
           score = 9,
           total_marks = 10,
           marked_by = v_teach,
           marked_at = now() - interval '1 hour',
           reviewed_by = v_prop,
           reviewed_at = now() - interval '40 minutes'
     where exam_id = v_exam
       and student_id = v_adaeze;
  end if;

  -- Household statement: JSS 1A already has a fee structure from Run 19.
  -- Add Primary 4A so Kamsi appears on the parent Fees page.
  begin
    if to_regclass('public.fee_structures') is not null and v_p4a is not null then
      if not exists (
        select 1 from fee_structures
         where school_id = v_school
           and class_id = v_p4a
           and term = 'First Term 2026/2027'
      ) then
        insert into fee_structures (school_id, class_id, term, total_amount_naira)
        values (v_school, v_p4a, 'First Term 2026/2027', 90000);
      end if;

      if to_regclass('public.fee_installments') is not null then
        insert into fee_installments (fee_structure_id, label, amount_naira, sequence_order)
        select fs.id, x.label, x.amount, x.seq
          from fee_structures fs
          cross join (
            values
              ('First instalment', 50000, 1),
              ('Second instalment', 40000, 2)
          ) as x(label, amount, seq)
         where fs.school_id = v_school
           and fs.class_id = v_p4a
           and fs.term = 'First Term 2026/2027'
           and not exists (
             select 1 from fee_installments i
              where i.fee_structure_id = fs.id and i.sequence_order = x.seq
           );
      end if;
    end if;
  exception when others then
    raise notice 'fee tables skipped: %', sqlerrm;
  end;

  -- Mark Adaeze first instalment paid so household shows mixed (one child due).
  begin
    if to_regclass('public.fee_payments') is not null and v_adaeze is not null then
      insert into fee_payments (school_id, student_id, fee_installment_id, amount_naira, status, paid_at)
      select v_school, v_adaeze, i.id, i.amount_naira, 'success', now() - interval '12 days'
        from fee_structures fs
        join fee_installments i on i.fee_structure_id = fs.id
       where fs.school_id = v_school
         and fs.class_id = v_jss1a
         and i.sequence_order = 1
         and not exists (
           select 1 from fee_payments p
            where p.student_id = v_adaeze
              and p.fee_installment_id = i.id
              and p.status = 'success'
         );
    end if;
  exception when others then
    raise notice 'fee_payments skipped: %', sqlerrm;
  end;

  v_dow := extract(isodow from current_date)::int;
  if v_dow between 1 and 5 and v_jss1a is not null then
    insert into announcements (school_id, class_id, title, body, created_by, audience, pinned)
    select
      v_school, null,
      'Clinic and HR desks are live',
      'Nurse Cole keeps the sick-bay book. Mrs. Sani marks staff in and out each morning. Parents never see either sheet.',
      v_prop, 'staff', false
    where not exists (
      select 1 from announcements
       where school_id = v_school and title = 'Clinic and HR desks are live'
    );
  end if;

  begin
    alter table profiles enable trigger t_protect_profile_role;
  exception when undefined_object then
    null;
  end;

  raise notice 'Greenfield office desks ready. HR %, clinic %, school %', v_hr, v_clinic, v_school;
end;
$$;

drop function if exists demo_ensure_user(text, text, text);
