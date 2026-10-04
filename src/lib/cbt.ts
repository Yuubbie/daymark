import { supabase } from './supabase'
import type { ExamKind, ExamStatus, QuestionType, ResultStatus } from './types'

export type BankRow = {
  id: string
  title: string
  subject: string
  class_id: string | null
  description: string | null
  created_at: string
}

export type QuestionRow = {
  id: string
  bank_id: string | null
  question_type: QuestionType
  prompt: string
  passage: string | null
  options: { id: string; text: string }[]
  answer_key: Record<string, unknown> | null
  marks: number
  tags: string[]
}

export type ExamRow = {
  id: string
  title: string
  subject: string | null
  class_id: string | null
  kind: ExamKind
  status: ExamStatus
  duration_minutes: number | null
  opens_at: string | null
  closes_at: string | null
  allow_offline: boolean
  instructions: string | null
  created_at: string
}

export type PaperQuestion = {
  id: string
  question_type: QuestionType
  prompt: string
  passage: string | null
  options: { id: string; text: string }[] | null
  marks: number
  children: { id: string; prompt: string; options: { id: string; text: string }[]; marks: number }[] | null
}

export type Paper = {
  exam: {
    id: string
    title: string
    subject: string | null
    kind: ExamKind
    instructions: string | null
    duration_minutes: number | null
    shuffle_questions: boolean
    shuffle_options: boolean
    allow_offline: boolean
  }
  questions: PaperQuestion[]
  token?: string
  link_kind?: string
}

export type AttemptRow = {
  id: string
  exam_id: string
  student_id: string | null
  applicant_name: string | null
  status: string
  result_status: ResultStatus
  score: number | null
  total_marks: number | null
  submitted_at: string | null
  exams?: { title: string; subject: string | null } | null
}

export async function listBanks(): Promise<BankRow[]> {
  const { data, error } = await supabase
    .from('question_banks')
    .select('id, title, subject, class_id, description, created_at')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as BankRow[]
}

export async function createBank(schoolId: string, title: string, subject: string, classId?: string) {
  const { data, error } = await supabase
    .from('question_banks')
    .insert({
      school_id: schoolId,
      title: title.trim(),
      subject: subject.trim(),
      class_id: classId || null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function listQuestions(bankId: string): Promise<QuestionRow[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, bank_id, question_type, prompt, passage, options, answer_key, marks, tags')
    .eq('bank_id', bankId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as QuestionRow[]
}

export async function insertQuestion(row: {
  school_id: string
  bank_id: string
  question_type: QuestionType
  prompt: string
  passage?: string | null
  options?: { id: string; text: string }[]
  answer_key?: Record<string, unknown> | null
  marks: number
}) {
  const { error } = await supabase.from('questions').insert({
    school_id: row.school_id,
    bank_id: row.bank_id,
    question_type: row.question_type,
    prompt: row.prompt,
    passage: row.passage ?? null,
    options: row.options ?? [],
    answer_key: row.answer_key ?? null,
    marks: row.marks,
  })
  if (error) throw error
}

export async function listExams(): Promise<ExamRow[]> {
  const { data, error } = await supabase
    .from('exams')
    .select(
      'id, title, subject, class_id, kind, status, duration_minutes, opens_at, closes_at, allow_offline, instructions, created_at',
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ExamRow[]
}

export async function createExam(input: {
  school_id: string
  title: string
  subject?: string
  class_id?: string
  kind: ExamKind
  duration_minutes?: number
  instructions?: string
  allow_offline?: boolean
  opens_at?: string | null
  closes_at?: string | null
}) {
  const { data, error } = await supabase
    .from('exams')
    .insert({
      school_id: input.school_id,
      title: input.title.trim(),
      subject: input.subject?.trim() || null,
      class_id: input.class_id || null,
      kind: input.kind,
      duration_minutes: input.duration_minutes || null,
      instructions: input.instructions || null,
      allow_offline: input.allow_offline ?? true,
      opens_at: input.opens_at || null,
      closes_at: input.closes_at || null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function attachQuestions(examId: string, questionIds: string[]) {
  const rows = questionIds.map((id, i) => ({ exam_id: examId, question_id: id, position: i + 1 }))
  const { error } = await supabase.from('exam_questions').insert(rows)
  if (error) throw error
}

export async function setExamStatus(examId: string, status: ExamStatus) {
  const { error } = await supabase.rpc('set_exam_status', { p_exam_id: examId, p_status: status })
  if (error) throw error
}

export async function mintExamLink(examId: string, kind: 'student' | 'applicant' = 'student') {
  const { data, error } = await supabase.rpc('generate_exam_link', {
    p_exam_id: examId,
    p_kind: kind,
  })
  if (error) throw error
  return data as string
}

export async function fetchPaperByToken(token: string): Promise<Paper> {
  const { data, error } = await supabase.rpc('exam_paper', { p_token: token })
  if (error) throw error
  return data as Paper
}

export async function fetchPaperById(examId: string): Promise<Paper> {
  const { data, error } = await supabase.rpc('exam_paper_for_id', { p_exam_id: examId })
  if (error) throw error
  return data as Paper
}

export async function startLinked(token: string, name?: string, email?: string) {
  const { data, error } = await supabase.rpc('start_linked_attempt', {
    p_token: token,
    p_applicant_name: name || null,
    p_applicant_email: email || null,
  })
  if (error) throw error
  return data as string
}

export async function startStudent(examId: string) {
  const { data, error } = await supabase.rpc('start_student_attempt', { p_exam_id: examId })
  if (error) throw error
  return data as string
}

export async function submitAttempt(attemptId: string, answers: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('submit_linked_attempt', {
    p_attempt_id: attemptId,
    p_answers: answers,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row as { score: number; total: number; result_status: ResultStatus }
}

export async function listPendingAttempts(): Promise<AttemptRow[]> {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, student_id, applicant_name, status, result_status, score, total_marks, submitted_at, exams(title, subject)')
    .in('result_status', ['pending_marking', 'awaiting_approval', 'rejected'])
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as AttemptRow[]
}

export async function listAttemptAnswers(attemptId: string) {
  const { data, error } = await supabase
    .from('exam_answers')
    .select('id, question_id, response, is_correct, marks_awarded, feedback, questions(prompt, question_type, marks, answer_key, options, passage)')
    .eq('attempt_id', attemptId)
  if (error) throw error
  return data ?? []
}

export async function markAnswer(answerId: string, marks: number, feedback: string, isCorrect: boolean) {
  const { error } = await supabase.rpc('mark_exam_answer', {
    p_answer_id: answerId,
    p_marks: marks,
    p_feedback: feedback || null,
    p_is_correct: isCorrect,
  })
  if (error) throw error
}

export async function setResult(attemptId: string, status: 'approved' | 'rejected', note?: string) {
  const { error } = await supabase.rpc('set_result_status', {
    p_attempt_id: attemptId,
    p_status: status,
    p_note: note || null,
  })
  if (error) throw error
}

export async function correctKey(questionId: string, answerKey: Record<string, unknown>) {
  const { error } = await supabase.rpc('update_question_answer_key', {
    p_question_id: questionId,
    p_answer_key: answerKey,
  })
  if (error) throw error
}

export async function publishedExamsForClass(classId: string): Promise<ExamRow[]> {
  const { data, error } = await supabase
    .from('exams')
    .select(
      'id, title, subject, class_id, kind, status, duration_minutes, opens_at, closes_at, allow_offline, instructions, created_at',
    )
    .eq('class_id', classId)
    .eq('status', 'published')
    .order('opens_at', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as ExamRow[]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
