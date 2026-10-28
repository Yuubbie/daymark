import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SchoolBrand } from '../../components/SchoolBrand'
import { IconBack } from '../../components/Icons'
import { useAuth } from '../../lib/auth'
import { Alert, Button, Field, Spinner, TextArea } from '../../components/ui'
import {
  fetchAttemptState,
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
const DRAFT_KEY = 'daymark.attempt.draft.'
const NAME_KEY = 'daymark.sit.name.'

function readDraft(attemptId: string): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY + attemptId)
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function clearDraft(attemptId: string) {
  try {
    localStorage.removeItem(DRAFT_KEY + attemptId)
  } catch {
    /* ignore */
  }
}

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
  const deadline = useRef<number | null>(null)
  const expiredAtStart = useRef(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const p = token ? await fetchPaperByToken(token) : await fetchPaperById(examId!)
        setPaper(p)
        // Prefill the name this phone used, so a resumed sit is one tap.
        if (token) {
          try {
            const remembered = localStorage.getItem(NAME_KEY + token)
            if (remembered) setName(remembered)
          } catch {
            /* ignore */
          }
        }
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
    // begin() seeds the deadline from the attempt's real start time, so a
    // refresh finishes the original clock instead of granting a fresh one.
    if (deadline.current === null) {
      deadline.current = Date.now() + paper.exam.duration_minutes * 60_000
    }
    const update = () => {
      const left = Math.max(0, Math.round(((deadline.current ?? Date.now()) - Date.now()) / 1000))
      setRemaining(left)
    }
    update()
    tick.current = window.setInterval(update, 1000)
    return () => {
      if (tick.current) window.clearInterval(tick.current)
    }
  }, [started, paper])

  useEffect(() => {
    if (remaining === 0 && attemptId && !result && !expiredAtStart.current) void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  // Answers only reach the server on submit, so a refresh mid-paper would
  // otherwise lose them. Keep them in this browser until the paper is in.
  useEffect(() => {
    if (!started || !attemptId || result) return
    try {
      localStorage.setItem(DRAFT_KEY + attemptId, JSON.stringify(answers))
    } catch {
      /* ignore */
    }
  }, [answers, attemptId, started, result])

  async function begin() {
    setError(null)
    if (token && !name.trim()) {
      setError('Type your full name before you start. One attempt per name.')
      return
    }
    try {
      const id = token ? await startLinked(token, name, email) : await startStudent(examId!)

      // A resumed attempt comes back with its real start time and whatever was
      // already saved. The browser draft is layered on top because answers are
      // only written to the server on submit.
      let saved: Record<string, unknown> = {}
      let beganAt = Date.now()
      try {
        const state = await fetchAttemptState(id, token)
        saved = state.answers ?? {}
        if (state.started_at) beganAt = new Date(state.started_at).getTime()
      } catch {
        /* a blank sheet beats a blocked start */
      }
      const answersNow = { ...saved, ...readDraft(id) }

      if (paper?.exam.duration_minutes) {
        deadline.current = beganAt + paper.exam.duration_minutes * 60_000
        const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
        // Time already gone? Let them see the paper and submit by hand rather
        // than firing an empty sheet the moment the screen opens.
        expiredAtStart.current = left === 0
        setRemaining(left)
      }

      setAnswers(answersNow)
      setAttemptId(id)
      setStarted(true)
      try {
        if (token) localStorage.setItem(NAME_KEY + token, name.trim())
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function finish() {
    if (!attemptId) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await submitAttempt(attemptId, answers, token)
      setResult(r)
      clearDraft(attemptId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function downloadOffline() {
    if (!paper) return
    printPaperPdf(paper, questions)
  }

  if (loading) return <Shell desk={!!examId}><Spinner /></Shell>
  if (error && !paper) {
    return (
      <Shell desk={!!examId}>
        <Alert>{error}</Alert>
      </Shell>
    )
  }
  if (!paper) return null

  if (result) {
    return (
      <Shell desk={!!examId}>
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
        {examId && (
          <div className="mt-6">
            <Link to="/student">
              <Button variant="secondary">Back to desk</Button>
            </Link>
          </div>
        )}
      </Shell>
    )
  }

  if (!started) {
    const mail = paper.exam.allow_offline
      ? `mailto:?subject=${encodeURIComponent(`Completed: ${paper.exam.title}`)}&body=${encodeURIComponent(
          `I sat ${paper.exam.title}${paper.exam.subject ? ` (${paper.exam.subject})` : ''}. Please find the printed paper attached, or I will send the PDF after printing.`,
        )}`
      : null
    return (
      <Shell desk={!!examId}>
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
            <Field label="Your full name" value={name} onChange={(e) => setName(e.target.value)} hint="Type it exactly as it is on the class register. One attempt per name, so do not share it." />
            <Field label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => void begin()}>Start</Button>
          {paper.exam.allow_offline && (
            <Button variant="secondary" onClick={downloadOffline}>
              Print paper (PDF)
            </Button>
          )}
          {mail && (
            <a href={mail}>
              <Button variant="ghost" type="button">
                Email the office
              </Button>
            </a>
          )}
        </div>
        {paper.exam.allow_offline && (
          <p className="mt-3 text-[12px] text-ink-faint">
            Print opens a read-only paper. Use the browser Print dialog and choose Save as PDF. Sit online when you can, or email the printed paper to the office.
          </p>
        )}
      </Shell>
    )
  }

  const mm = remaining !== null ? Math.floor(remaining / 60) : null
  const ss = remaining !== null ? remaining % 60 : null

  return (
    <Shell desk={!!examId}>
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

function Shell({ children, desk }: { children: ReactNode; desk?: boolean }) {
  const { school } = useAuth()
  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-ink-invert px-5 h-14 flex items-center gap-3">
        {desk && (
          <Link
            to="/student"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-invert/80 hover:text-brass shrink-0"
          >
            <IconBack className="h-3.5 w-3.5" />
            Desk
          </Link>
        )}
        <SchoolBrand
          name={school?.name ?? 'Exam'}
          logoUrl={school?.logo_url}
          size="xs"
          className="text-ink-invert"
        />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function printPaperPdf(paper: Paper, questions: PaperQuestion[]) {
  const blocks = questions
    .map((q, i) => {
      const opts = (q.options ?? [])
        .map((o) => `<div class="opt"><span class="id">${escapeHtml(o.id.toUpperCase())}</span> ${escapeHtml(o.text)}</div>`)
        .join('')
      const kids = (q.children ?? [])
        .map((c) => {
          const copts = (c.options ?? [])
            .map((o) => `<div class="opt"><span class="id">${escapeHtml(o.id.toUpperCase())}</span> ${escapeHtml(o.text)}</div>`)
            .join('')
          return `<p class="sub">${escapeHtml(c.prompt)}</p>${copts}`
        })
        .join('')
      const written =
        q.question_type === 'subjective'
          ? '<div class="lines"></div><div class="lines"></div><div class="lines"></div>'
          : ''
      return `<section>
        <div class="meta">${i + 1} · ${escapeHtml(q.question_type.replace('_', ' '))} · ${q.marks} mark${q.marks === 1 ? '' : 's'}</div>
        ${q.passage ? `<p class="passage">${escapeHtml(q.passage)}</p>` : ''}
        <p class="q">${escapeHtml(q.prompt)}</p>
        ${opts}${kids}${written}
      </section>`
    })
    .join('')
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(paper.exam.title)}</title>
<style>
  body { font-family: Georgia, serif; color: #143A2B; margin: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .eye { font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #7C8B83; }
  .note { font-size: 13px; color: #4A5F55; margin: 8px 0 20px; }
  section { border-top: 1px solid #DDE2DB; padding: 14px 0; page-break-inside: avoid; }
  .meta { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #7C8B83; }
  .q { font-weight: 700; margin: 6px 0; }
  .passage { background: #FAF3E4; padding: 8px 10px; }
  .opt { margin: 4px 0 4px 8px; }
  .id { font-family: ui-monospace, monospace; font-size: 11px; margin-right: 8px; }
  .lines { border-bottom: 1px solid #C3CCC2; height: 28px; }
  .foot { margin-top: 24px; font-size: 12px; color: #7C8B83; }
</style></head><body>
  <div class="eye">${escapeHtml(paper.exam.kind)} · read only</div>
  <h1>${escapeHtml(paper.exam.title)}</h1>
  <div class="note">${paper.exam.subject ? escapeHtml(paper.exam.subject) + ' · ' : ''}${
    paper.exam.duration_minutes ? paper.exam.duration_minutes + ' minutes · ' : ''
  }${questions.length} questions. Write on the printout. No answers are printed. Save as PDF from the print dialog, then email the office if you sat this offline.</div>
  ${paper.exam.instructions ? `<p class="note">${escapeHtml(paper.exam.instructions)}</p>` : ''}
  ${blocks}
  <p class="foot">Name: _______________________________ &nbsp; Class: _____________ &nbsp; Date: _____________</p>
  <script>window.onload = function () { window.print(); }<\/script>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
