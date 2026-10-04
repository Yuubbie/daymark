import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

type Child = {
  id: string
  first_name: string
  last_name: string
  fee_cleared: boolean
}

type Result = {
  id: string
  score: number | null
  total_marks: number | null
  submitted_at: string | null
  exams: { title: string; subject: string | null } | null
}

export default function ParentAssessmentsRoute() {
  const { session } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [results, setResults] = useState<Record<string, Result[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      if (!session?.user.id) return
      const { data: links } = await supabase
        .from('parent_student_links')
        .select('student_id, students(id, first_name, last_name, fee_cleared)')
        .eq('parent_id', session.user.id)
      const kids: Child[] = []
      for (const row of links ?? []) {
        const s = row.students as unknown as Child | Child[] | null
        const child = Array.isArray(s) ? s[0] : s
        if (child) kids.push(child)
      }
      setChildren(kids)
      const cleared = kids.filter((k) => k.fee_cleared).map((k) => k.id)
      if (cleared.length > 0) {
        const { data } = await supabase
          .from('exam_attempts')
          .select('id, student_id, score, total_marks, submitted_at, exams(title, subject)')
          .in('student_id', cleared)
          .eq('result_status', 'approved')
          .order('submitted_at', { ascending: false })
        const map: Record<string, Result[]> = {}
        for (const r of data ?? []) {
          const sid = (r as { student_id: string }).student_id
          ;(map[sid] ??= []).push(r as unknown as Result)
        }
        setResults(map)
      }
      setLoading(false)
    })()
  }, [session?.user.id])

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Results</span>
        <h1 className="text-[26px] mt-1">Assessments</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          Only approved results for children whose fees are cleared appear here.
        </p>
      </div>
      {loading ? (
        <Spinner />
      ) : children.length === 0 ? (
        <Empty line="No children linked yet. Redeem a claim code from the school." />
      ) : (
        <div className="space-y-4">
          {children.map((c) => (
            <Panel key={c.id} title={`${c.first_name} ${c.last_name}`}>
              {!c.fee_cleared ? (
                <Empty line="Fees are outstanding. Results stay locked until the school marks this child as cleared." />
              ) : (results[c.id] ?? []).length === 0 ? (
                <Empty line="No approved results yet." />
              ) : (
                <div className="divide-y divide-rule -my-3">
                  {(results[c.id] ?? []).map((r) => (
                    <Row
                      key={r.id}
                      left={
                        <>
                          <div className="text-[15px] font-semibold">{r.exams?.title ?? 'Paper'}</div>
                          <div className="text-[12px] text-ink-faint">{r.exams?.subject ?? ''}</div>
                        </>
                      }
                      right={
                        <span className="tnum text-[15px] font-semibold">
                          {r.score ?? '—'} / {r.total_marks ?? '—'}
                        </span>
                      }
                    />
                  ))}
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  )
}
