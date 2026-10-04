export type Role = 'proprietor' | 'admin' | 'teacher' | 'parent' | 'student'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export type DigestChannel = 'push' | 'sms' | 'none'

export type QuestionType = 'objective' | 'multiple_select' | 'subjective' | 'comprehension'

export type ExamKind = 'assessment' | 'exam' | 'interview'
export type ExamStatus = 'draft' | 'published' | 'closed'
export type AttemptStatus = 'in_progress' | 'submitted' | 'marked'
export type ResultStatus =
  | 'in_progress'
  | 'pending_marking'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'

export interface Profile {
  id: string
  school_id: string | null
  role: Role
  full_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  digest_channel: DigestChannel
  student_id: string | null
}

export interface School {
  id: string
  name: string
  slug: string
  subscription_status: string
}

export interface Student {
  id: string
  school_id: string
  class_id: string | null
  first_name: string
  last_name: string
  admission_number: string | null
  date_of_birth?: string | null
  fee_cleared?: boolean
}

export interface AttendanceMark {
  date: string
  status: AttendanceStatus | null
}

export interface QuestionOption {
  id: string
  text: string
}

export interface ComprehensionChild {
  id: string
  prompt: string
  options?: QuestionOption[]
  marks?: number
  correct?: string
}

export const ROLE_HOME: Record<Role, string> = {
  proprietor: '/admin',
  admin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
  student: '/student',
}

export function isExecutive(role: Role | undefined): boolean {
  return role === 'admin' || role === 'proprietor'
}

export function isStaffRole(role: Role | undefined): boolean {
  return role === 'admin' || role === 'proprietor' || role === 'teacher'
}
