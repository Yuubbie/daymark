import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PrintChrome } from '../../components/PrintChrome'
import { TermReportCard } from '../../components/TermReport'
import { Alert, Empty, Spinner } from '../../components/ui'
import { getClass, listStudents, type StudentRow } from '../../lib/queries'
import { fetchTermReport, type TermReport } from '../../lib/report'

type Row = { student: StudentRow; report: TermReport | null; error: string | null }

export default function ClassReports() {
  const { id = '' } = useParams()
  const [cls, setCls] = useState<Record<string, unknown> | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDone(0)
    try {
      const [c, students] = await Promise.all([getClass(id), listStudents(id)])
      setCls(c)
      const next: Row[] = []
      for (const s of students) {
        try {
          const report = await fetchTermReport(s.id)
          next.push({ student: s, report, error: null })
        } catch (e) {
          next.push({ student: s, report: null, error: (e as Error).message })
        }
        setDone(next.length)
        setRows([...next])
      }
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
  const printable = rows.filter((r) => r.report)

  return (
    <PrintChrome
      backTo={`/admin/classes/${id}`}
      backLabel="Class"
      title={className || 'Class'}
      sub="Term cards"
      onPrint={printable.length > 0 ? () => window.print() : undefined}
      max="max-w-3xl"
    >
      {error ? (
        <Alert>{error}</Alert>
      ) : loading && rows.length === 0 ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty line="No students in this class yet. Add the roster, then print cards." />
      ) : (
        <>
          <p className="print:hidden mb-4 text-[13px] text-ink-faint">
            One sheet per child. Print hides the chrome. Staff can print even if fees are due.
            {loading ? ` Loading ${done}…` : ''}
          </p>
          <div className="class-reports space-y-8 print:space-y-0">
            {rows.map((r) =>
              r.report ? (
                <TermReportCard key={r.student.id} report={r.report} />
              ) : (
                <article
                  key={r.student.id}
                  className="report-sheet print:hidden bg-surface border border-rule rounded-lg p-5"
                >
                  <div className="text-[16px] font-semibold">
                    {r.student.last_name}, {r.student.first_name}
                  </div>
                  <p className="mt-2 text-[13px] text-ink-faint">{r.error ?? 'No card.'}</p>
                </article>
              ),
            )}
          </div>
        </>
      )}
    </PrintChrome>
  )
}
