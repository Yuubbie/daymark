import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StudentIdCard } from '../../components/StudentIdCard'
import { Wordmark } from '../../components/Logo'
import { Alert, Button, Empty, Spinner } from '../../components/ui'
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
    <div className="min-h-dvh bg-paper">
      <header className="print:hidden border-b border-rule bg-surface">
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center gap-3">
          <Link to={`/admin/classes/${id}`} aria-label="Back to class">
            <Wordmark size="sm" />
          </Link>
          <span className="h-5 w-px bg-rule shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold truncate">{className || 'Class'}</div>
            <div className="eyebrow">Identity cards</div>
          </div>
          {students.length > 0 && (
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
        {loading ? (
          <Spinner />
        ) : error ? (
          <Alert>{error}</Alert>
        ) : students.length === 0 ? (
          <Empty line="No students in this class yet. Add the roster, then print cards." />
        ) : (
          <>
            <p className="print:hidden mb-4 text-[13px] text-ink-faint">
              One card per child on the roster. Print, cut, laminate. Photos come from the class
              page. Missing photo is a blank square, not a blocked print.
            </p>
            <div className="id-sheet grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-[6mm]">
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
      </main>
    </div>
  )
}
