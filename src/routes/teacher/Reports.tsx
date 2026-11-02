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
import { saveReportComment } from '../../lib/office'
import { getCurrentTerm, listStudents, type StudentRow, type TermRow } from '../../lib/queries'
import { supabase } from '../../lib/supabase'

type CommentRow = {
  student_id: string
  class_teacher_comment: string | null
  principal_comment: string | null
}

export default function TeacherReports() {
  const { profile, session } = useAuth()
  const [classes, setClasses] = useState<TeachableClass[]>([])
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState<TermRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [principal, setPrincipal] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
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

  const load = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const roster = await listStudents(classId)
      setStudents(roster)
      const ids = roster.map((s) => s.id)
      const map: Record<string, string> = {}
      if (ids.length > 0) {
        let q = supabase
          .from('report_comments')
          .select('student_id, class_teacher_comment, principal_comment')
          .in('student_id', ids)
        q = term ? q.eq('term_id', term.id) : q.is('term_id', null)
        const { data, error: qErr } = await q
        if (qErr) throw qErr
        const heads: Record<string, string> = {}
        for (const r of (data ?? []) as CommentRow[]) {
          map[r.student_id] = r.class_teacher_comment ?? ''
          heads[r.student_id] = r.principal_comment ?? ''
        }
        setPrincipal(heads)
      }
      setSaved(map)
      setDrafts(map)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [classId, term])

  useEffect(() => {
    void load()
  }, [load])

  async function save(studentId: string) {
    setBusyId(studentId)
    setError(null)
    setNotice(null)
    try {
      await saveReportComment(studentId, drafts[studentId] ?? '', principal[studentId] ?? '')
      setSaved((s) => ({ ...s, [studentId]: drafts[studentId] ?? '' }))
      setNotice('Comment saved on the card.')
      setOpenId(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const cls = classes.find((c) => c.id === classId)
  const written = students.filter((s) => (saved[s.id] ?? '').trim()).length

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Reports</span>
        <h1 className="text-[26px] mt-1">Class teacher remarks</h1>
        <p className="mt-2 text-[14px] text-ink-soft max-w-[52ch]">
          One note per child for {term?.name ?? 'this term'}. It prints on the card. Principal
          remarks stay with the office.
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
                setOpenId(null)
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

          {error && (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          )}
          {notice && !error && (
            <p className="mb-4 text-[13px] text-present font-semibold">{notice}</p>
          )}

          <Panel title={`${cls?.name ?? ''} · ${written} of ${students.length} remarked`}>
            {loading ? (
              <Spinner />
            ) : students.length === 0 ? (
              <Empty line="No students in this class yet. An admin can add them on the class page." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {students.map((s) => {
                  const text = drafts[s.id] ?? ''
                  const has = Boolean((saved[s.id] ?? '').trim())
                  const open = openId === s.id
                  return (
                    <div key={s.id} className="py-3">
                      <Row
                        left={
                          <>
                            <div className="text-[15px]">
                              {s.last_name}, {s.first_name}
                            </div>
                            <div className="text-[12px] text-ink-faint">
                              {has ? 'Remark on the card' : 'No remark yet'}
                            </div>
                          </>
                        }
                        right={
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/report/${s.id}`}
                              className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
                            >
                              Card
                            </Link>
                            <button
                              type="button"
                              onClick={() => setOpenId(open ? null : s.id)}
                              className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink hover:text-brass"
                            >
                              {open ? 'Close' : has ? 'Edit' : 'Remark'}
                            </button>
                          </div>
                        }
                      />
                      {open && (
                        <form
                          className="mt-3 space-y-3"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void save(s.id)
                          }}
                        >
                          <TextArea
                            label="Class teacher"
                            value={text}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [s.id]: e.target.value }))
                            }
                            placeholder="A short note on the term."
                          />
                          <Button type="submit" loading={busyId === s.id}>
                            Save remark
                          </Button>
                        </form>
                      )}
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
