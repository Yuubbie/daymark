-- Daymaark Run 19 — Greenfield Academy demo school.
-- Paste in Supabase SQL Editor (once). Safe to re-run: wipes this school only
-- and rebuilds it. Other schools are untouched.
--
-- Password for every demo login: DaymaarkDemo2026
--
--   proprietor.demo@daymaark.app   Mrs. Funke Adeyemi    /admin
--   admin.demo@daymaark.app        Mr. Chuka Okafor      /admin
--   teacher.demo@daymaark.app      Mrs. Ngozi Bello      /teacher
--   parent.demo@daymaark.app       Mrs. Ifeoma Okonkwo   /parent  (Adaeze)
--   student.demo@daymaark.app      Adaeze Okonkwo        /student
--
-- Apply:  /apply/greenfield-demo
-- Sit:    /sit/greenfield-maths-ca
-- Claim:  ADAEZE01

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
  v_prop uuid;
  v_admin uuid;
  v_teach uuid;
  v_parent uuid;
  v_stu_user uuid;
  v_school uuid;
  v_term uuid;
  v_jss1a uuid;
  v_jss1b uuid;
  v_p4a uuid;
  v_adaeze uuid;
  v_chinedu uuid;
  v_bola uuid;
  v_fatima uuid;
  v_ibrahim uuid;
  v_amaka uuid;
  v_tunde uuid;
  v_zainab uuid;
  v_bank_math uuid;
  v_bank_eng uuid;
  v_q1 uuid;
  v_q2 uuid;
  v_q3 uuid;
  v_q4 uuid;
  v_q5 uuid;
  v_exam_ca uuid;
  v_exam_term uuid;
  v_exam_int uuid;
  v_attempt uuid;
  v_attempt2 uuid;
  v_fee uuid;
