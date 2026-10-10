import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { publishedExamsForClass, type ExamRow } from '../../lib/cbt'

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
        if (student.class_id) setExams(await publishedExamsForClass(student.class_id))
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
          Sit tests and exams here when your teacher publishes them. Sign in with the email the school invited.
        </p>
      </div>
      {loading ? (
        <Spinner />
      ) : !profile?.student_id ? (
        <Empty line="This login is not linked to a student yet. Ask the office to invite your email from the class page (Login)." />
      ) : (
        <div className="space-y-4">
          {profile.student_id && (
            <Panel title="This term">
              <Link
                to={`/report/${profile.student_id}`}
                className="font-mono text-[11px] uppercase tracking-[0.1em] underline"
              >
                Open report card
              </Link>
            </Panel>
          )}
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
