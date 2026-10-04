import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Row, Spinner, TextArea } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listClasses, type ClassRow } from '../../lib/queries'
import {
  attachQuestions,
  createExam,
  listBanks,
  listExams,
  listQuestions,
  mintExamLink,
  setExamStatus,
  type BankRow,
  type ExamRow,
} from '../../lib/cbt'
import type { ExamKind } from '../../lib/types'

export default function Exams() {
  const { profile } = useAuth()
  const [exams, setExams] = useState<ExamRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [banks, setBanks] = useState<BankRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [e, c, b] = await Promise.all([listExams(), listClasses(), listBanks()])
      setExams(e)
      setClasses(c)
      setBanks(b)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function publish(id: string) {
    try {
      await setExamStatus(id, 'published')
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function closeExam(id: string) {
    try {
      await setExamStatus(id, 'closed')
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function share(id: string, kind: 'student' | 'applicant') {
    try {
      const token = await mintExamLink(id, kind)
      setLink(`${window.location.origin}/sit/${token}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">CBT</span>
          <h1 className="text-[26px] mt-1">Assessments and exams</h1>
        </div>
        <Button onClick={() => setOpen(true)}>Set paper</Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {link && (
        <Panel title="Share link" className="mb-4">
          <p className="text-[13px] text-ink-soft mb-2">
            Same idea as a Google Form. Open on any device. No Daymaark account needed.
          </p>
          <input readOnly className="w-full h-11 px-3 bg-surface-alt border border-rule rounded-md text-[13px] font-mono" value={link} />
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(link)
              }}
            >
              Copy
            </Button>
            <Button variant="ghost" onClick={() => setLink(null)}>
              Dismiss
            </Button>
          </div>
        </Panel>
      )}

      {loading ? (
        <Spinner />
      ) : exams.length === 0 ? (
        <Empty
          line="No papers yet. Set questions in the bank first, then group them into an assessment, exam, or staff interview."
          action={<Button onClick={() => setOpen(true)}>Set a paper</Button>}
        />
      ) : (
        <Panel title="Papers">
          <div className="divide-y divide-rule -my-3">
            {exams.map((e) => (
              <Row
                key={e.id}
                left={
                  <>
                    <div className="text-[15px] font-semibold">{e.title}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint mt-0.5">
                      {e.kind} · {e.subject ?? '—'} · {e.duration_minutes ? `${e.duration_minutes} min` : 'untimed'}
                    </div>
                  </>
                }
                right={
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.1em] ${
                        e.status === 'published' ? 'text-present' : e.status === 'closed' ? 'text-ink-faint' : 'text-late'
                      }`}
                    >
                      {e.status}
                    </span>
                    <div className="flex gap-1">
                      {e.status === 'draft' && (
                        <button className="text-[11px] underline" onClick={() => void publish(e.id)}>
                          Publish
                        </button>
                      )}
                      {e.status === 'published' && (
                        <>
                          <button className="text-[11px] underline" onClick={() => void share(e.id, 'student')}>
                            Link
                          </button>
                          {e.kind === 'interview' && (
                            <button className="text-[11px] underline" onClick={() => void share(e.id, 'applicant')}>
                              Interview
                            </button>
                          )}
                          <button className="text-[11px] underline" onClick={() => void closeExam(e.id)}>
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      <SetPaperModal
        open={open}
        onClose={() => setOpen(false)}
        schoolId={profile?.school_id ?? ''}
        classes={classes}
        banks={banks}
        onSaved={() => {
          setOpen(false)
          void load()
        }}
      />
    </AppShell>
  )
}

function SetPaperModal({
  open,
  onClose,
  schoolId,
  classes,
  banks,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  classes: ClassRow[]
  banks: BankRow[]
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [kind, setKind] = useState<ExamKind>('assessment')
  const [classId, setClassId] = useState('')
  const [minutes, setMinutes] = useState('40')
  const [opens, setOpens] = useState('')
  const [closes, setCloses] = useState('')
  const [instructions, setInstructions] = useState('')
  const [bankId, setBankId] = useState(banks[0]?.id ?? '')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [qrows, setQrows] = useState<{ id: string; prompt: string; question_type: string; marks: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bankId) return
    void listQuestions(bankId)
      .then((qs) => setQrows(qs.map((q) => ({ id: q.id, prompt: q.prompt, question_type: q.question_type, marks: q.marks }))))
      .catch((e) => setError((e as Error).message))
  }, [bankId])

  async function save() {
    setError(null)
    if (!title.trim()) return setError('Name the paper.')
    if (picked.size === 0) return setError('Pick at least one question from the bank.')
    setBusy(true)
    try {
      const id = await createExam({
        school_id: schoolId,
        title,
        subject,
        class_id: classId,
        kind,
        duration_minutes: Number(minutes) || undefined,
        instructions,
        opens_at: opens ? new Date(opens).toISOString() : null,
        closes_at: closes ? new Date(closes).toISOString() : null,
      })
      await attachQuestions(id, [...picked])
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Set a paper">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="First term assessment" />
        <Field label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <label className="block">
          <span className="eyebrow block mb-1.5">Kind</span>
          <select
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md"
            value={kind}
            onChange={(e) => setKind(e.target.value as ExamKind)}
          >
            <option value="assessment">Assessment</option>
            <option value="exam">Exam</option>
            <option value="interview">Staff interview CBT</option>
          </select>
        </label>
        <label className="block">
          <span className="eyebrow block mb-1.5">Class</span>
          <select
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Unassigned / interview</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Field label="Duration (minutes)" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        <Field label="Opens" type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} hint="Leave blank to open on publish." />
        <Field label="Closes" type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
        <TextArea label="Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />

        <label className="block">
          <span className="eyebrow block mb-1.5">From bank</span>
          <select
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md"
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <div className="max-h-48 overflow-y-auto border border-rule rounded-md divide-y divide-rule">
          {qrows.map((q) => (
            <label key={q.id} className="flex items-start gap-2 px-3 py-2 text-[13px]">
              <input
                type="checkbox"
                className="mt-1"
                checked={picked.has(q.id)}
                onChange={(e) => {
                  const next = new Set(picked)
                  if (e.target.checked) next.add(q.id)
                  else next.delete(q.id)
                  setPicked(next)
                }}
              />
              <span>
                {q.prompt}
                <span className="block font-mono text-[10px] uppercase text-ink-faint">
                  {q.question_type} · {q.marks}
                </span>
              </span>
            </label>
          ))}
        </div>
        <Button type="submit" full loading={busy}>
          Save as draft
        </Button>
        <p className="text-[12px] text-ink-faint">
          Drafts stay hidden. Publish when you want students — or a share link — to sit it.
        </p>
      </form>
    </Modal>
  )
}
