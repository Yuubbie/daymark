import { supabase } from './supabase'

/* Data access. Every call is already scoped by RLS, so no school_id filters
   are needed on reads. Writes still send school_id because the policies check
   it on insert. */

export type ClassRow = {
  id: string
  name: string
  level: string | null
  student_count: number
}

export type StudentRow = {
  id: string
  first_name: string
  last_name: string
  admission_number: string | null
  class_id: string | null
  linked_parents: number
}

export type TermRow = {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

export async function getCurrentTerm(): Promise<TermRow | null> {
  const { data } = await supabase
    .from('terms')
    .select('id, name, start_date, end_date, is_current')
    .eq('is_current', true)
    .maybeSingle()
  return (data as TermRow) ?? null
}

export async function createTerm(
  schoolId: string,
  name: string,
  start: string,
  end: string,
) {
  await supabase.from('terms').update({ is_current: false }).eq('is_current', true)
  return supabase
    .from('terms')
    .insert({ school_id: schoolId, name, start_date: start, end_date: end, is_current: true })
}

export async function listClasses(): Promise<ClassRow[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, level, students(count)')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    level: (c.level as string) ?? null,
    student_count: (c.students as { count: number }[])?.[0]?.count ?? 0,
  }))
}

export async function createClass(schoolId: string, name: string, level: string) {
  return supabase.from('classes').insert({
    school_id: schoolId,
    name: name.trim(),
    level: level.trim() || null,
  })
}

export async function getClass(id: string) {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, level, school_id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, admission_number, class_id, parent_student_links(count)')
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('last_name')
  if (error) throw error
  return (data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    first_name: s.first_name as string,
    last_name: s.last_name as string,
    admission_number: (s.admission_number as string) ?? null,
    class_id: (s.class_id as string) ?? null,
    linked_parents: (s.parent_student_links as { count: number }[])?.[0]?.count ?? 0,
  }))
}

export async function addStudents(
  schoolId: string,
  classId: string,
  names: { first: string; last: string }[],
) {
  return supabase.from('students').insert(
    names.map((n) => ({
      school_id: schoolId,
      class_id: classId,
      first_name: n.first,
      last_name: n.last,
    })),
  )
}

export async function generateClaimCode(studentId: string) {
  const { data, error } = await supabase.rpc('generate_claim_code', {
    p_student_id: studentId,
  })
  if (error) throw error
  return data as string
}

export async function listOpenCodes(studentIds: string[]) {
  if (studentIds.length === 0) return {}
  const { data } = await supabase
    .from('claim_codes')
    .select('student_id, code, expires_at')
    .in('student_id', studentIds)
    .is('used_at', null)
  const map: Record<string, string> = {}
  for (const r of data ?? []) map[r.student_id as string] = r.code as string
  return map
}

