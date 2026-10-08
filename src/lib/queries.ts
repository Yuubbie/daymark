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
  fee_cleared: boolean
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
    .select('id, first_name, last_name, admission_number, class_id, fee_cleared, parent_student_links(count)')
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
    fee_cleared: (s.fee_cleared as boolean) ?? true,
  }))
}

export async function addStudents(
  schoolId: string,
  classId: string,
  names: { first: string; last: string; admission_number?: string }[],
) {
  return supabase.from('students').insert(
    names.map((n) => ({
      school_id: schoolId,
      class_id: classId,
      first_name: n.first,
      last_name: n.last,
      admission_number: n.admission_number || null,
    })),
  )
}

export async function deactivateStudent(studentId: string) {
  return supabase.from('students').update({ is_active: false }).eq('id', studentId)
}

export async function generateClaimCode(studentId: string) {
  const { data, error } = await supabase.rpc('generate_claim_code', {
    p_student_id: studentId,
  })
  if (error) throw error
  return data as string
}

/**
 * Runs generate_claim_code once per student, in sequence rather than in
 * parallel - a burst of concurrent RPC calls under Supabase's connection
 * pooling is more likely to trip rate limits than a plain loop is slow.
 * Returns per-student results so the caller can show which ones failed
 * without losing the ones that succeeded.
 */
export async function generateClaimCodesForClass(
  studentIds: string[],
): Promise<{ studentId: string; code?: string; error?: string }[]> {
  const results: { studentId: string; code?: string; error?: string }[] = []
  for (const studentId of studentIds) {
    try {
      const code = await generateClaimCode(studentId)
      results.push({ studentId, code })
    } catch (e) {
      const err = e as { message?: string }
      results.push({ studentId, error: err?.message ?? 'Failed' })
    }
  }
  return results
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
    .select('id, full_name, email, role, is_active')
    .eq('role', 'teacher')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function listStaff() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .in('role', ['proprietor', 'admin', 'teacher'])
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function countAdmins() {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { head: true, count: 'exact' })
    .eq('role', 'admin')
    .eq('is_active', true)
  if (error) throw error
  return count ?? 0
}

export async function removeTeacher(profileId: string) {
  const { error } = await supabase.rpc('remove_school_member', { p_profile_id: profileId })
  if (error) throw error
}

export async function reactivateTeacher(profileId: string) {
  const { error } = await supabase.rpc('reactivate_school_member', { p_profile_id: profileId })
  if (error) throw error
}

