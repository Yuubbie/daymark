import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Empty, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { publishedExamsForClass, type ExamRow } from '../../lib/cbt'

export default function StudentHome() {
  const { profile, school } = useAuth()
  const [exams, setExams] = useState<ExamRow[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      if (!profile?.student_id) {
        setLoading(false)
        return
      }
      const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name, class_id')
        .eq('id', profile.student_id)
        .maybeSingle()
      if (student) {
        setName(`${student.first_name} ${student.last_name}`)
        if (student.class_id) setExams(await publishedExamsForClass(student.class_id))
      }
      setLoading(false)
    })()
  }, [profile?.student_id])

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">{school?.name}</span>
        <h1 className="text-[26px] mt-1">{name || 'Your desk'}</h1>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <Panel title="Open papers">
          {exams.length === 0 ? (
            <Empty line="No published assessments for your class yet. Your teacher will release them when they are ready." />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {exams.map((e) => (
                <Row
                  key={e.id}
                  left={
                    <>
                      <div className="text-[15px] font-semibold">{e.title}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                        {e.subject ?? e.kind} · {e.duration_minutes ? `${e.duration_minutes} min` : 'untimed'}
                      </div>
                    </>
                  }
                  right={
                    <Link to={`/student/sit/${e.id}`} className="text-[12px] underline">
                      Sit
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
