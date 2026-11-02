import { supabase } from './supabase'

export type ReportKind = 'numeric' | 'statement'
export type StatementLevel = 'emerging' | 'expected' | 'exceeding'

export type PaperMarkRow = {
  id: string
  student_id: string
  subject: string
  title: string
  kind: 'assessment' | 'exam'
  score: number | null
  total: number | null
}

export type StatementGoal = {
  id: string
  area: string
  goal: string
  position: number
}

export type StatementRow = {
  area: string
  goal: string
  comment: string | null
  level: StatementLevel | null
  position: number
}

export const STATEMENT_LEVELS: { key: StatementLevel; label: string; short: string }[] = [
  { key: 'emerging', label: 'Emerging', short: 'E' },
  { key: 'expected', label: 'Expected', short: 'Ex' },
  { key: 'exceeding', label: 'Exceeding', short: 'Exc' },
]

export function looksLikeEarlyYears(name: string, level?: string | null) {
  const s = `${name} ${level ?? ''}`
  return /(nursery|eyfs|reception|creche|crèche|playgroup|kindergarten|early year|\bkg\b)/i.test(s)
}

export async function savePaperMark(input: {
  studentId: string
  subject: string
  title: string
  kind: 'assessment' | 'exam'
  score: number | null
  total: number
}) {
  const { error } = await supabase.rpc('save_paper_mark', {
    p_student_id: input.studentId,
    p_subject: input.subject,
    p_title: input.title,
    p_kind: input.kind,
    p_score: input.score,
    p_total: input.total,
  })
  if (error) throw error
}

export async function listPaperMarks(
  classId: string,
  subject?: string,
  title?: string,
): Promise<PaperMarkRow[]> {
  const { data, error } = await supabase.rpc('list_paper_marks', {
    p_class_id: classId,
    p_subject: subject || null,
    p_title: title || null,
  })
  if (error) throw error
  return (Array.isArray(data) ? data : []) as PaperMarkRow[]
}

export async function listStatementGoals(): Promise<StatementGoal[]> {
  const { data, error } = await supabase.rpc('list_statement_goals')
  if (error) throw error
  return (Array.isArray(data) ? data : []) as StatementGoal[]
}

export async function listReportStatements(studentId: string): Promise<StatementRow[]> {
  const { data, error } = await supabase.rpc('list_report_statements', {
    p_student_id: studentId,
  })
  if (error) throw error
  return (Array.isArray(data) ? data : []) as StatementRow[]
}

export async function saveReportStatement(input: {
  studentId: string
  area: string
  goal: string
  comment: string | null
  level: StatementLevel | null
  position: number
}) {
  const { error } = await supabase.rpc('save_report_statement', {
    p_student_id: input.studentId,
    p_area: input.area,
    p_goal: input.goal,
    p_comment: input.comment,
    p_level: input.level,
    p_position: input.position,
  })
  if (error) throw error
}


