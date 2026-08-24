import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Panel, Row, TextArea } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  defaultClass,
  listTeachableClasses,
  rememberClass,
  loadLesson,
  recentLessons,
  saveLesson,
  type TeachableClass,
} from '../../lib/attendance'

/* ---------------------------------------------------------------------------
   Lesson and homework entry.

   This form is the product's weakest link: if it takes a teacher more than
   twenty seconds they stop filling it in, and an empty feed means no renewal.
   So: one screen, one required field, last week's subjects one tap away.
--------------------------------------------------------------------------- */

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function Lesson() {
  const { profile, session } = useAuth()
  const [classes, setClasses] = useState<TeachableClass[]>([])
  const [classId, setClassId] = useState('')
  const [date] = useState(todayISO())
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [summary, setSummary] = useState('')
  const [homework, setHomework] = useState('')
  const [due, setDue] = useState('')
  const [recent, setRecent] = useState<Record<string, unknown>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'queued'>('idle')

  useEffect(() => {
    if (!profile || !session) return
    void (async () => {
      const cs = await listTeachableClasses(profile.role, session.user.id)
      setClasses(cs)
      setClassId((c) => c || defaultClass(session.user.id, cs))
    })()
  }, [profile, session])

  const refreshRecent = useCallback(async () => {
    if (!classId) return
    setRecent(await recentLessons(classId))
  }, [classId])

  useEffect(() => {
    void refreshRecent()
  }, [refreshRecent])

  // Editing today's entry for a subject rather than creating a duplicate
  useEffect(() => {
    if (!classId || !subject.trim()) return
    void (async () => {
      const existing = await loadLesson(classId, subject.trim(), date)
      if (existing) {
        setTopic((existing.topic as string) ?? '')
        setSummary((existing.summary as string) ?? '')
        setHomework((existing.homework as string) ?? '')
        setDue((existing.homework_due_date as string) ?? '')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subject, date])

  async function save() {
    setError(null)
    if (!subject.trim()) return setError('Which subject was this?')
    if (!topic.trim()) return setError('Add the topic, even a few words.')

    setState('saving')
    const result = await saveLesson(
      profile?.school_id ?? '',
      classId,
      date,
      session?.user.id ?? '',
      { subject, topic, summary, homework, homework_due_date: due },
    )
    setState(result)
    void refreshRecent()
    window.setTimeout(() => setState('idle'), 2400)
    if (result === 'saved') {
      setTopic('')
      setSummary('')
      setHomework('')
      setDue('')
    }
  }

  const subjectsUsed = Array.from(
    new Set(recent.map((r) => r.subject as string).filter(Boolean)),
  ).slice(0, 6)

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Today</span>
        <h1 className="text-[26px] mt-1">What did you teach?</h1>
      </div>

      {classes.length === 0 ? (
        <Panel>
          <Empty line="You are not assigned to any class yet. Ask your school admin to add you to one." />
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel
            title="Lesson and homework"
            action={
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {state === 'saving' && <span className="text-ink-faint">Saving</span>}
                {state === 'saved' && <span className="text-present">Posted</span>}
                {state === 'queued' && <span className="text-late">Queued offline</span>}
              </span>
            }
          >
            <form
              className="space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              {error && <Alert>{error}</Alert>}

              <label className="block">
                <span className="eyebrow block mb-1.5">Class</span>
                <select
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value)
                    if (session) rememberClass(session.user.id, e.target.value)
                  }}
                  className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md
                             text-[15px] text-ink focus:border-brass"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Subject"
                required
                placeholder="Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              {subjectsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 -mt-1">
                  {subjectsUsed.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSubject(s)}
                      className="h-7 px-2.5 rounded-sm border border-rule-strong bg-surface
                                 text-[12px] text-ink-soft hover:border-brass transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <Field
                label="Topic"
                required
                placeholder="Long division with remainders"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                hint="This is the line parents read. Everything below is optional."
              />

              <TextArea
                label="A little more"
                rows={3}
                placeholder="We worked through examples on the board and the class tried five on their own."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />

              <TextArea
                label="Homework"
                rows={2}
                placeholder="Exercise 4B, questions 1 to 10."
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
              />

              {homework.trim() && (
                <Field
                  label="Due"
                  type="date"
                  value={due}
                  min={date}
                  onChange={(e) => setDue(e.target.value)}
                />
              )}

              <Button type="submit" full loading={state === 'saving'}>
                Post to parents
              </Button>
            </form>
          </Panel>

          <Panel title="Recently posted">
            {recent.length === 0 ? (
              <Empty line="Nothing posted for this class yet." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {recent.map((r) => (
                  <Row
                    key={r.id as string}
                    left={
                      <>
                        <div className="text-[14px] font-semibold">{r.topic as string}</div>
                        <div className="text-[12px] text-ink-faint">
                          {r.subject as string}
                          {r.homework ? ' \u00b7 homework set' : ''}
                        </div>
                      </>
                    }
                    right={
                      <span className="tnum text-[12px] text-ink-faint">{r.date as string}</span>
                    }
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </AppShell>
  )
}
