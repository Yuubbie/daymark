import { supabase } from './supabase'
import type { AttendanceMark, AttendanceStatus } from './types'

export type ReportPaper = {
  exam_id: string
  title: string
  kind: string
  score: number | null
  total: number | null
  percent: number | null
  submitted_at: string | null
  source?: 'cbt' | 'paper'
}

export type ReportStatement = {
  area: string
  goal: string
  comment: string | null
  level: 'emerging' | 'expected' | 'exceeding' | null
  position: number
}

export type ReportSubject = {
  subject: string
  average: number | null
  papers: ReportPaper[]
}

export type TermReport = {
  student: {
    id: string
    first_name: string
    last_name: string
    admission_number: string | null
    photo_url: string | null
    fee_cleared: boolean
  }
  school: { id: string; name: string; logo_url?: string | null }
  class: { id: string; name: string; level?: string | null; report_kind?: 'numeric' | 'statement' } | null
  term: { id: string; name: string; start_date: string; end_date: string } | null
  report_kind?: 'numeric' | 'statement'
  attendance: {
    days: number
    present: number
    late: number
    absent: number
    excused: number
    percent: number | null
    marks: AttendanceMark[]
  }
  subjects: ReportSubject[]
  statements?: ReportStatement[]
  comments?: {
    class_teacher: string | null
    principal: string | null
  }
}

export async function fetchTermReport(studentId: string, termId?: string): Promise<TermReport> {
  const { data, error } = await supabase.rpc('student_term_report', {
    p_student_id: studentId,
    p_term_id: termId || null,
  })
  if (error) throw error
  const row = data as TermReport
  const marks = (row.attendance?.marks ?? []).map((m) => ({
    date: m.date,
    status: (m.status ?? null) as AttendanceStatus | null,
    note: (m.note ?? null) as string | null,
  }))
  return {
    ...row,
    subjects: row.subjects ?? [],
    statements: row.statements ?? [],
    report_kind: row.report_kind ?? row.class?.report_kind ?? 'numeric',
    comments: row.comments ?? { class_teacher: null, principal: null },
    attendance: {
      ...row.attendance,
      marks,
    },
  }
}

export function overallAverage(subjects: ReportSubject[]): number | null {
  const scored = subjects.flatMap((s) => s.papers.map((p) => p.percent).filter((n): n is number => n != null))
  if (scored.length === 0) return null
  return scored.reduce((a, b) => a + b, 0) / scored.length
}
