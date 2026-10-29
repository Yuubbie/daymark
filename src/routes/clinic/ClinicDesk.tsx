import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Panel, Row, Spinner, TextArea } from '../../components/ui'
import { listClinicVisits, recordClinicVisit, type ClinicVisit } from '../../lib/office'
import { listClasses, listStudents, type ClassRow, type StudentRow } from '../../lib/queries'

function fmtWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ClinicDesk() {
  const [visits, setVisits] = useState<ClinicVisit[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [complaint, setComplaint] = useState('')
  const [treatment, setTreatment] = useState('')
  const [sentHome, setSentHome] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [v, cs] = await Promise.all([listClinicVisits(), listClasses()])
      setVisits(v)
      setClasses(cs)
      if (!classId && cs[0]) setClassId(cs[0].id)
    } catch (e) {
      const msg = (e as Error).message
      setError(
        /could not find the function|schema cache/i.test(msg)
          ? 'Paste APPLY_RUN21.sql in the SQL Editor, then hard-refresh.'
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!classId) {
      setStudents([])
      setStudentId('')
      return
    }
    void listStudents(classId)
      .then((s) => {
        setStudents(s)
        setStudentId((cur) => (s.some((x) => x.id === cur) ? cur : (s[0]?.id ?? '')))
      })
      .catch((e) => setError((e as Error).message))
  }, [classId])

  async function save() {
    setError(null)
    if (!studentId) return setError('Pick a child.')
    if (!complaint.trim()) return setError('What was wrong?')
    setBusy(true)
    try {
      await recordClinicVisit(studentId, complaint, treatment, sentHome)
      setComplaint('')
      setTreatment('')
      setSentHome(false)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Sick bay</span>
        <h1 className="text-[26px] mt-1">Clinic</h1>
        <p className="mt-2 text-[14px] text-ink-soft max-w-[48ch]">
          Notes on children who came through the clinic. Only the proprietor and clinic staff open this book.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="space-y-4">
        <Panel title="Record a visit">
          <form
            className="space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <div>
              <span className="eyebrow">Class</span>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="mt-1.5 w-full h-11 px-3 border border-rule-strong rounded-md bg-surface text-[14px]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="eyebrow">Child</span>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1.5 w-full h-11 px-3 border border-rule-strong rounded-md bg-surface text-[14px]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Complaint"
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Headache, fever…"
              required
            />
            <TextArea
              label="Treatment"
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Rest, paracetamol, sent home…"
            />
            <label className="flex items-center gap-2.5 text-[13px] text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={sentHome}
                onChange={(e) => setSentHome(e.target.checked)}
              />
              Sent home
            </label>
            <Button type="submit" loading={busy}>
              Save visit
            </Button>
          </form>
        </Panel>

        <Panel title="Log">
          {loading ? (
            <Spinner />
          ) : visits.length === 0 ? (
            <Empty line="No visits recorded yet." />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {visits.map((v) => (
                <Row
                  key={v.id}
                  left={
                    <>
                      <div className="text-[15px]">
                        {v.first_name} {v.last_name}
                      </div>
                      <div className="text-[12px] text-ink-faint">
                        {v.class_name ?? 'Unassigned'} · {fmtWhen(v.visit_at)}
                        {v.sent_home ? ' · sent home' : ''}
                      </div>
                      <div className="mt-1 text-[13px] text-ink-soft">{v.complaint}</div>
                      {v.treatment ? (
                        <div className="text-[12px] text-ink-faint">{v.treatment}</div>
                      ) : null}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  )
}
