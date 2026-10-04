import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Wordmark } from '../../components/Logo'
import { Alert, Button, Field, Spinner, TextArea } from '../../components/ui'
import {
  fetchPaperById,
  fetchPaperByToken,
  shuffle,
  startLinked,
  startStudent,
  submitAttempt,
  type Paper,
  type PaperQuestion,
} from '../../lib/cbt'

const OFFLINE_KEY = 'daymark.offline.paper.'

export default function SitExam({ examId }: { examId?: string }) {
  const { token } = useParams()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [started, setStarted] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [remaining, setRemaining] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; result_status: string } | null>(null)
  const tick = useRef<number | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const p = token ? await fetchPaperByToken(token) : await fetchPaperById(examId!)
        setPaper(p)
        if (p.exam.allow_offline) {
          try {
            localStorage.setItem(OFFLINE_KEY + (token ?? examId), JSON.stringify(p))
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        const cached = (() => {
          try {
            const raw = localStorage.getItem(OFFLINE_KEY + (token ?? examId))
            return raw ? (JSON.parse(raw) as Paper) : null
          } catch {
            return null
          }
        })()
        if (cached) setPaper(cached)
        else setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [token, examId])

  const questions = useMemo(() => {
    if (!paper) return []
    const qs = paper.exam.shuffle_questions ? shuffle(paper.questions) : paper.questions
    return qs.map((q) => ({
      ...q,
      options: q.options && paper.exam.shuffle_options ? shuffle(q.options) : q.options,
    }))
  }, [paper])

  useEffect(() => {
    if (!started || !paper?.exam.duration_minutes) return
    setRemaining(paper.exam.duration_minutes * 60)
    tick.current = window.setInterval(() => {
      setRemaining((s) => {
        if (s === null) return s
        if (s <= 1) {
          if (tick.current) window.clearInterval(tick.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (tick.current) window.clearInterval(tick.current)
    }
  }, [started, paper])

  useEffect(() => {
    if (remaining === 0 && attemptId && !result) void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  async function begin() {
    setError(null)
    try {
      const id = token ? await startLinked(token, name, email) : await startStudent(examId!)
      setAttemptId(id)
      setStarted(true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function finish() {
    if (!attemptId) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await submitAttempt(attemptId, answers)
      setResult(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function downloadOffline() {
    if (!paper) return
    const blob = new Blob([JSON.stringify({ paper, saved_at: new Date().toISOString() }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${paper.exam.title.replace(/\s+/g, '-')}.daymark.json`
    a.click()
  }

  if (loading) return <Shell><Spinner /></Shell>
  if (error && !paper) {
    return (
      <Shell>
        <Alert>{error}</Alert>
      </Shell>
    )
  }
  if (!paper) return null

  if (result) {
    return (
      <Shell>
        <span className="eyebrow">Submitted</span>
        <h1 className="text-[28px] mt-1">{paper.exam.title}</h1>
        <p className="mt-4 text-[15px] text-ink-soft">
          Auto-marked score so far:{' '}
          <span className="tnum font-semibold text-ink">
            {result.score} / {result.total}
          </span>
        </p>
        <p className="mt-2 text-[14px] text-ink-faint">
          {result.result_status === 'pending_marking'
            ? 'A teacher still has to mark the written parts. The proprietor approves before parents see it.'
            : 'Waiting for the proprietor or admin to approve this result before parents can see it.'}
        </p>
      </Shell>
    )
  }

  if (!started) {
    return (
      <Shell>
        <span className="eyebrow">{paper.exam.kind}</span>
        <h1 className="text-[28px] mt-1">{paper.exam.title}</h1>
        {paper.exam.subject && <p className="mt-1 text-[14px] text-ink-soft">{paper.exam.subject}</p>}
        {paper.exam.instructions && (
          <p className="mt-4 text-[14px] text-ink-soft leading-relaxed">{paper.exam.instructions}</p>
        )}
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          {paper.exam.duration_minutes ? `${paper.exam.duration_minutes} minutes` : 'Untimed'} · {questions.length} questions
        </p>
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
        {token && (
          <div className="mt-5 space-y-3">
            <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} hint="Required if you are sitting this on a borrowed device." />
            <Field label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => void begin()}>Start</Button>
          {paper.exam.allow_offline && (
            <Button variant="secondary" onClick={downloadOffline}>
              Download for offline
            </Button>
          )}
        </div>
      </Shell>
    )
  }

  const mm = remaining !== null ? Math.floor(remaining / 60) : null
  const ss = remaining !== null ? remaining % 60 : null

  return (
    <Shell>
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <span className="eyebrow">{paper.exam.kind}</span>
          <h1 className="text-[22px] mt-1">{paper.exam.title}</h1>
        </div>
        {mm !== null && (
          <span className={`tnum text-[22px] font-semibold ${remaining !== null && remaining < 60 ? 'text-absent' : ''}`}>
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </span>
        )}
      </div>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <ol className="space-y-6">
        {questions.map((q, i) => (
          <li key={q.id} className="border border-rule rounded-lg p-4 bg-surface">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {i + 1} · {q.question_type.replace('_', ' ')} · {q.marks} mark{q.marks === 1 ? '' : 's'}
            </div>
            {q.passage && <p className="mt-2 text-[14px] leading-relaxed bg-brass-wash px-3 py-2 rounded-md">{q.passage}</p>}
            <p className="mt-2 text-[15px] font-semibold">{q.prompt}</p>
            <QuestionBody q={q} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} />
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <Button full loading={submitting} onClick={() => void finish()}>
          Submit
        </Button>
      </div>
    </Shell>
  )
}

function QuestionBody({
  q,
  value,
  onChange,
}: {
  q: PaperQuestion
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (q.question_type === 'subjective') {
    return (
      <div className="mt-3">
        <TextArea
          label="Your answer"
          value={((value as { text?: string } | undefined)?.text) ?? ''}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
    )
  }
  if (q.question_type === 'multiple_select') {
    const chosen = new Set(((value as { choices?: string[] } | undefined)?.choices) ?? [])
    return (
      <div className="mt-3 space-y-2">
        {(q.options ?? []).map((o) => (
          <label key={o.id} className="flex items-start gap-2 text-[14px]">
            <input
              type="checkbox"
              className="mt-1"
              checked={chosen.has(o.id)}
              onChange={(e) => {
                const next = new Set(chosen)
                if (e.target.checked) next.add(o.id)
                else next.delete(o.id)
                onChange({ choices: [...next] })
              }}
            />
            <span>
              <span className="font-mono text-[11px] uppercase mr-2">{o.id}</span>
              {o.text}
            </span>
          </label>
        ))}
      </div>
    )
  }
  if (q.question_type === 'comprehension') {
    const rec = (value as Record<string, string> | undefined) ?? {}
    return (
      <div className="mt-3 space-y-4">
        {(q.children ?? []).map((c) => (
          <div key={c.id}>
            <p className="text-[14px] font-semibold">{c.prompt}</p>
            <div className="mt-2 space-y-1.5">
              {(c.options ?? []).map((o) => (
                <label key={o.id} className="flex items-start gap-2 text-[14px]">
                  <input
                    type="radio"
                    name={`c-${q.id}-${c.id}`}
                    checked={rec[`child_${c.id}`] === o.id}
                    onChange={() => onChange({ ...rec, [`child_${c.id}`]: o.id })}
                  />
                  <span>
                    <span className="font-mono text-[11px] uppercase mr-2">{o.id}</span>
                    {o.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  const choice = (value as { choice?: string } | undefined)?.choice
  return (
    <div className="mt-3 space-y-2">
      {(q.options ?? []).map((o) => (
        <label key={o.id} className="flex items-start gap-2 text-[14px]">
          <input type="radio" name={q.id} checked={choice === o.id} onChange={() => onChange({ choice: o.id })} />
          <span>
            <span className="font-mono text-[11px] uppercase mr-2">{o.id}</span>
            {o.text}
          </span>
        </label>
      ))}
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-ink-invert px-5 h-14 flex items-center">
        <Wordmark size="xs" className="text-ink-invert" />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  )
}
