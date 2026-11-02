import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

type Result = {
  id: string
  score: number | null
  total_marks: number | null
  submitted_at: string | null
  result_status: string
  exams: { title: string; subject: string | null; kind: string } | null
}

function label(kind: string | undefined) {
  if (kind === 'exam') return 'Exam'
  if (kind === 'interview') return 'Interview'
  return 'Test'
}

export default function StudentResults() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      if (!profile?.student_id) {
        setLoading(false)
        return
      }
      const { data, error: e } = await supabase
        .from('exam_attempts')
        .select('id, score, total_marks, submitted_at, result_status, exams(title, subject, kind)')
        .eq('student_id', profile.student_id)
        .in('result_status', ['approved', 'awaiting_approval', 'pending_marking'])
        .order('submitted_at', { ascending: false })
      if (e) setError(e.message)
      setRows((data ?? []) as unknown as Result[])
      setLoading(false)
    })()
  }, [profile?.student_id])

  const approved = rows.filter((r) => r.result_status === 'approved')
  const pending = rows.filter((r) => r.result_status !== 'approved')

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Results</span>
        <h1 className="text-[26px] mt-1">Assessments</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          Papers open as soon as the school approves the mark.
        </p>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <Empty line={error} />
      ) : !profile?.student_id ? (
        <Empty line="This login is not linked to a student yet. Ask the office to invite your email." />
      ) : (
        <div className="space-y-4">
          <Panel title="Approved">
            {approved.length === 0 ? (
              <Empty line="No approved results yet. Your teacher marks, then the office approves." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {approved.map((r) => (
                  <Row
                    key={r.id}
                    left={
                      <>
                        <div className="text-[15px] font-semibold">{r.exams?.title ?? 'Paper'}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                          {label(r.exams?.kind)}
                          {r.exams?.subject ? ` · ${r.exams.subject}` : ''}
                        </div>
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
          {pending.length > 0 && (
            <Panel title="Waiting for the school">
              <div className="divide-y divide-rule -my-3">
                {pending.map((r) => (
                  <Row
                    key={r.id}
                    left={
                      <>
                        <div className="text-[15px] font-semibold">{r.exams?.title ?? 'Paper'}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                          {r.result_status === 'pending_marking' ? 'Marking' : 'Awaiting approval'}
                        </div>
                      </>
                    }
                    right={<span className="text-[13px] text-ink-faint">—</span>}
                  />
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  )
}
