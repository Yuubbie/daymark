import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Panel, Row, Spinner, TextArea } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  defaultClass,
  listTeachableClasses,
  rememberClass,
  type TeachableClass,
} from '../../lib/attendance'
import {
  STATEMENT_LEVELS,
  listReportStatements,
  listStatementGoals,
  saveReportStatement,
  type StatementGoal,
  type StatementLevel,
} from '../../lib/marks'
import { getCurrentTerm, listStudents, type StudentRow, type TermRow } from '../../lib/queries'

type Draft = { comment: string; level: StatementLevel | null }

function keyOf(area: string, goal: string) {
  return `${area}::${goal}`
}

function groupGoals(goals: StatementGoal[]) {
  const order: string[] = []
  const map = new Map<string, StatementGoal[]>()
  for (const g of goals) {
    if (!map.has(g.area)) {
      order.push(g.area)
      map.set(g.area, [])
    }
    map.get(g.area)!.push(g)
  }
  return order.map((area) => ({ area, goals: map.get(area)! }))
}

export default function TeacherStatements() {
  const { profile, session } = useAuth()
  const [classes, setClasses] = useState<TeachableClass[]>([])
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState<TermRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [studentId, setStudentId] = useState('')
  const [goals, setGoals] = useState<StatementGoal[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile || !session) return
    void (async () => {
      try {
        const [cs, t, g] = await Promise.all([
          listTeachableClasses(profile.role, session.user.id),
          getCurrentTerm(),
          listStatementGoals(),
        ])
        setClasses(cs)
        setTerm(t)
        setGoals(g)
        const first = defaultClass(session.user.id, cs)
        setClassId((c) => c || first)
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
      const roster = await listStudents(classId)
      setStudents(roster)
      setStudentId((id) => (roster.some((s) => s.id === id) ? id : roster[0]?.id ?? ''))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  const loadStatements = useCallback(async () => {
    if (!studentId) {
      setDrafts({})
      return
    }
    setError(null)
    try {
      const rows = await listReportStatements(studentId)
      const map: Record<string, Draft> = {}
      for (const r of rows) {
        map[keyOf(r.area, r.goal)] = { comment: r.comment ?? '', level: r.level }
      }
      setDrafts(map)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [studentId])

  useEffect(() => {
    void loadStatements()
  }, [loadStatements])

  async function save(goal: StatementGoal) {
    if (!studentId) return
    const k = keyOf(goal.area, goal.goal)
    const d = drafts[k] ?? { comment: '', level: null }
    setBusyKey(k)
    setError(null)
    setNotice(null)
    try {
      await saveReportStatement({
        studentId,
        area: goal.area,
        goal: goal.goal,
        comment: d.comment.trim() || null,
        level: d.level,
        position: goal.position,
      })
      setNotice('Saved on the card.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyKey(null)
    }
  }

  const cls = classes.find((c) => c.id === classId)
  const child = students.find((s) => s.id === studentId)
  const areas = groupGoals(goals)
  const written = goals.filter((g) => {
    const d = drafts[keyOf(g.area, g.goal)]
    return d && (d.level || d.comment.trim())
  }).length

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Statements</span>
        <h1 className="text-[26px] mt-1">Nursery and EYFS</h1>
        <p className="mt-2 text-[14px] text-ink-soft max-w-[52ch]">
          Qualitative card. A comment and Emerging / Expected / Exceeding on each learning goal.
          No scores, no averages. The child still has a login; they do not sit a paper on the
          portal.
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
                  {c.report_kind === 'statement' ? ' · statement' : ''}
                </option>
              ))}
            </select>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]
                         text-ink focus:border-brass"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name}
                </option>
              ))}
            </select>
          </div>

          {cls && cls.report_kind !== 'statement' && (
            <div className="mb-4">
              <Alert>
                {cls.name} is set to scored reports. Ask the office to switch the class to a
                statement card on Classes, or type numeric marks on{' '}
                <Link to="/teacher/marks" className="underline">
                  Paper marks
                </Link>
                .
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

          {loading ? (
            <Spinner />
          ) : !child ? (
            <Panel>
              <Empty line="No students in this class yet." />
            </Panel>
          ) : (
            <Panel
              title={`${child.first_name} ${child.last_name} · ${written} of ${goals.length} · ${term?.name ?? 'this term'}`}
              action={
                <Link
                  to={`/report/${child.id}`}
                  className="font-mono text-[11px] uppercase tracking-[0.1em] underline"
                >
                  Card
                </Link>
              }
            >
              {areas.length === 0 ? (
                <Empty line="No learning goals yet. They seed the first time a teacher opens this desk." />
              ) : (
                <div className="space-y-6">
                  {areas.map((a) => (
                    <section key={a.area}>
                      <div className="eyebrow mb-2">{a.area}</div>
                      <div className="divide-y divide-rule border-t border-rule">
                        {a.goals.map((g) => {
                          const k = keyOf(g.area, g.goal)
                          const d = drafts[k] ?? { comment: '', level: null }
                          return (
                            <form
                              key={k}
                              className="py-3 space-y-3"
                              onSubmit={(e) => {
                                e.preventDefault()
                                void save(g)
                              }}
                            >
                              <Row
                                left={<div className="text-[15px] font-semibold">{g.goal}</div>}
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {STATEMENT_LEVELS.map((lv) => {
                                  const on = d.level === lv.key
                                  return (
                                    <button
                                      key={lv.key}
                                      type="button"
                                      onClick={() =>
                                        setDrafts((prev) => ({
                                          ...prev,
                                          [k]: {
                                            ...d,
                                            level: on ? null : lv.key,
                                          },
                                        }))
                                      }
                                      className={`h-8 px-3 rounded-sm border font-mono text-[10px] uppercase tracking-[0.1em] ${
                                        on
                                          ? 'border-brass bg-brass-wash text-ink'
                                          : 'border-rule text-ink-faint hover:border-rule-strong'
                                      }`}
                                    >
                                      {lv.short} {lv.label}
                                    </button>
                                  )
                                })}
                              </div>
                              <TextArea
                                label="Comment"
                                value={d.comment}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [k]: { ...d, comment: e.target.value },
                                  }))
                                }
                                placeholder="What this child can do."
                              />
                              <Button type="submit" loading={busyKey === k}>
                                Save goal
                              </Button>
                            </form>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </Panel>
          )}
        </>
      )}
    </AppShell>
  )
}
