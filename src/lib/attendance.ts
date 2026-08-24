import { supabase } from './supabase'
import {
  enqueue,
  flushQueue,
  readSnapshot,
  saveSnapshot,
  type QueuedWrite,
} from './offline'
import type { AttendanceStatus, Role } from './types'

export type RegisterStudent = {
  id: string
  first_name: string
  last_name: string
  status: AttendanceStatus | null
}

export type TeachableClass = {
  id: string
  name: string
  level: string | null
  student_count?: number
}

const LAST_CLASS = 'daymark.lastClass.'

export function rememberClass(userId: string, classId: string) {
  try {
    localStorage.setItem(LAST_CLASS + userId, classId)
  } catch {
    /* ignore */
  }
}

/**
 * Which class to open on. Last one used, if it is still valid. Otherwise the
 * first class that actually has students in it, because landing a teacher on
 * an empty class looks like the app is broken.
 */
export function defaultClass(userId: string, classes: TeachableClass[]): string {
  if (classes.length === 0) return ''
  let saved: string | null = null
  try {
    saved = localStorage.getItem(LAST_CLASS + userId)
  } catch {
    /* ignore */
  }
  if (saved && classes.some((c) => c.id === saved)) return saved
  const populated = classes.find((c) => (c.student_count ?? 0) > 0)
  return (populated ?? classes[0]).id
}

/** Attaches student counts so defaultClass can skip empty classes. */
async function withCounts(classes: TeachableClass[]): Promise<TeachableClass[]> {
  if (classes.length === 0) return classes
  const { data } = await supabase
    .from('students')
    .select('class_id')
    .eq('is_active', true)
    .in('class_id', classes.map((c) => c.id))

  const counts: Record<string, number> = {}
  for (const r of data ?? []) {
    const k = r.class_id as string
    counts[k] = (counts[k] ?? 0) + 1
  }
  return classes.map((c) => ({ ...c, student_count: counts[c.id] ?? 0 }))
}

/** Teachers see the classes they are assigned to. Admins see all of them. */
export async function listTeachableClasses(
  role: Role,
  userId: string,
): Promise<TeachableClass[]> {
  try {
    const fresh = await withCounts(await fetchTeachableClasses(role, userId))
    saveSnapshot(`classes.${userId}`, fresh)
    return fresh
  } catch (e) {
    const snap = readSnapshot<TeachableClass[]>(`classes.${userId}`)
    if (snap) return snap.value
    throw e
  }
}

async function fetchTeachableClasses(
  role: Role,
  userId: string,
): Promise<TeachableClass[]> {
  if (role === 'admin') {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, level')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return (data ?? []) as TeachableClass[]
  }

  const { data, error } = await supabase
    .from('class_teachers')
    .select('classes(id, name, level)')
    .eq('teacher_id', userId)
  if (error) throw error

  const seen = new Set<string>()
  const out: TeachableClass[] = []
  for (const r of data ?? []) {
    const c = r.classes as unknown as TeachableClass | null
    if (c && !seen.has(c.id)) {
      seen.add(c.id)
      out.push(c)
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export type RegisterLoad = { students: RegisterStudent[]; fromCache: boolean; cachedAt?: number }

/**
 * Reads the roster and today's marks. On any network failure, falls back to
 * the last snapshot for this class and date so the teacher still has a usable
 * screen. Never returns an empty list when the truth is "could not load".
 */
export async function loadRegister(classId: string, date: string): Promise<RegisterLoad> {
  const key = `register.${classId}.${date}`
  try {
    const students = await fetchRegister(classId, date)
    saveSnapshot(key, students)
    return { students, fromCache: false }
  } catch (e) {
    const snap = readSnapshot<RegisterStudent[]>(key)
    if (snap) return { students: snap.value, fromCache: true, cachedAt: snap.at }
    throw e
  }
}

async function fetchRegister(classId: string, date: string): Promise<RegisterStudent[]> {
  const [{ data: students, error: sErr }, { data: marks }] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('class_id', classId)
      .eq('is_active', true)
      .order('last_name'),
    supabase.from('attendance').select('student_id, status').eq('class_id', classId).eq('date', date),
  ])
  if (sErr) throw sErr

  const byId: Record<string, AttendanceStatus> = {}
  for (const m of marks ?? []) byId[m.student_id as string] = m.status as AttendanceStatus

  return (students ?? []).map((s) => ({
    id: s.id as string,
    first_name: s.first_name as string,
    last_name: s.last_name as string,
    status: byId[s.id as string] ?? null,
  }))
}

function sendUpsert(item: QueuedWrite) {
  return supabase.from(item.table).upsert(item.rows, {
    onConflict: item.onConflict,
  }) as unknown as Promise<{ error: unknown }>
}

export function flushWrites() {
  return flushQueue(sendUpsert)
}

/**
 * Save marks. Tries the network first; on any failure the rows go to the local
 * queue and are retried on reconnect. Returns 'saved' or 'queued'.
 */
export async function saveMarks(
  schoolId: string,
  classId: string,
  date: string,
  markedBy: string,
  marks: { student_id: string; status: AttendanceStatus }[],
): Promise<'saved' | 'queued'> {
  const rows = marks.map((m) => ({
    school_id: schoolId,
    class_id: classId,
    student_id: m.student_id,
    date,
    status: m.status,
    marked_by: markedBy,
  }))

  if (!navigator.onLine) {
    enqueue({ table: 'attendance', rows, onConflict: 'student_id,date' })
    return 'queued'
  }

  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'student_id,date' })

  if (error) {
    enqueue({ table: 'attendance', rows, onConflict: 'student_id,date' })
    return 'queued'
  }
  return 'saved'
}

/* ---------------------------------- lessons -------------------------------- */

export type LessonDraft = {
  subject: string
  topic: string
  summary: string
  homework: string
  homework_due_date: string
}

export async function loadLesson(classId: string, subject: string, date: string) {
  const { data } = await supabase
    .from('lessons')
    .select('id, subject, topic, summary, homework, homework_due_date')
    .eq('class_id', classId)
    .eq('subject', subject)
    .eq('date', date)
    .maybeSingle()
  return data
}

export async function recentLessons(classId: string, limit = 5) {
  const { data } = await supabase
    .from('lessons')
    .select('id, date, subject, topic, homework')
    .eq('class_id', classId)
    .order('date', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function saveLesson(
  schoolId: string,
  classId: string,
  date: string,
  createdBy: string,
  d: LessonDraft,
): Promise<'saved' | 'queued'> {
  const row = {
    school_id: schoolId,
    class_id: classId,
    date,
    subject: d.subject.trim(),
    topic: d.topic.trim(),
    summary: d.summary.trim() || null,
    homework: d.homework.trim() || null,
    homework_due_date: d.homework_due_date || null,
    created_by: createdBy,
  }

  if (!navigator.onLine) {
    enqueue({ table: 'lessons', rows: [row], onConflict: 'class_id,subject,date' })
    return 'queued'
  }

  const { error } = await supabase
    .from('lessons')
    .upsert([row], { onConflict: 'class_id,subject,date' })

  if (error) {
    enqueue({ table: 'lessons', rows: [row], onConflict: 'class_id,subject,date' })
    return 'queued'
  }
  return 'saved'
}
