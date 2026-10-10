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
  school: { id: string; name: string }
  class: { id: string; name: string } | null
  term: { id: string; name: string; start_date: string; end_date: string } | null
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
  }))
  return {
    ...row,
    subjects: row.subjects ?? [],
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