begin
  v_prop   := demo_ensure_user('proprietor.demo@daymaark.app', 'Mrs. Funke Adeyemi', v_pw);
  v_admin  := demo_ensure_user('admin.demo@daymaark.app',      'Mr. Chuka Okafor',   v_pw);
  v_teach  := demo_ensure_user('teacher.demo@daymaark.app',    'Mrs. Ngozi Bello',   v_pw);
  v_parent := demo_ensure_user('parent.demo@daymaark.app',     'Mrs. Ifeoma Okonkwo', v_pw);
  v_stu_user := demo_ensure_user('student.demo@daymaark.app',  'Adaeze Okonkwo',     v_pw);

  insert into profiles (id, role, full_name, email)
  values
    (v_prop,   'parent', 'Mrs. Funke Adeyemi',  'proprietor.demo@daymaark.app'),
    (v_admin,  'parent', 'Mr. Chuka Okafor',    'admin.demo@daymaark.app'),
    (v_teach,  'parent', 'Mrs. Ngozi Bello',    'teacher.demo@daymaark.app'),
    (v_parent, 'parent', 'Mrs. Ifeoma Okonkwo', 'parent.demo@daymaark.app'),
    (v_stu_user, 'parent', 'Adaeze Okonkwo',    'student.demo@daymaark.app')
  on conflict (id) do nothing;

  begin
    alter table profiles disable trigger t_protect_profile_role;
  exception when undefined_object then
    null;
  end;

  update profiles
     set school_id = null, student_id = null
   where school_id in (select id from schools where slug = 'greenfield-demo');
  delete from schools where slug = 'greenfield-demo';

  insert into schools (name, slug, address, phone, subscription_status)
  values (
    'Greenfield Academy',
    'greenfield-demo',
    '14 Adeola Odeku Street, Victoria Island, Lagos',
    '08034412290',
    'trial'
  )
  returning id into v_school;

  update profiles
     set school_id = v_school,
         role = 'proprietor',
         full_name = 'Mrs. Funke Adeyemi',
         email = 'proprietor.demo@daymaark.app',
         phone = '08034412290',
         is_active = true
   where id = v_prop;

  update profiles
     set school_id = v_school,
         role = 'admin',
         full_name = 'Mr. Chuka Okafor',
         email = 'admin.demo@daymaark.app',
         phone = '08053321104',
         is_active = true
   where id = v_admin;

  update profiles
     set school_id = v_school,
         role = 'teacher',
         full_name = 'Mrs. Ngozi Bello',
         email = 'teacher.demo@daymaark.app',
         phone = '08061120918',
         is_active = true
   where id = v_teach;

  insert into terms (school_id, name, start_date, end_date, is_current)
  values (v_school, 'First Term 2026/2027', '2026-09-08', '2026-12-11', true)
  returning id into v_term;

  insert into classes (school_id, name, level) values (v_school, 'JSS 1A', 'JSS 1') returning id into v_jss1a;
  insert into classes (school_id, name, level) values (v_school, 'JSS 1B', 'JSS 1') returning id into v_jss1b;
  insert into classes (school_id, name, level) values (v_school, 'Primary 4A', 'Primary 4') returning id into v_p4a;

  insert into class_teachers (school_id, class_id, teacher_id, subject, is_form_teacher)
  values
    (v_school, v_jss1a, v_teach, null, true),
    (v_school, v_jss1a, v_teach, 'Mathematics', false),
    (v_school, v_jss1a, v_teach, 'English Language', false);

  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Adaeze',  'Okonkwo', 'GFA-2401', '2013-03-18', 'female', true)
  returning id into v_adaeze;
  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Chinedu', 'Eze',     'GFA-2402', '2013-07-02', 'male', true)
  returning id into v_chinedu;
  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Bola',    'Adeyemi', 'GFA-2403', '2013-11-21', 'female', true)
  returning id into v_bola;
  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Fatima',  'Bello',   'GFA-2404', '2013-01-09', 'female', true)
  returning id into v_fatima;
  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Ibrahim', 'Sule',    'GFA-2405', '2013-05-14', 'male', true)
  returning id into v_ibrahim;
  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Amaka',   'Nwosu',   'GFA-2406', '2013-09-30', 'female', true)
  returning id into v_amaka;
  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Tunde',   'Balogun', 'GFA-2407', '2013-02-27', 'male', false)
  returning id into v_tunde;
  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1a, 'Zainab',  'Yusuf',   'GFA-2408', '2013-12-05', 'female', true)
  returning id into v_zainab;

  insert into students (school_id, class_id, first_name, last_name, admission_number, date_of_birth, gender, fee_cleared)
  values
    (v_school, v_jss1b, 'Emeka',  'Obi',     'GFA-2411', '2013-04-11', 'male', true),
    (v_school, v_jss1b, 'Hauwa',  'Garba',   'GFA-2412', '2013-08-19', 'female', true),
    (v_school, v_jss1b, 'Kunle',  'Ajayi',   'GFA-2413', '2013-06-03', 'male', true),
    (v_school, v_jss1b, 'Ngozi',  'Ike',     'GFA-2414', '2013-10-22', 'female', true),
    (v_school, v_p4a,   'Sade',   'Williams','GFA-1401', '2016-02-14', 'female', true),
    (v_school, v_p4a,   'Tobi',   'Adekunle','GFA-1402', '2016-05-08', 'male', true),
    (v_school, v_p4a,   'Aisha',  'Musa',    'GFA-1403', '2016-09-01', 'female', true),
    (v_school, v_p4a,   'David',  'Okoro',   'GFA-1404', '2016-11-17', 'male', true);

  update profiles
     set school_id = v_school,
         role = 'parent',
         full_name = 'Mrs. Ifeoma Okonkwo',
         email = 'parent.demo@daymaark.app',
         phone = '08021184402',
         is_active = true
   where id = v_parent;

  insert into parent_student_links (school_id, parent_id, student_id, relationship, is_primary)
  values (v_school, v_parent, v_adaeze, 'mother', true)
  on conflict (parent_id, student_id) do nothing;

  update profiles
     set school_id = v_school,
         role = 'student',
         full_name = 'Adaeze Okonkwo',
         email = 'student.demo@daymaark.app',
         student_id = v_adaeze,
         is_active = true
   where id = v_stu_user;

  insert into claim_codes (school_id, student_id, code, created_by, expires_at)
  values (v_school, v_adaeze, 'ADAEZE01', v_prop, now() + interval '90 days')
  on conflict (code) do nothing;

  insert into invites (school_id, email, role, full_name, created_by, accepted_at)
  values
    (v_school, 'admin.demo@daymaark.app',   'admin',   'Mr. Chuka Okafor',  v_prop, now()),
    (v_school, 'teacher.demo@daymaark.app', 'teacher', 'Mrs. Ngozi Bello',  v_prop, now()),
    (v_school, 'student.demo@daymaark.app', 'student', 'Adaeze Okonkwo',    v_prop, now())
  on conflict (school_id, email) do nothing;

  insert into invites (school_id, email, role, full_name, created_by)
  values (v_school, 'eze.pending@greenfield.demo', 'teacher', 'Mrs. Eze', v_prop)
  on conflict (school_id, email) do nothing;

  insert into attendance (school_id, class_id, student_id, date, status, note, marked_by)
  select
    v_school,
    v_jss1a,
    s.id,
    d::date,
    case
      when s.admission_number = 'GFA-2407' and extract(isodow from d) = 1 then 'absent'::attendance_status
      when s.admission_number = 'GFA-2403' and extract(isodow from d) = 3 then 'late'::attendance_status
      else 'present'::attendance_status
    end,
    case
      when s.admission_number = 'GFA-2407' and extract(isodow from d) = 1 then 'Fever, mother called'
      when s.admission_number = 'GFA-2403' and extract(isodow from d) = 3 then 'Came after assembly'
      else null
    end,
    v_teach
  from students s
  cross join generate_series(current_date - 18, current_date, interval '1 day') d
  where s.class_id = v_jss1a
    and extract(isodow from d) between 1 and 5
    and not (
      s.admission_number = 'GFA-2405'
      and d::date = current_date
    );

  insert into lessons (
    school_id, class_id, subject, date, topic, summary, homework, homework_due_date, created_by
  ) values
    (
      v_school, v_jss1a, 'Mathematics', current_date,
      'Linear equations in one variable',
      'Solved for x using inverse operations. Worked three word problems from the NERDC scheme.',
      'Exercise 4.2, questions 1 to 8. Show working.',
      current_date + 1, v_teach
    ),
    (
      v_school, v_jss1a, 'English Language', current_date,
      'Comprehension: The market at dawn',
      'Read the passage aloud in groups. Identified main idea and three supporting details.',
      'Write a 120-word recount of a market you know.',
      current_date + 2, v_teach
    ),
    (
      v_school, v_jss1a, 'Basic Science', current_date,
      'Photosynthesis',
      'Named the raw materials and products. Drew the leaf cross-section from the board.',
      null, null, v_teach
    ),
    (
      v_school, v_jss1a, 'Social Studies', current_date - 1,
      'Leadership in the community',
      'Discussed roles of the family, school and local government.',
      null, null, v_teach
    ),
    (
      v_school, v_jss1a, 'Yoruba', current_date - 1,
      'Orin ibile',
      'Learned two folk songs and the meaning of the chorus.',
      'Practice the chorus at home.',
      current_date + 4, v_teach
    );

  insert into announcements (school_id, class_id, title, body, created_by, audience, pinned)
  values
    (
      v_school, null,
      'PTA meeting — Friday 2pm',
      'Hall. First Term reports will be discussed. One guardian per family.',
      v_prop, 'parents', true
    ),
    (
      v_school, null,
      'Resumption after mid-term',
      'School resumes Monday after the break. Uniform inspection at the gate.',
      v_admin, 'all', false
    ),
    (
      v_school, v_jss1a,
      'JSS 1A mathematics CA on Thursday',
      'Forty minutes. Bring a pencil and an eraser. The poster is on the classroom door.',
      v_teach, 'students', false
    ),
    (
      v_school, null,
      'Staff briefing Monday 7.30am',
      'Short briefing in the staff room before assembly. Registers must be in by 9am.',
      v_prop, 'staff', false
    );

  insert into timetable_slots (
    school_id, class_id, term_id, day_of_week, period, start_time, end_time, subject, teacher_id, room
  )
  select
    v_school, v_jss1a, v_term, dow, p.period, p.start_time, p.end_time,
    case p.period
      when 1 then 'Mathematics'
      when 2 then 'English Language'
      when 3 then 'Basic Science'
      when 4 then 'Social Studies'
      when 5 then 'Yoruba'
    end,
    v_teach,
    'Room 12'
  from generate_series(1, 5) as dow
  cross join (
    values
      (1, '08:30'::time, '09:20'::time),
      (2, '09:20'::time, '10:10'::time),
      (3, '10:30'::time, '11:20'::time),
      (4, '11:20'::time, '12:10'::time),
      (5, '12:10'::time, '13:00'::time)
  ) as p(period, start_time, end_time);

  insert into question_banks (school_id, title, subject, class_id, description, created_by)
  values (
    v_school, 'JSS 1 Mathematics', 'Mathematics', v_jss1a,
    'First term CA bank. Linear equations, number work.', v_teach
  )
  returning id into v_bank_math;

  insert into question_banks (school_id, title, subject, class_id, description, created_by)
  values (
    v_school, 'JSS 1 English', 'English Language', v_jss1a,
    'Comprehension and grammar for first term.', v_teach
  )
  returning id into v_bank_eng;

  insert into questions (
    school_id, bank_id, question_type, prompt, options, answer_key, marks, difficulty, created_by
  ) values (
    v_school, v_bank_math, 'objective',
    'Solve for x: 2x + 6 = 14',
    '[{"id":"a","text":"x = 2"},{"id":"b","text":"x = 4"},{"id":"c","text":"x = 8"},{"id":"d","text":"x = 10"}]'::jsonb,
    '{"correct":"b"}'::jsonb,
    2, 'easy', v_teach
  ) returning id into v_q1;

  insert into questions (
    school_id, bank_id, question_type, prompt, options, answer_key, marks, difficulty, created_by
  ) values (
    v_school, v_bank_math, 'multiple_select',
    'Which of these are even numbers?',
    '[{"id":"a","text":"12"},{"id":"b","text":"15"},{"id":"c","text":"18"},{"id":"d","text":"21"}]'::jsonb,
    '{"correct":["a","c"]}'::jsonb,
    2, 'easy', v_teach
  ) returning id into v_q2;

  insert into questions (
    school_id, bank_id, question_type, prompt, answer_key, marks, difficulty, created_by
  ) values (
    v_school, v_bank_math, 'subjective',
    'A number is doubled and then 5 is added. The result is 17. What is the number? Show your working.',
    null, 4, 'medium', v_teach
  ) returning id into v_q3;

  insert into questions (
    school_id, bank_id, question_type, prompt, passage, options, answer_key, marks, created_by
  ) values (
    v_school, v_bank_eng, 'comprehension',
    'Read the passage and answer the questions.',
    'The market at dawn is already loud. Traders lift wooden shutters. A girl in a yellow wrapper counts oranges into a basin. By the time the sun clears the roof of the mosque, the first customers have come and gone.',
    '[]'::jsonb,
    jsonb_build_object('children', jsonb_build_array(
      jsonb_build_object(
        'id','c1','prompt','When is the market already loud?',
        'options', jsonb_build_array(
          jsonb_build_object('id','a','text','At noon'),
          jsonb_build_object('id','b','text','At dawn'),
          jsonb_build_object('id','c','text','At night'),
          jsonb_build_object('id','d','text','After school')
        ),
        'correct','b','marks',1
      ),
      jsonb_build_object(
        'id','c2','prompt','What is the girl counting?',
        'options', jsonb_build_array(
          jsonb_build_object('id','a','text','Tomatoes'),
          jsonb_build_object('id','b','text','Coins'),
          jsonb_build_object('id','c','text','Oranges'),
          jsonb_build_object('id','d','text','Wrappers')
        ),
        'correct','c','marks',1
      )
    )),
    2, v_teach
  ) returning id into v_q4;

  insert into questions (
    school_id, bank_id, question_type, prompt, options, answer_key, marks, difficulty, created_by
  ) values (
    v_school, v_bank_math, 'objective',
    'What is 3/4 of 20?',
    '[{"id":"a","text":"12"},{"id":"b","text":"15"},{"id":"c","text":"16"},{"id":"d","text":"18"}]'::jsonb,
    '{"correct":"b"}'::jsonb,
    2, 'easy', v_teach
  ) returning id into v_q5;

  insert into exams (
    school_id, title, subject, class_id, term_id, kind, status,
    instructions, duration_minutes, opens_at, closes_at,
    allow_offline, created_by, published_at
  ) values (
    v_school, 'JSS 1 Mathematics CA 1', 'Mathematics', v_jss1a, v_term,
    'assessment', 'published',
    'Answer every question. Show working on the written item. Forty minutes.',
    40, now() - interval '2 days', now() + interval '21 days',
    true, v_teach, now() - interval '2 days'
  ) returning id into v_exam_ca;

  insert into exam_questions (exam_id, question_id, position, marks)
  values
    (v_exam_ca, v_q1, 1, 2),
    (v_exam_ca, v_q2, 2, 2),
    (v_exam_ca, v_q5, 3, 2),
    (v_exam_ca, v_q3, 4, 4);

  insert into exam_links (school_id, exam_id, kind, token, expires_at, created_by)
  values (
    v_school, v_exam_ca, 'student', 'greenfield-maths-ca',
    now() + interval '21 days', v_teach
  );

  insert into exams (
    school_id, title, subject, class_id, term_id, kind, status,
    instructions, duration_minutes, created_by
  ) values (
    v_school, 'First Term Mathematics', 'Mathematics', v_jss1a, v_term,
    'exam', 'draft',
    'End of term paper. Not yet published.',
    60, v_teach
  ) returning id into v_exam_term;

  insert into exam_questions (exam_id, question_id, position, marks)
  values
    (v_exam_term, v_q1, 1, 2),
    (v_exam_term, v_q2, 2, 2),
    (v_exam_term, v_q3, 3, 4);

  insert into exams (
    school_id, title, subject, kind, status,
    instructions, duration_minutes, opens_at, closes_at,
    allow_offline, created_by, published_at
  ) values (
    v_school, 'JSS 1 entrance interview', null, 'interview', 'published',
    'Short oral-style paper for new applicants. Type the child''s name to start.',
    20, now() - interval '1 day', now() + interval '30 days',
    true, v_prop, now() - interval '1 day'
  ) returning id into v_exam_int;

  insert into exam_questions (exam_id, question_id, position, marks)
  values (v_exam_int, v_q4, 1, 2);

  insert into exam_links (school_id, exam_id, kind, token, expires_at, created_by)
  values (
    v_school, v_exam_int, 'applicant', 'greenfield-interview',
    now() + interval '30 days', v_prop
  );

  insert into exam_attempts (
    school_id, exam_id, student_id,
    status, result_status, score, total_marks,
    started_at, submitted_at
  ) values (
    v_school, v_exam_ca, v_adaeze,
    'submitted', 'pending_marking', 6, 10,
    now() - interval '3 hours', now() - interval '2 hours 20 minutes'
  ) returning id into v_attempt;

  insert into exam_answers (attempt_id, question_id, response, is_correct, marks_awarded)
  values
    (v_attempt, v_q1, '{"choice":"b"}'::jsonb, true, 2),
    (v_attempt, v_q2, '{"choices":["a","c"]}'::jsonb, true, 2),
    (v_attempt, v_q5, '{"choice":"a"}'::jsonb, false, 0),
    (v_attempt, v_q3, '{"text":"Let the number be n. 2n + 5 = 17. 2n = 12. n = 6."}'::jsonb, null, null);

  insert into exam_attempts (
    school_id, exam_id, applicant_name, applicant_email,
    status, result_status, score, total_marks,
    started_at, submitted_at, marked_by, marked_at,
    reviewed_by, reviewed_at
  ) values (
    v_school, v_exam_int, 'Kemi Adewale', 'kemi.parent@example.com',
    'marked', 'approved', 2, 2,
    now() - interval '1 day', now() - interval '23 hours',
    v_teach, now() - interval '20 hours',
    v_prop, now() - interval '18 hours'
  ) returning id into v_attempt2;

  insert into exam_answers (attempt_id, question_id, response, is_correct, marks_awarded, marked_by, marked_at)
  values (
    v_attempt2, v_q4,
    '{"child_c1":"b","child_c2":"c"}'::jsonb,
    true, 2, v_teach, now() - interval '20 hours'
  );

  begin
    insert into admission_enquiries (
      school_id, child_first, child_last, seeking_class, date_of_birth, gender,
      guardian_name, guardian_phone, guardian_email, note, status
    ) values
      (
        v_school, 'Kemi', 'Adewale', 'JSS 1', '2013-04-02', 'female',
        'Mrs. Adewale', '08034412291', 'kemi.parent@example.com',
        'Transferring from a school in Ikeja. Sat the entrance interview.',
        'contacted'
      ),
      (
        v_school, 'Yusuf', 'Lawal', 'Primary 4', '2016-06-15', 'male',
        'Mr. Lawal', '08021184402', null,
        'Wants a place for next term.',
        'new'
      );
  exception when undefined_table then
    raise notice 'admission_enquiries skipped';
  end;

  begin
    if to_regclass('public.fee_structures') is not null then
      execute
        'insert into fee_structures (school_id, class_id, term, total_amount_naira)
         values ($1, $2, $3, $4) returning id'
      using v_school, v_jss1a, 'First Term 2026/2027', 120000
      into v_fee;
      if to_regclass('public.fee_installments') is not null and v_fee is not null then
        execute
          'insert into fee_installments (fee_structure_id, label, amount_naira, sequence_order)
           values ($1, $2, $3, $4), ($1, $5, $6, $7)'
        using v_fee, 'First instalment', 70000, 1, 'Second instalment', 50000, 2;
      end if;
    end if;
  exception when others then
    raise notice 'fee tables skipped: %', sqlerrm;
  end;

  begin
    alter table profiles enable trigger t_protect_profile_role;
  exception when undefined_object then
    null;
  end;

  raise notice 'Greenfield Academy ready. School id %', v_school;
end;
$$;

drop function if exists demo_ensure_user(text, text, text);
