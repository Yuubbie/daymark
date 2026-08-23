import { supabase } from './supabase'
import type { AttendanceMark, AttendanceStatus } from './types'

export type Child = {
  id: string
  first_name: string
  last_name: string
  class_id: string | null
  class_name: string | null
}

export async function listChildren(): Promise<Child[]> {
  const { data, error } = await supabase
    .from('parent_student_links')
    .select('students(id, first_name, last_name, class_id, classes(name))')
  if (error) throw error

  return (data ?? [])
    .map((r) => {
      const s = r.students as unknown as Record<string, unknown> | null
      if (!s) return null
      const c = s.classes as { name?: string } | null
      return {
        id: s.id as string,
        first_name: s.first_name as string,
        last_name: s.last_name as string,
        class_id: (s.class_id as string) ?? null,
        class_name: c?.name ?? null,
      }
    })
    .filter(Boolean) as Child[]
}

export type TermBounds = { id: string; name: string; start_date: string; end_date: string } | null

export async function currentTerm(): Promise<TermBounds> {
  const { data } = await supabase
    .from('terms')
    .select('id, name, start_date, end_date')
    .eq('is_current', true)
    .maybeSingle()
  return (data as TermBounds) ?? null
}

/** Marks for the term, or the last 60 recorded days if no term is set. */
export async function childRegister(
  studentId: string,
  term: TermBounds,
): Promise<AttendanceMark[]> {
  let q = supabase
    .from('attendance')
    .select('date, status')
    .eq('student_id', studentId)
    .order('date')

  if (term) q = q.gte('date', term.start_date).lte('date', term.end_date)

  const { data, error } = await q
  if (error) throw error

  return (data ?? []).map((r) => ({
    date: r.date as string,
    status: r.status as AttendanceStatus,
  }))
}

export function attendancePct(marks: AttendanceMark[]): number | null {
  if (marks.length === 0) return null
  const counted = marks.filter((m) => m.status !== null).length
  if (counted === 0) return null
  const here = marks.filter((m) => m.status === 'present' || m.status === 'late').length
  return (here / counted) * 100
}

export type LessonRow = {
  id: string
  date: string
  subject: string
  topic: string
  summary: string | null
  homework: string | null
  homework_due_date: string | null
}

export async function lessonsFor(classId: string, date: string): Promise<LessonRow[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, date, subject, topic, summary, homework, homework_due_date')
    .eq('class_id', classId)
    .eq('date', date)
    .order('subject')
  if (error) throw error
  return (data ?? []) as LessonRow[]
}

export async function recentFeed(classId: string, days = 14): Promise<LessonRow[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('lessons')
    .select('id, date, subject, topic, summary, homework, homework_due_date')
    .eq('class_id', classId)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: false })
    .order('subject')
  if (error) throw error
  return (data ?? []) as LessonRow[]
}

export async function openHomework(classId: string): Promise<LessonRow[]> {
  const since = new Date()
  since.setDate(since.getDate() - 21)
  const { data, error } = await supabase
    .from('lessons')
    .select('id, date, subject, topic, summary, homework, homework_due_date')
    .eq('class_id', classId)
    .not('homework', 'is', null)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: false })
  if (error) throw error
  return (data ?? []) as LessonRow[]
}

export type Notice = {
  id: string
  title: string
  body: string
  published_at: string
  class_id: string | null
}

export async function listNotices(): Promise<Notice[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, published_at, class_id')
    .order('published_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as Notice[]
}

export async function postNotice(
  schoolId: string,
  classId: string | null,
  title: string,
  body: string,
  createdBy: string,
) {
  return supabase.from('announcements').insert({
    school_id: schoolId,
    class_id: classId,
    title: title.trim(),
    body: body.trim(),
    created_by: createdBy,
  })
}
