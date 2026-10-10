import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { TermReportCard } from '../../components/TermReport'
import { Alert, Button, Empty, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { fetchTermReport, type TermReport } from '../../lib/report'

export default function TermReportPage() {
  const { studentId = '' } = useParams()
  const { profile } = useAuth()
  const [report, setReport] = useState<TermReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchTermReport(studentId)
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  const locked = /fees are outstanding/i.test(error ?? '')

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3 print:hidden">
        <div>
          <span className="eyebrow">Report card</span>
          <h1 className="text-[26px] mt-1">This term</h1>
        </div>
        {report && (
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        locked ? (
          <Empty
            line="Fees are outstanding. Results stay locked until the school marks this child as cleared."
            action={
              profile?.role === 'parent' ? (
                <Link to="/parent/fees">
                  <Button>Fee statement</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Alert>{error}</Alert>
        )
      ) : report ? (
        <TermReportCard report={report} />
      ) : (
        <Empty line="No report to show." />
      )}
    </AppShell>
  )
}
