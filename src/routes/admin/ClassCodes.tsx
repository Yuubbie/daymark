import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PrintChrome } from '../../components/PrintChrome'
import { ClaimSlip } from '../../components/StudentIdCard'
import { Alert, Button, Empty, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { getClass, listOpenCodes, listStudents, type StudentRow } from '../../lib/queries'

export default function ClassCodes() {
  const { id = '' } = useParams()
  const { school } = useAuth()
  const [cls, setCls] = useState<Record<string, unknown> | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, s] = await Promise.all([getClass(id), listStudents(id)])
      setCls(c)
      setStudents(s)
      setCodes(await listOpenCodes(s.map((x) => x.id)))
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
  const rows = students.filter((s) => codes[s.id])

  function downloadCsv() {
    const header = 'Student,Claim Code\n'
    const body = rows
      .map((s) => `"${`${s.first_name} ${s.last_name}`.replace(/"/g, '""')}",${codes[s.id]}`)
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${className || 'class'}-claim-codes.csv`.replace(/\s+/g, '-').toLowerCase()
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PrintChrome
      backTo={`/admin/classes/${id}`}
      backLabel="Class"
      title={className || 'Class'}
      sub="Parent claim codes"
      onPrint={rows.length > 0 ? () => window.print() : undefined}
      extra={
        rows.length > 0 ? (
          <Button variant="ghost" onClick={downloadCsv}>
            CSV
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <Alert>{error}</Alert>
      ) : rows.length === 0 ? (
        <Empty line="No open claim codes in this class. Generate them on the class page, then print." />
      ) : (
        <>
          <p className="print:hidden mb-4 text-[13px] text-ink-faint">
            One slip per child. Cut, send home. Parent signs up, then enters the code once.
          </p>
          <div className="id-sheet">
            {rows.map((s) => (
              <ClaimSlip
                key={s.id}
                school={schoolName}
                student={`${s.first_name} ${s.last_name}`}
                code={codes[s.id]}
                logoUrl={school?.logo_url}
              />
            ))}
          </div>
        </>
      )}
    </PrintChrome>
  )
}
