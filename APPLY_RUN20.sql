-- Daymaark Run 20 — paste in Supabase SQL Editor after Run 19.
-- Class order, school colour, edit questions, activate term (fees due again), staff role.

alter table classes
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select id,
         (row_number() over (partition by school_id order by name) * 10)::integer as n
    from classes
   where sort_order = 0
)
update classes c
   set sort_order = ranked.n
  from ranked
 where c.id = ranked.id
   and c.sort_order = 0;

alter table schools
  add column if not exists accent_color text;

-- Bank questions must return the key so staff can correct a saved item.
create or replace function list_bank_questions(p_bank_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_out jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not is_staff() then
    raise exception 'only staff can list bank questions';
  end if;
  v_school := auth_school_id();
  if v_school is null then
    raise exception 'no school on this account';
  end if;
  if not exists (
    select 1 from question_banks
     where id = p_bank_id and school_id = v_school
  ) then
    raise exception 'bank not found in your school';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'bank_id', q.bank_id,
        'question_type', q.question_type,
        'prompt', q.prompt,
        'passage', q.passage,
        'options', q.options,
        'answer_key', q.answer_key,
        'marks', q.marks,
        'tags', coalesce(to_jsonb(q.tags), '[]'::jsonb)
      )
      order by q.created_at desc
    ),
    '[]'::jsonb
  )
    into v_out
  from questions q
  where q.bank_id = p_bank_id
    and q.school_id = v_school;

  return v_out;
end;
$$;

grant execute on function list_bank_questions(uuid) to authenticated;

create or replace function update_bank_question(
  p_question_id uuid,
  p_prompt text,
  p_passage text,
  p_options jsonb,
  p_answer_key jsonb,
  p_marks numeric
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then
    raise exception 'only staff can edit questions';
  end if;
  if (select school_id from questions where id = p_question_id) is distinct from auth_school_id() then
    raise exception 'question not found in your school';
  end if;
  if p_prompt is null or length(trim(p_prompt)) = 0 then
    raise exception 'write the question';
  end if;
  if p_marks is null or p_marks <= 0 then
    raise exception 'marks must be greater than zero';
  end if;

  update questions
     set prompt = trim(p_prompt),
         passage = nullif(trim(coalesce(p_passage, '')), ''),
         options = coalesce(p_options, '[]'::jsonb),
         answer_key = p_answer_key,
         marks = p_marks
   where id = p_question_id;
end;
$$;

grant execute on function update_bank_question(uuid, text, text, jsonb, jsonb, numeric) to authenticated;

create or replace function set_staff_role(p_profile_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_current text;
  v_admins int;
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can change staff roles';
  end if;
  if p_role not in ('teacher', 'admin') then
    raise exception 'role must be teacher or admin';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;

  select role::text into v_current
    from profiles
   where id = p_profile_id
     and school_id = auth_school_id();

  if v_current is null then
    raise exception 'staff not found in your school';
  end if;
  if v_current = 'proprietor' then
    raise exception 'the proprietor seat cannot be changed this way';
  end if;
  if v_current not in ('teacher', 'admin') then
    raise exception 'only teachers and admins can be moved between those seats';
  end if;

  if v_current = 'admin' and p_role = 'teacher' then
    select count(*) into v_admins
      from profiles
     where school_id = auth_school_id()
       and role = 'admin'
       and is_active;
    if v_admins <= 1 then
      raise exception 'keep at least one administrator';
    end if;
  end if;

  update profiles
     set role = p_role::user_role
   where id = p_profile_id;
end;
$$;

grant execute on function set_staff_role(uuid, text) to authenticated;

create or replace function deactivate_class(p_class_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can remove a class';
  end if;
  if (select school_id from classes where id = p_class_id) is distinct from auth_school_id() then
    raise exception 'class not found in your school';
  end if;

  select count(*) into v_n
    from students
   where class_id = p_class_id
     and is_active;

  if v_n > 0 then
    raise exception 'move or remove the % student% in this class first',
      v_n, case when v_n = 1 then '' else 's' end;
  end if;

  update classes set is_active = false where id = p_class_id;
  delete from class_teachers where class_id = p_class_id;
end;
$$;

grant execute on function deactivate_class(uuid) to authenticated;

create or replace function reorder_classes(p_class_ids uuid[])
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_i int := 0;
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can rearrange classes';
  end if;
  if p_class_ids is null then
    raise exception 'no classes given';
  end if;

  foreach v_id in array p_class_ids loop
    v_i := v_i + 1;
    update classes
       set sort_order = v_i * 10
     where id = v_id
       and school_id = auth_school_id()
       and is_active;
  end loop;
end;
$$;

grant execute on function reorder_classes(uuid[]) to authenticated;

create or replace function set_school_accent(p_color text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can set school colours';
  end if;
  if p_color is not null
     and p_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'colour must be a hex like #C9922B';
  end if;
  update schools
     set accent_color = p_color
   where id = auth_school_id();
end;
$$;

grant execute on function set_school_accent(text) to authenticated;

create or replace function activate_term(
  p_name text,
  p_start date,
  p_end date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_school uuid;
  v_prev_name text;
  v_term uuid;
begin
  if not is_admin() then
    raise exception 'only an administrator or proprietor can activate a term';
  end if;
  v_school := auth_school_id();
  if v_school is null then
    raise exception 'no school on this account';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name the term';
  end if;
  if p_end <= p_start then
    raise exception 'the term must end after it starts';
  end if;

  select name into v_prev_name
    from terms
   where school_id = v_school
     and is_current
   limit 1;

  update terms set is_current = false
   where school_id = v_school
     and is_current;

  insert into terms (school_id, name, start_date, end_date, is_current)
  values (v_school, trim(p_name), p_start, p_end, true)
  returning id into v_term;

  update students
     set fee_cleared = false
   where school_id = v_school
     and is_active;

  if to_regclass('public.fee_structures') is not null
     and v_prev_name is not null
     and v_prev_name is distinct from trim(p_name) then
    begin
      execute
        'insert into fee_structures (school_id, class_id, term, total_amount_naira)
         select school_id, class_id, $1, total_amount_naira
           from fee_structures
          where school_id = $2
            and term = $3
            and not exists (
              select 1 from fee_structures n
               where n.school_id = fee_structures.school_id
                 and n.class_id is not distinct from fee_structures.class_id
                 and n.term = $1
            )'
      using trim(p_name), v_school, v_prev_name;
    exception when others then
      null;
    end;

    if to_regclass('public.fee_installments') is not null then
      begin
        execute
          'insert into fee_installments (fee_structure_id, label, amount_naira, sequence_order)
           select n.id, i.label, i.amount_naira, i.sequence_order
             from fee_structures o
             join fee_installments i on i.fee_structure_id = o.id
             join fee_structures n
               on n.school_id = o.school_id
              and n.class_id is not distinct from o.class_id
              and n.term = $1
            where o.school_id = $2
              and o.term = $3
              and not exists (
                select 1 from fee_installments x
                 where x.fee_structure_id = n.id
                   and x.sequence_order = i.sequence_order
              )'
        using trim(p_name), v_school, v_prev_name;
      exception when others then
        null;
      end;
    end if;
  end if;

  return v_term;
end;
$$;

grant execute on function activate_term(text, date, date) to authenticated;
