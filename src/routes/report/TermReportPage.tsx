import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { TermReportCard } from '../../components/TermReport'
import { Alert, Button, Empty, Panel, Spinner, TextArea } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { saveReportComment } from '../../lib/office'
import { fetchTermReport, type TermReport } from '../../lib/report'
import { isStaffRole } from '../../lib/types'

export default function TermReportPage() {
  const { studentId = '' } = useParams()
  const { profile } = useAuth()
  const staff = isStaffRole(profile?.role)
  const [report, setReport] = useState<TermReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [classComment, setClassComment] = useState('')
  const [principalComment, setPrincipalComment] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [commentNotice, setCommentNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchTermReport(studentId)
      .then((r) => {
        if (!cancelled) {
          setReport(r)
          setClassComment(r.comments?.class_teacher ?? '')
          setPrincipalComment(r.comments?.principal ?? '')
        }
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
        <div className="flex items-center gap-2 shrink-0">
          {profile?.role === 'admin' || profile?.role === 'proprietor' ? (
            report?.class?.id ? (
              <Link to={`/admin/classes/${report.class.id}`}>
                <Button variant="ghost">Class</Button>
              </Link>
            ) : (
              <Link to="/admin/classes">
                <Button variant="ghost">Classes</Button>
              </Link>
            )
          ) : null}
          {report && (
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          )}
        </div>
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
        <>
          <TermReportCard report={report} />
          {staff && (
            <div className="mt-4 print:hidden">
              <Panel title="Teacher comments">
                <form
                  className="space-y-3.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setCommentBusy(true)
                    setCommentNotice(null)
                    void saveReportComment(studentId, classComment, principalComment)
                      .then(async () => {
                        const next = await fetchTermReport(studentId)
                        setReport(next)
                        setCommentNotice('Comments saved on the card.')
                      })
                      .catch((e) => setError((e as Error).message))
                      .finally(() => setCommentBusy(false))
                  }}
                >
                  <TextArea
                    label="Class teacher"
                    value={classComment}
                    onChange={(e) => setClassComment(e.target.value)}
                    placeholder="A short note on the term."
                  />
                  {(profile?.role === 'admin' || profile?.role === 'proprietor') && (
                    <TextArea
                      label="Principal"
                      value={principalComment}
                      onChange={(e) => setPrincipalComment(e.target.value)}
                      placeholder="Head of school remark."
                    />
                  )}
                  {commentNotice && (
                    <p className="text-[13px] text-present font-semibold">{commentNotice}</p>
                  )}
                  <Button type="submit" loading={commentBusy}>
                    Save comments
                  </Button>
                </form>
              </Panel>
            </div>
          )}
        </>
      ) : (
        <Empty line="No report to show." />
      )}
    </AppShell>
  )
}
