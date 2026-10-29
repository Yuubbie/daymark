import { supabase } from './supabase'
import type { Role, StaffDayStatus } from './types'

export type HrRow = {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  status: StaffDayStatus | null
  note: string | null
}

export async function listHrRoster(date: string): Promise<HrRow[]> {
  const { data, error } = await supabase.rpc('list_hr_roster', { p_date: date })
  if (error) throw error
  return (Array.isArray(data) ? data : []) as HrRow[]
}

export async function markStaffDay(
  staffId: string,
  date: string,
  status: StaffDayStatus,
  note?: string | null,
) {
  const { error } = await supabase.rpc('mark_staff_day', {
    p_staff_id: staffId,
    p_date: date,
    p_status: status,
    p_note: note ?? null,
  })
  if (error) throw error
}

export type ClinicVisit = {
  id: string
  student_id: string
  visit_at: string
  complaint: string
  treatment: string | null
  sent_home: boolean
  first_name: string
  last_name: string
  class_name: string | null
}

export async function listClinicVisits(): Promise<ClinicVisit[]> {
  const { data, error } = await supabase.rpc('list_clinic_visits')
  if (error) throw error
  return (Array.isArray(data) ? data : []) as ClinicVisit[]
}

export async function recordClinicVisit(
  studentId: string,
  complaint: string,
  treatment: string,
  sentHome: boolean,
): Promise<string> {
  const { data, error } = await supabase.rpc('record_clinic_visit', {
    p_student_id: studentId,
    p_complaint: complaint,
    p_treatment: treatment || null,
    p_sent_home: sentHome,
  })
  if (error) throw error
  return data as string
}

export async function saveReportComment(
  studentId: string,
  classTeacher: string,
  principal: string,
) {
  const { error } = await supabase.rpc('upsert_report_comment', {
    p_student_id: studentId,
    p_class_teacher_comment: classTeacher || null,
    p_principal_comment: principal || null,
  })
  if (error) throw error
}

export async function listStaffSubjects(staffIds: string[]): Promise<Record<string, string[]>> {
  if (staffIds.length === 0) return {}
  const { data, error } = await supabase
    .from('class_teachers')
    .select('teacher_id, subject, classes(name)')
    .in('teacher_id', staffIds)
  if (error) throw error
  const out: Record<string, string[]> = {}
  for (const r of data ?? []) {
    const id = r.teacher_id as string
    const cls = (r.classes as { name?: string } | null)?.name
    const subject = (r.subject as string | null)?.trim()
    const label = [cls, subject].filter(Boolean).join(' · ') || 'Class'
    ;(out[id] ??= []).push(label)
  }
  return out
}