export async function listInvites() {
  const { data, error } = await supabase
    .from('invites')
    .select('id, email, full_name, role, accepted_at, expires_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function inviteStaff(
  schoolId: string,
  email: string,
  fullName: string,
  role: 'teacher' | 'admin' = 'teacher',
) {
  const trimmed = email.trim().toLowerCase()
  const { data: u } = await supabase.auth.getUser()
  const inserted = await supabase.from('invites').insert({
    school_id: schoolId,
    email: trimmed,
    full_name: fullName.trim() || null,
    role,
    created_by: u.user?.id ?? null,
  })
  if (inserted.error && !/duplicate key/i.test(inserted.error.message)) return inserted

  const { data, error: sendErr } = await supabase.functions.invoke('send-invite', {
    body: {
      email: trimmed,
      full_name: fullName.trim(),
      redirect_to: `${window.location.origin}/auth/callback`,
    },
  })
  if (sendErr) {
    return {
      ...inserted,
      error: { message: sendErr.message || 'Could not send the invite email', details: '', hint: '', code: '' },
    }
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return { ...inserted, error: { message: String(data.error), details: '', hint: '', code: '' } }
  }
  return { ...inserted, error: null }
}

export async function inviteTeacher(
  schoolId: string,
  email: string,
  fullName: string,
) {
  return inviteStaff(schoolId, email, fullName, 'teacher')
}

export async function inviteStudentLogin(
  studentId: string,
  email: string,
  fullName?: string,
) {
  const trimmed = email.trim().toLowerCase()
  const { error } = await supabase.rpc('invite_student_login', {
    p_student_id: studentId,
    p_email: trimmed,
  })
  if (error) throw error

  const redirectTo = `${window.location.origin}/auth/callback`
  const { data, error: sendErr } = await supabase.functions.invoke('send-invite', {
    body: { email: trimmed, full_name: fullName ?? '', redirect_to: redirectTo },
  })
  if (sendErr) throw new Error(sendErr.message || 'Could not send the invite email')
  if (data && data.error) throw new Error(data.error as string)
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

  const admins = await supabase
    .from('profiles')
    .select('*', { head: true, count: 'exact' })
    .eq('role', 'admin')
    .eq('is_active', true)

  return {
    students: students.count ?? 0,
    classes: classes.count ?? 0,
    attendanceToday: attendance.count ?? 0,
    lessonsToday: lessons.count ?? 0,
    studentsWithoutParent: noParent,
    admins: admins.count ?? 0,
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
export type BirthdayRow = {
  student_id: string
  first_name: string
  last_name: string
  class_name: string | null
  this_year_birthday: string
}

export async function listUpcomingBirthdays(): Promise<BirthdayRow[]> {
  const { data, error } = await supabase
    .from('upcoming_birthdays')
    .select('student_id, first_name, last_name, class_name, this_year_birthday')
    .order('this_year_birthday')
  if (error) throw error
  return (data ?? []) as BirthdayRow[]
}

export type TimetableSlot = {
  id: string
  class_id: string
  day_of_week: number
  period: number
  start_time: string
  end_time: string
  subject: string
  teacher_id: string | null
  room: string | null
  class_name?: string | null
}

export async function listTimetableForClass(classId: string): Promise<TimetableSlot[]> {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('id, class_id, day_of_week, period, start_time, end_time, subject, teacher_id, room')
    .eq('class_id', classId)
    .order('day_of_week')
    .order('period')
  if (error) throw error
  return (data ?? []) as TimetableSlot[]
}

export async function insertTimetableSlot(row: {
  schoolId: string
  classId: string
  dayOfWeek: number
  period: number
  start: string
  end: string
  subject: string
  teacherId: string | null
  room: string | null
}) {
  const { error } = await supabase.from('timetable_slots').insert({
    school_id: row.schoolId,
    class_id: row.classId,
    day_of_week: row.dayOfWeek,
    period: row.period,
    start_time: row.start,
    end_time: row.end,
    subject: row.subject,
    teacher_id: row.teacherId,
    room: row.room,
  })
  if (error) throw error
}

export async function listTimetableForTeacher(teacherId: string): Promise<TimetableSlot[]> {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select('id, class_id, day_of_week, period, start_time, end_time, subject, teacher_id, room, classes(name)')
    .eq('teacher_id', teacherId)
    .order('day_of_week')
    .order('period')
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => {
    const cls = r.classes as { name?: string } | null
    return {
      id: r.id as string,
      class_id: r.class_id as string,
      day_of_week: r.day_of_week as number,
      period: r.period as number,
      start_time: r.start_time as string,
      end_time: r.end_time as string,
      subject: r.subject as string,
      teacher_id: (r.teacher_id as string) ?? null,
      room: (r.room as string) ?? null,
      class_name: cls?.name ?? null,
    }
  })
}

export async function setFeeCleared(studentId: string, cleared: boolean) {
  const { error } = await supabase.rpc('set_student_fee_cleared', {
    p_student_id: studentId,
    p_cleared: cleared,
  })
  if (error) throw error
}

export function toIntlDigits(raw: string | null): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('0')) return '234' + d.slice(1)
  if (d.length === 13 && d.startsWith('234')) return d
  if (d.length === 10) return '234' + d
  return d.length >= 10 ? d : null
}