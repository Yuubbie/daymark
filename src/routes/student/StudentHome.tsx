import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { publishedExamsForClass, submittedExamIdsForStudent, type ExamRow } from '../../lib/cbt'

function kindLabel(kind: string) {
  if (kind === 'exam') return 'Exam'
  if (kind === 'interview') return 'Interview'
  return 'Test'
}

export default function StudentHome() {
  const { profile, school } = useAuth()
  const [exams, setExams] = useState<ExamRow[]>([])
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
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
        setName(`${student.first_name} ${student.last_name}`)
        const cls = student.classes as { name?: string } | { name?: string }[] | null
        const nm = Array.isArray(cls) ? cls[0]?.name : cls?.name
        if (nm) setClassName(nm)
        if (student.class_id) {
          const [open, sat] = await Promise.all([
            publishedExamsForClass(student.class_id),
            submittedExamIdsForStudent(profile.student_id),
          ])
          const done = new Set(sat)
          setExams(open.filter((e) => !done.has(e.id)))
        }
      }
      setLoading(false)
    })()
  }, [profile?.student_id])

  const tests = exams.filter((e) => e.kind !== 'exam')
  const papers = exams.filter((e) => e.kind === 'exam')

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">{school?.name}{className ? ` · ${className}` : ''}</span>
        <h1 className="text-[26px] mt-1">{name || 'Your desk'}</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          Assignments, tests and exams. Sit a paper when your teacher publishes it.
        </p>
      </div>
      {loading ? (
        <Spinner />
      ) : !profile?.student_id ? (
        <Empty line="This login is not linked to a student yet. Ask the office to invite your email from the class page (Login)." />
      ) : (
        <div className="space-y-4">
          <Panel title="Your work">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/student/assignments"
                className="border border-rule rounded-md px-3 py-3 hover:border-brass transition-colors"
              >
                <div className="eyebrow">Due</div>
                <div className="text-[14px] font-semibold mt-1">Assignments</div>
              </Link>
              <Link
                to="/student/tests"
                className="border border-rule rounded-md px-3 py-3 hover:border-brass transition-colors"
              >
                <div className="eyebrow">{tests.length ? `${tests.length} open` : 'Sit'}</div>
                <div className="text-[14px] font-semibold mt-1">Tests</div>
              </Link>
              <Link
                to="/student/exams"
                className="border border-rule rounded-md px-3 py-3 hover:border-brass transition-colors"
              >
                <div className="eyebrow">{papers.length ? `${papers.length} open` : 'Sit'}</div>
                <div className="text-[14px] font-semibold mt-1">Exams</div>
              </Link>
              <Link
                to={`/report/${profile.student_id}`}
                className="border border-rule rounded-md px-3 py-3 hover:border-brass transition-colors"
              >
                <div className="eyebrow">This term</div>
                <div className="text-[14px] font-semibold mt-1">Report card</div>
              </Link>
              <Link
                to="/student/results"
                className="border border-rule rounded-md px-3 py-3 hover:border-brass transition-colors"
              >
                <div className="eyebrow">Approved</div>
                <div className="text-[14px] font-semibold mt-1">Results</div>
              </Link>
              <Link
                to="/student/attendance"
                className="border border-rule rounded-md px-3 py-3 hover:border-brass transition-colors"
              >
                <div className="eyebrow">Register</div>
                <div className="text-[14px] font-semibold mt-1">Attendance</div>
              </Link>
              <Link
                to="/student/notices"
                className="border border-rule rounded-md px-3 py-3 hover:border-brass transition-colors"
              >
                <div className="eyebrow">From the office</div>
                <div className="text-[14px] font-semibold mt-1">Notices</div>
              </Link>
            </div>
          </Panel>
          <PaperList title="Tests" empty="No tests are open for your class yet" rows={tests} />
          <PaperList title="Exams" empty="No exams are open for your class yet" rows={papers} />
        </div>
      )}
    </AppShell>
  )
}

function PaperList({
  title,
  empty,
  rows,
}: {
  title: string
  empty: string
  rows: ExamRow[]
}) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <Empty line={empty} />
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
  )
}
