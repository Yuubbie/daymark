import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Row, Spinner } from '../../components/ui'
import { LessonEntry } from '../parent/Home'
import { useAuth } from '../../lib/auth'
import { publishedExamsForClass, submittedExamIdsForStudent, type ExamRow } from '../../lib/cbt'
import { openHomework, type LessonRow } from '../../lib/parent'
import { supabase } from '../../lib/supabase'

type Kind = 'assignment' | 'test' | 'exam'

function kindLabel(kind: string) {
  if (kind === 'exam') return 'Exam'
  if (kind === 'interview') return 'Interview'
  return 'Test'
}

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function StudentWork({ kind }: { kind: Kind }) {
  const { profile, school } = useAuth()
  const [classId, setClassId] = useState<string | null>(null)
  const [className, setClassName] = useState('')
  const [homework, setHomework] = useState<LessonRow[]>([])
  const [exams, setExams] = useState<ExamRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      if (!profile?.student_id) {
        setLoading(false)
        return
      }
      const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name, class_id, classes(name)')
        .eq('id', profile.student_id)
        .maybeSingle()
      if (student) {
        const cls = student.classes as { name?: string } | { name?: string }[] | null
        const nm = Array.isArray(cls) ? cls[0]?.name : cls?.name
        if (nm) setClassName(nm)
        if (student.class_id) {
          setClassId(student.class_id)
          if (kind === 'assignment') {
            setHomework(await openHomework(student.class_id))
          } else {
            const [open, sat] = await Promise.all([
              publishedExamsForClass(student.class_id),
              submittedExamIdsForStudent(profile.student_id),
            ])
            const done = new Set(sat)
            setExams(open.filter((e) => !done.has(e.id)))
          }
        }
      }
      setLoading(false)
    })()
  }, [profile?.student_id, kind])

  const today = todayISO()
  const due = homework.filter((r) => !r.homework_due_date || r.homework_due_date >= today)
  const past = homework.filter((r) => r.homework_due_date && r.homework_due_date < today)
  const tests = exams.filter((e) => e.kind !== 'exam')
  const papers = exams.filter((e) => e.kind === 'exam')
  const rows = kind === 'exam' ? papers : tests

  const title =
    kind === 'assignment' ? 'Assignments' : kind === 'exam' ? 'Exams' : 'Tests'
  const kicker = school?.name ? `${school.name}${className ? ` · ${className}` : ''}` : className

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">{kicker || 'Your desk'}</span>
        <h1 className="text-[26px] mt-1">{title}</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          {kind === 'assignment'
            ? 'Homework your teachers posted. Due dates sit on the assignment.'
            : kind === 'exam'
              ? 'Sit an exam when your teacher publishes it. One attempt.'
              : 'Sit a test when your teacher publishes it. One attempt.'}
        </p>
      </div>
      {loading ? (
        <Spinner />
      ) : !profile?.student_id ? (
        <Empty line="This login is not linked to a student yet. Ask the office to invite your email from the class page (Login)." />
      ) : !classId ? (
        <Empty line="You are not in a class yet. Ask the office to place you." />
      ) : kind === 'assignment' ? (
        <div className="space-y-4">
          <Panel title={due.length === 0 ? 'Nothing due' : `${due.length} due`}>
            {due.length === 0 ? (
              <Empty line="Nothing outstanding. New homework shows here as teachers set it." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {due.map((l) => (
                  <LessonEntry key={l.id} lesson={l} showDate />
                ))}
              </div>
            )}
          </Panel>
          {past.length > 0 && (
            <Panel title={`Earlier, ${past.length}`}>
              <div className="divide-y divide-rule -my-3">
                {past.map((l) => (
                  <LessonEntry key={l.id} lesson={l} showDate />
                ))}
              </div>
            </Panel>
          )}
        </div>
      ) : (
        <Panel title={title}>
          {rows.length === 0 ? (
            <Empty
              line={
                kind === 'exam'
                  ? 'No exams are open for your class yet.'
                  : 'No tests are open for your class yet.'
              }
            />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {rows.map((e) => (
                <Row
                  key={e.id}
                  left={
                    <>
                      <div className="text-[15px] font-semibold">{e.title}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        {kindLabel(e.kind)}
                        {e.subject ? ` · ${e.subject}` : ''}
                        {e.duration_minutes ? ` · ${e.duration_minutes} min` : ''}
                      </div>
                    </>
                  }
                  right={
                    <Link
                      to={`/student/sit/${e.id}`}
                      className="font-mono text-[11px] uppercase tracking-[0.1em] underline"
                    >
                      Start {e.kind === 'exam' ? 'exam' : 'test'}
                    </Link>
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      )}
    </AppShell>
  )
}