export async function listTeachers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'teacher')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function listInvites() {
  const { data, error } = await supabase
    .from('invites')
    .select('id, email, full_name, role, accepted_at, expires_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function inviteTeacher(
  schoolId: string,
  email: string,
  fullName: string,
) {
  return supabase.from('invites').insert({
    school_id: schoolId,
    email: email.trim().toLowerCase(),
    full_name: fullName.trim() || null,
    role: 'teacher',
  })
}

export async function assignTeacher(
  schoolId: string,
  classId: string,
  teacherId: string,
  subject: string,
  isForm: boolean,
) {
  return supabase.from('class_teachers').insert({
    school_id: schoolId,
    class_id: classId,
    teacher_id: teacherId,
    subject: subject.trim() || null,
    is_form_teacher: isForm,
  })
}

export async function listClassTeachers(classId: string) {
  const { data, error } = await supabase
    .from('class_teachers')
    .select('id, subject, is_form_teacher, teacher_id, profiles(full_name, email)')
    .eq('class_id', classId)
  if (error) throw error
  return data ?? []
}

/** Admin dashboard counts. */
export async function adminSummary() {
  const today = new Date().toISOString().slice(0, 10)

  const [students, classes, attendance, lessons, unlinked] = await Promise.all([
    supabase.from('students').select('*', { head: true, count: 'exact' }).eq('is_active', true),
    supabase.from('classes').select('*', { head: true, count: 'exact' }).eq('is_active', true),
    supabase.from('attendance').select('*', { head: true, count: 'exact' }).eq('date', today),
    supabase.from('lessons').select('*', { head: true, count: 'exact' }).eq('date', today),
    supabase.from('students').select('id, parent_student_links(count)').eq('is_active', true),
  ])

  const noParent = (unlinked.data ?? []).filter(
    (s: Record<string, unknown>) =>
      ((s.parent_student_links as { count: number }[])?.[0]?.count ?? 0) === 0,
  ).length

  return {
    students: students.count ?? 0,
    classes: classes.count ?? 0,
    attendanceToday: attendance.count ?? 0,
    lessonsToday: lessons.count ?? 0,
    studentsWithoutParent: noParent,
  }
}

export async function classesMissingLessonToday() {
  const { data, error } = await supabase
    .from('lesson_posting_today')
    .select('class_id, class_name, lessons_posted_today, missing_today')
    .order('class_name')
  if (error) throw error
  return data ?? []
}

/* ------------------------------- flagged ---------------------------------- */

export type TermStat = {
  student_id: string
  class_id: string
  class_name: string
  first_name: string
  last_name: string
  term_name: string
  days_recorded: number
  days_present: number
  days_late: number
  days_absent: number
  attendance_pct: number | null
  absent_last_14: number
  late_last_14: number
  last_absence: string | null
}

export async function termStats(): Promise<TermStat[]> {
  const { data, error } = await supabase
    .from('student_term_attendance')
    .select('*')
    .order('attendance_pct', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as TermStat[]
}

/** Marks for several students at once, keyed by student, for the strips. */
export async function marksForStudents(
  studentIds: string[],
): Promise<Record<string, { date: string; status: string }[]>> {
  if (studentIds.length === 0) return {}
  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, date, status')
    .in('student_id', studentIds)
    .order('date')
  if (error) throw error

  const out: Record<string, { date: string; status: string }[]> = {}
  for (const r of data ?? []) {
    const k = r.student_id as string
    ;(out[k] ??= []).push({ date: r.date as string, status: r.status as string })
  }
  return out
}

/* ---------------------------- parent contacts ------------------------------ */

export type ParentContact = {
  student_id: string
  parent_id: string
  full_name: string | null
  phone: string | null
  email: string | null
  relationship: string | null
}

export async function parentsForStudents(
  studentIds: string[],
): Promise<Record<string, ParentContact[]>> {
  if (studentIds.length === 0) return {}
  const { data, error } = await supabase
    .from('parent_student_links')
    .select('student_id, parent_id, relationship, profiles(full_name, phone, email)')
    .in('student_id', studentIds)
  if (error) throw error

  const out: Record<string, ParentContact[]> = {}
  for (const r of data ?? []) {
    const p = r.profiles as unknown as Record<string, unknown> | null
    const c: ParentContact = {
      student_id: r.student_id as string,
      parent_id: r.parent_id as string,
      relationship: (r.relationship as string) ?? null,
      full_name: (p?.full_name as string) ?? null,
      phone: (p?.phone as string) ?? null,
      email: (p?.email as string) ?? null,
    }
    ;(out[c.student_id] ??= []).push(c)
  }
  return out
}

/**
 * Nigerian numbers arrive as 08031234567, 2348031234567, or +234 803 123 4567.
 * WhatsApp needs digits only, in international form.
 */
export function toIntlDigits(raw: string | null): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('0')) return '234' + d.slice(1)
  if (d.length === 13 && d.startsWith('234')) return d
  if (d.length === 10) return '234' + d
  return d.length >= 10 ? d : null
}
