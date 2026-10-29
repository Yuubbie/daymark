import { supabase } from './supabase'
import type { BillingPlanKey } from './types'

export const BILLING_PLANS: {
  key: BillingPlanKey
  plan: string
  interval: 'month' | 'term' | 'year'
  nairaPerStudent: number
  label: string
  unit: string
}[] = [
  { key: 'month', plan: 'daymark_month', interval: 'month', nairaPerStudent: 1500, label: 'Month', unit: 'per student / month' },
  { key: 'term', plan: 'daymark_term', interval: 'term', nairaPerStudent: 3500, label: 'Term', unit: 'per student / term' },
  { key: 'year', plan: 'daymark_year', interval: 'year', nairaPerStudent: 10000, label: 'School year', unit: 'per student / year' },
]

export type BillingQuote = {
  school_id: string
  student_count: number
  plans: Record<
    BillingPlanKey,
    { key: string; interval: string; naira_per_student: number; naira: number; kobo: number }
  >
}

export async function schoolBillingQuote(): Promise<BillingQuote> {
  const { data, error } = await supabase.rpc('school_billing_quote')
  if (error) throw error
  return data as BillingQuote
}

export function naira(n: number) {
  return `N${n.toLocaleString('en-NG')}`
}
