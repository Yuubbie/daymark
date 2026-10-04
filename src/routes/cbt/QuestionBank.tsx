import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Row, Spinner, TextArea } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listClasses, type ClassRow } from '../../lib/queries'
import {
  createBank,
  insertQuestion,
  listBanks,
  listQuestions,
  type BankRow,
  type QuestionRow,
} from '../../lib/cbt'
import type { QuestionType } from '../../lib/types'

const TYPES: { key: QuestionType; label: string }[] = [
  { key: 'objective', label: 'Objective' },
  { key: 'multiple_select', label: 'Multiple select' },
  { key: 'subjective', label: 'Subjective' },
  { key: 'comprehension', label: 'Comprehension' },
]

export default function QuestionBank() {
  const { profile } = useAuth()
  const [banks, setBanks] = useState<BankRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [bankId, setBankId] = useState<string>('')
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openBank, setOpenBank] = useState(false)
  const [openQ, setOpenQ] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [b, c] = await Promise.all([listBanks(), listClasses()])
      setBanks(b)
      setClasses(c)
      const next = bankId && b.some((x) => x.id === bankId) ? bankId : (b[0]?.id ?? '')
      setBankId(next)
      if (next) setQuestions(await listQuestions(next))
      else setQuestions([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!bankId) return
    void listQuestions(bankId).then(setQuestions).catch((e) => setError((e as Error).message))
  }, [bankId])

  const current = banks.find((b) => b.id === bankId)

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Question bank</span>
          <h1 className="text-[26px] mt-1">Build once. Reuse.</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpenBank(true)}>
            New bank
          </Button>
          <Button onClick={() => setOpenQ(true)} disabled={!bankId}>
            Add question
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : banks.length === 0 ? (
        <Empty
          line="No banks yet. Create one for a subject, then add objective, multiple-select, subjective, or comprehension questions."
          action={<Button onClick={() => setOpenBank(true)}>Create a bank</Button>}
        />
      ) : (
        <div className="space-y-4">
          <Panel title="Banks">
            <select
              className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {b.subject}
                </option>
              ))}
            </select>
            {current?.description && (
              <p className="mt-3 text-[13px] text-ink-soft">{current.description}</p>
            )}
          </Panel>

          <Panel title={`${questions.length} question${questions.length === 1 ? '' : 's'}`}>
            {questions.length === 0 ? (
              <Empty line="This bank is empty. Add questions now; students cannot see them until you publish an exam." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {questions.map((q) => (
                  <Row
                    key={q.id}
                    left={
                      <>
                        <div className="text-[14px] font-semibold line-clamp-2">{q.prompt}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint mt-1">
                          {q.question_type.replace('_', ' ')} · {q.marks} mark{q.marks === 1 ? '' : 's'}
                        </div>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      <BankModal
        open={openBank}
        onClose={() => setOpenBank(false)}
        classes={classes}
        schoolId={profile?.school_id ?? ''}
        onSaved={async (id) => {
          setOpenBank(false)
          await load()
          setBankId(id)
        }}
      />
      <QuestionModal
        open={openQ}
        onClose={() => setOpenQ(false)}
        schoolId={profile?.school_id ?? ''}
        bankId={bankId}
        onSaved={async () => {
          setOpenQ(false)
          if (bankId) setQuestions(await listQuestions(bankId))
        }}
      />
    </AppShell>
  )
}

function BankModal({
  open,
  onClose,
  classes,
  schoolId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  classes: ClassRow[]
  schoolId: string
  onSaved: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [classId, setClassId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    setBusy(true)
    try {
      const id = await createBank(schoolId, title, subject, classId)
      setTitle('')
      setSubject('')
      onSaved(id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New question bank">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Basic Science bank" />
        <Field label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Basic Science" />
        <label className="block">
          <span className="eyebrow block mb-1.5">Class (optional)</span>
          <select
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Any class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" full loading={busy}>
          Create bank
        </Button>
      </form>
    </Modal>
  )
}

function QuestionModal({
  open,
  onClose,
  schoolId,
  bankId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  bankId: string
  onSaved: () => void
}) {
  const [type, setType] = useState<QuestionType>('objective')
  const [prompt, setPrompt] = useState('')
  const [passage, setPassage] = useState('')
  const [opts, setOpts] = useState(['', '', '', ''])
  const [correct, setCorrect] = useState('a')
  const [multi, setMulti] = useState<string[]>([])
  const [marks, setMarks] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const letters = ['a', 'b', 'c', 'd']

  async function save() {
    setError(null)
    const options = opts
      .map((t, i) => ({ id: letters[i], text: t.trim() }))
      .filter((o) => o.text)
    if (!prompt.trim()) return setError('Write the question.')
    if ((type === 'objective' || type === 'multiple_select') && options.length < 2) {
      return setError('Give at least two options.')
    }
    setBusy(true)
    try {
      let answer_key: Record<string, unknown> | null = null
      if (type === 'objective') answer_key = { correct }
      if (type === 'multiple_select') answer_key = { correct: multi }
      if (type === 'comprehension') {
        answer_key = {
          children: [
            {
              id: 'c1',
              prompt: prompt.trim(),
              options,
              correct,
              marks: Number(marks) || 1,
            },
          ],
        }
      }
      await insertQuestion({
        school_id: schoolId,
        bank_id: bankId,
        question_type: type,
        prompt: type === 'comprehension' ? 'Read the passage and answer.' : prompt.trim(),
        passage: type === 'comprehension' ? passage.trim() : null,
        options: type === 'subjective' ? [] : options,
        answer_key,
        marks: Number(marks) || 1,
      })
      setPrompt('')
      setPassage('')
      setOpts(['', '', '', ''])
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a question">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`h-8 px-3 rounded-sm text-[11px] font-mono uppercase tracking-[0.1em] border ${
                type === t.key ? 'bg-ink text-ink-invert border-ink' : 'border-rule-strong text-ink-soft'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {type === 'comprehension' && (
          <TextArea label="Passage" required value={passage} onChange={(e) => setPassage(e.target.value)} />
        )}
        <TextArea
          label={type === 'comprehension' ? 'First sub-question' : 'Question'}
          required
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        {type !== 'subjective' && (
          <div className="space-y-2">
            {letters.map((l, i) => (
              <Field
                key={l}
                label={`Option ${l.toUpperCase()}`}
                value={opts[i]}
                onChange={(e) => {
                  const next = [...opts]
                  next[i] = e.target.value
                  setOpts(next)
                }}
              />
            ))}
          </div>
        )}
        {type === 'objective' || type === 'comprehension' ? (
          <label className="block">
            <span className="eyebrow block mb-1.5">Correct option</span>
            <select
              className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md"
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            >
              {letters.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {type === 'multiple_select' && (
          <div>
            <span className="eyebrow block mb-1.5">Correct options</span>
            <div className="flex gap-2">
              {letters.map((l) => (
                <label key={l} className="flex items-center gap-1.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={multi.includes(l)}
                    onChange={(e) =>
                      setMulti(e.target.checked ? [...multi, l] : multi.filter((x) => x !== l))
                    }
                  />
                  {l.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
        )}
        <Field label="Marks" type="number" min={0.5} step={0.5} value={marks} onChange={(e) => setMarks(e.target.value)} />
        <Button type="submit" full loading={busy}>
          Save to bank
        </Button>
        <p className="text-[12px] text-ink-faint">
          Students cannot see bank questions until you publish them in an exam.
        </p>
      </form>
    </Modal>
  )
}
