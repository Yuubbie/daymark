import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PrintChrome } from '../../components/PrintChrome'
import { StudentIdCard } from '../../components/StudentIdCard'
import { Alert, Empty, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { getClass, getCurrentTerm, listStudents, type StudentRow, type TermRow } from '../../lib/queries'

export default function ClassIds() {
  const { id = '' } = useParams()
  const { school } = useAuth()
  const [cls, setCls] = useState<Record<string, unknown> | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [term, setTerm] = useState<TermRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, s, t] = await Promise.all([getClass(id), listStudents(id), getCurrentTerm()])
      setCls(c)
      setStudents(s)
      setTerm(t)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const className = (cls?.name as string) ?? ''
  const schoolName = school?.name ?? ''

  return (
    <PrintChrome
      backTo={`/admin/classes/${id}`}
      backLabel="Class"
      title={className || 'Class'}
      sub="Student identity cards"
      onPrint={students.length > 0 ? () => window.print() : undefined}
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : students.length === 0 ? (
        <Empty line="No students in this class yet. Add the roster, then print cards." />
      ) : (
        <>
          <p className="print:hidden mb-4 text-[13px] text-ink-faint">
            Credit-card size. Eight fit on A4. Cut on the crop, then laminate. A missing photo is a
            blank square, not a blocked print.
          </p>
          <div className="id-sheet">
            {students.map((s) => (
              <StudentIdCard
                key={s.id}
                school={schoolName}
                className={className}
                student={s}
                term={term?.name}
              />
            ))}
          </div>
        </>
      )}
    </PrintChrome>
  )
}
