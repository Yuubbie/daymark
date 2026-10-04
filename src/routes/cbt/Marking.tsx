import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Panel, Row, Spinner, TextArea } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { isExecutive } from '../../lib/types'
import {
  listAttemptAnswers,
  listPendingAttempts,
  markAnswer,
  setResult,
  type AttemptRow,
} from '../../lib/cbt'

export default function Marking() {
  const { profile } = useAuth()
  const executive = isExecutive(profile?.role)
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await listPendingAttempts())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function open(id: string) {
    setOpenId(id)
    try {
      setAnswers((await listAttemptAnswers(id)) as Record<string, unknown>[])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function saveMark(answerId: string, marks: number, feedback: string) {
    try {
      await markAnswer(answerId, marks, feedback, marks > 0)
      if (openId) setAnswers((await listAttemptAnswers(openId)) as Record<string, unknown>[])
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function decide(id: string, status: 'approved' | 'rejected') {
    try {
      await setResult(id, status)
      setOpenId(null)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Results</span>
        <h1 className="text-[26px] mt-1">{executive ? 'Approve results' : 'Marking queue'}</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          Teachers mark written answers. The proprietor or admin approves before any parent can see a score.
        </p>
      </div>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty line="Nothing waiting. Published papers land here after a student submits." />
      ) : (
        <div className="space-y-4">
          <Panel title="Queue">
            <div className="divide-y divide-rule -my-3">
              {rows.map((r) => (
                <Row
                  key={r.id}
                  left={
                    <>
                      <div className="text-[15px] font-semibold">
                        {(r.exams as { title?: string } | null)?.title ?? 'Paper'}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint mt-0.5">
                        {r.applicant_name ?? 'Student'} · {r.result_status.replace('_', ' ')}
                        {r.score != null ? ` · ${r.score}/${r.total_marks}` : ''}
                      </div>
                    </>
                  }
                  right={
                    <button className="text-[12px] underline" onClick={() => void open(r.id)}>
                      Open
                    </button>
                  }
                />
              ))}
            </div>
          </Panel>

          {openId && (
            <Panel title="Script">
              <div className="space-y-5">
                {answers.map((a) => {
                  const q = a.questions as {
                    prompt?: string
                    question_type?: string
                    marks?: number
                  } | null
                  return (
                    <AnswerCard
                      key={a.id as string}
                      id={a.id as string}
                      prompt={q?.prompt ?? ''}
                      type={q?.question_type ?? ''}
                      max={Number(q?.marks ?? 0)}
                      awarded={a.marks_awarded as number | null}
                      response={a.response}
                      onSave={saveMark}
                    />
                  )
                })}
                {executive && (
                  <div className="flex gap-2 pt-2">
                    <Button onClick={() => void decide(openId, 'approved')}>Approve for parents</Button>
                    <Button variant="danger" onClick={() => void decide(openId, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  )
}

function AnswerCard({
  id,
  prompt,
  type,
  max,
  awarded,
  response,
  onSave,
}: {
  id: string
  prompt: string
  type: string
  max: number
  awarded: number | null
  response: unknown
  onSave: (id: string, marks: number, feedback: string) => Promise<void>
}) {
  const [marks, setMarks] = useState(String(awarded ?? ''))
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="border border-rule rounded-md p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{type}</div>
      <p className="mt-1 text-[14px] font-semibold">{prompt}</p>
      <pre className="mt-2 text-[12px] bg-surface-alt px-3 py-2 rounded-md overflow-x-auto">
        {JSON.stringify(response, null, 2)}
      </pre>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label={`Marks / ${max}`} type="number" value={marks} onChange={(e) => setMarks(e.target.value)} />
        <TextArea label="Comment" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </div>
      <div className="mt-2">
        <Button
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            await onSave(id, Number(marks) || 0, feedback)
            setBusy(false)
          }}
        >
          Save mark
        </Button>
      </div>
    </div>
  )
}
