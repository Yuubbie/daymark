export type Role = 'admin' | 'teacher' | 'parent'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface Profile {
  id: string
  school_id: string | null
  role: Role
  full_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
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
}

export interface AttendanceMark {
  date: string
  status: AttendanceStatus | null
}
