import { supabase } from './supabase'

/** The two people who run Daymaark. Same emails as platform_admins. */
export const OPS_EMAILS = ['yomipeculiar@gmail.com', 'daymaarkapp@gmail.com'] as const

export function isOpsEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return (OPS_EMAILS as readonly string[]).includes(email.trim().toLowerCase())
}

export type OpsSchool = {
  id: string
  name: string
  slug: string
  subscription_status: string
  address: string | null
  phone: string | null
  has_crest: boolean
  created_at: string
  sub_status: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  students: number
  classes: number
  staff: number
  parents: number
  last_register: string | null
  last_attempt: string | null
  proprietor_name: string | null
  proprietor_email: string | null
  proprietor_phone: string | null
}

export async function fetchOpsSchools(): Promise<OpsSchool[]> {
  const { data, error } = await supabase.rpc('ops_school_list')
  if (error) throw error
  return (data ?? []) as OpsSchool[]
}

export async function removeOpsSchool(schoolId: string, confirmName: string): Promise<void> {
  const { error } = await supabase.rpc('ops_remove_school', {
    p_school_id: schoolId,
    p_confirm_name: confirmName,
  })
  if (error) throw error
}

export function schoolsToCsv(rows: OpsSchool[]): string {
  const cols = [
    'name',
    'slug',
    'status',
    'address',
    'school_phone',
    'proprietor_name',
    'proprietor_email',
    'proprietor_phone',
    'students',
    'classes',
    'staff',
    'parents_linked',
    'created_at',
    'last_register',
    'trial_ends_at',
    'has_crest',
  ]
  const line = (cells: (string | number | boolean | null | undefined)[]) =>
    cells
      .map((c) => {
        const s = c == null ? '' : String(c)
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      })
      .join(',')
  const body = rows.map((r) =>
    line([
      r.name,
      r.slug,
      r.subscription_status,
      r.address,
      r.phone,
      r.proprietor_name,
      r.proprietor_email,
      r.proprietor_phone,
      r.students,
      r.classes,
      r.staff,
      r.parents,
      r.created_at?.slice(0, 10),
      r.last_register,
      r.trial_ends_at?.slice(0, 10),
      r.has_crest ? 'yes' : 'no',
    ]),
  )
  return [line(cols), ...body].join('\n')
}
