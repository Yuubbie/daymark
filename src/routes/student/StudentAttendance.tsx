import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { AttendanceSummary, RegisterLegend } from '../../components/RegisterStrip'
import { Empty, Panel, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { attendancePct, childRegister, currentTerm, type TermBounds } from '../../lib/parent'
import type { AttendanceMark } from '../../lib/types'

export default function StudentAttendance() {
  const { profile, school } = useAuth()
  const [term, setTerm] = useState<TermBounds>(null)
  const [marks, setMarks] = useState<AttendanceMark[]>([])
  const [className, setClassName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const studentId = profile?.student_id
      if (!studentId) {
        setLoading(false)
        return
      }
      try {
        const [t, student] = await Promise.all([
          currentTerm(),
          supabase
            .from('students')
            .select('classes(name)')
            .eq('id', studentId)
            .maybeSingle(),
        ])
        setTerm(t)
        setMarks(await childRegister(studentId, t))
        const cls = student.data?.classes as { name?: string } | { name?: string }[] | null
        const nm = Array.isArray(cls) ? cls[0]?.name : cls?.name
        if (nm) setClassName(nm)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    })()
  }, [profile?.student_id])

  const pct = attendancePct(marks)

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">
          {school?.name}
          {className ? ` · ${className}` : ''}
        </span>
        <h1 className="text-[26px] mt-1">Attendance</h1>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <Empty line={error} />
      ) : !profile?.student_id ? (
        <Empty line="This login is not linked to a student yet. Ask the office to invite your email." />
      ) : (
        <Panel title={term ? term.name : 'Attendance so far'}>
          {marks.length === 0 ? (
            <Empty line="No register marks yet this term." />
          ) : (
            <AttendanceSummary pct={pct} marks={marks} caption={term?.name} />
          )}
          <div className="mt-4 pt-4 border-t border-rule">
            <RegisterLegend />
          </div>
        </Panel>
      )}
    </AppShell>
  )
}
