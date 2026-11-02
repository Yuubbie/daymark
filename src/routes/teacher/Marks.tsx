import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  defaultClass,
  listTeachableClasses,
  rememberClass,
  type TeachableClass,
} from '../../lib/attendance'
import { listPaperMarks, savePaperMark, type PaperMarkRow } from '../../lib/marks'
import { getCurrentTerm, listStudents, type StudentRow, type TermRow } from '../../lib/queries'

export default function TeacherMarks() {
  const { profile, session } = useAuth()
  const [classes, setClasses] = useState<TeachableClass[]>([])
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState<TermRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [marks, setMarks] = useState<Record<string, PaperMarkRow>>({})
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'exam' | 'assessment'>('exam')
  const [total, setTotal] = useState('100')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile || !session) return
    void (async () => {
      try {
        const [cs, t] = await Promise.all([
          listTeachableClasses(profile.role, session.user.id),
          getCurrentTerm(),
        ])
        setClasses(cs)
        setTerm(t)
        setClassId((c) => c || defaultClass(session.user.id, cs))
        if (cs.length === 0) setLoading(false)
      } catch (e) {
        setError((e as Error).message)
        setLoading(false)
      }
    })()
  }, [profile, session])

  const loadRoster = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    setError(null)
    try {
      setStudents(await listStudents(classId))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [classId])

  const loadMarks = useCallback(async () => {
    if (!classId || !subject.trim() || !title.trim()) {
      setMarks({})
      setDrafts({})
      return
    }
    try {
      const rows = await listPaperMarks(classId, subject.trim(), title.trim())
      const map: Record<string, PaperMarkRow> = {}
      const next: Record<string, string> = {}
      for (const r of rows) {
        map[r.student_id] = r
        next[r.student_id] = r.score == null ? '' : String(r.score)
      }
      setMarks(map)
      setDrafts(next)
      if (rows[0]?.total) setTotal(String(rows[0].total))
      if (rows[0]?.kind === 'assessment' || rows[0]?.kind === 'exam') setKind(rows[0].kind)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [classId, subject, title])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    void loadMarks()
  }, [classId])

  async function save(studentId: string) {
    const subj = subject.trim()
    const paper = title.trim()
    if (!subj || !paper) {
      setError('Name the subject and the paper first.')
      return
    }
    const raw = (drafts[studentId] ?? '').trim()
    const tot = Number(total)
    if (!Number.isFinite(tot) || tot <= 0) {
      setError('Total marks must be greater than zero.')
      return
    }
    setBusyId(studentId)
    setError(null)
    setNotice(null)
    try {
      const score = raw === '' ? null : Number(raw)
      if (score != null && (!Number.isFinite(score) || score < 0 || score > tot)) {
        throw new Error(`Score must sit between 0 and ${tot}.`)
      }
      await savePaperMark({
        studentId,
        subject: subj,
        title: paper,
        kind,
        score,
        total: tot,
      })
      setNotice(score == null ? 'Mark cleared.' : 'Mark saved on the card.')
      await loadMarks()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const cls = classes.find((c) => c.id === classId)
  const filled = students.filter((s) => (drafts[s.id] ?? '').trim() !== '' || marks[s.id]).length
  const statement = cls?.report_kind === 'statement'

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Paper marks</span>
        <h1 className="text-[26px] mt-1">Type a score</h1>
        <p className="mt-2 text-[14px] text-ink-soft max-w-[52ch]">
          For papers sat on paper, not on the portal. Pick the class, name the subject and the
          paper, then type each child’s mark. It prints on the term card. CBT papers stay on CBT.
        </p>
      </div>

      {classes.length === 0 && !loading ? (
        <Panel>
          <Empty line="You are not assigned to any class yet. Ask your school admin to add you to one." />
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                if (session) rememberClass(session.user.id, e.target.value)
              }}
              className="h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]
                         text-ink focus:border-brass"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {statement && (
            <div className="mb-4">
              <Alert>
                {cls?.name} uses a statement card. Write learning goals on{' '}
                <Link to="/teacher/statements" className="underline">
                  Statements
                </Link>
                . Numeric marks are for scored classes.
              </Alert>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          )}
          {notice && !error && (
            <p className="mb-4 text-[13px] text-present font-semibold">{notice}</p>
          )}

          <Panel title={term ? term.name : 'Current term'} className="mb-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="Subject"
                required
                placeholder="Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <Field
                label="Paper"
                required
                placeholder="First term exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <label className="block">
                <span className="eyebrow block mb-1.5">Kind</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'exam' | 'assessment')}
                  className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]
                             text-ink focus:border-brass"
                >
                  <option value="exam">Exam</option>
                  <option value="assessment">Test</option>
                </select>
              </label>
              <Field
                label="Total marks"
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => void loadMarks()}>
                Open this paper
              </Button>
            </div>
          </Panel>

          <Panel title={`${cls?.name ?? ''} · ${filled} of ${students.length} marked`}>
            {loading ? (
              <Spinner />
            ) : students.length === 0 ? (
              <Empty line="No students in this class yet. An admin can add them on the class page." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {students.map((s) => {
                  const saved = marks[s.id]
                  return (
                    <div key={s.id} className="py-3">
                      <Row
                        left={
                          <>
                            <div className="text-[15px]">
                              {s.last_name}, {s.first_name}
                            </div>
                            <div className="text-[12px] text-ink-faint">
                              {saved
                                ? `${saved.score ?? '—'} / ${saved.total ?? total}`
                                : 'No mark yet'}
                            </div>
                          </>
                        }
                        right={
                          <form
                            className="flex items-center gap-2"
                            onSubmit={(e) => {
                              e.preventDefault()
                              void save(s.id)
                            }}
                          >
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.5"
                              className="tnum w-20 h-10 px-2 bg-surface border border-rule-strong rounded-md
                                         text-[15px] text-ink focus:border-brass"
                              placeholder="—"
                              value={drafts[s.id] ?? ''}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                              }
                            />
                            <Button type="submit" loading={busyId === s.id}>
                              Save
                            </Button>
                          </form>
                        }
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </>
      )}
    </AppShell>
  )
}
