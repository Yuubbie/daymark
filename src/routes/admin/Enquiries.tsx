import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Modal, Panel, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  enrolEnquiry,
  listClasses,
  listEnquiries,
  setEnquiryStatus,
  smsHref,
  whatsappHref,
  type ClassRow,
  type Enquiry,
  type EnquiryStatus,
} from '../../lib/queries'

const FILTERS: { key: 'open' | 'all' | EnquiryStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'offered', label: 'Offered' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'declined', label: 'Declined' },
  { key: 'all', label: 'All' },
]

function statusLabel(s: EnquiryStatus) {
  if (s === 'new') return 'New'
  if (s === 'contacted') return 'Contacted'
  if (s === 'offered') return 'Offered'
  if (s === 'enrolled') return 'Enrolled'
  return 'Declined'
}

export default function Enquiries() {
  const { school } = useAuth()
  const [rows, setRows] = useState<Enquiry[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all' | EnquiryStatus>('open')
  const [enrolFor, setEnrolFor] = useState<Enquiry | null>(null)
  const [classId, setClassId] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const applyUrl = school?.slug
    ? `${window.location.origin}/apply/${school.slug}`
    : ''

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [e, c] = await Promise.all([listEnquiries(), listClasses()])
      setRows(e)
      setClasses(c)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const shown = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'open') {
      return rows.filter(
        (r) => r.status === 'new' || r.status === 'contacted' || r.status === 'offered',
      )
    }
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  async function copyLink() {
    if (!applyUrl) return
    try {
      await navigator.clipboard.writeText(applyUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy. Select the link and copy it yourself.')
    }
  }

  async function mark(row: Enquiry, status: EnquiryStatus) {
    setError(null)
    try {
      await setEnquiryStatus(row.id, status)
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function enrol() {
    if (!enrolFor || !classId) return
    setBusy(true)
    setError(null)
    try {
      const studentId = await enrolEnquiry(enrolFor.id, classId)
      setRows((rs) =>
        rs.map((r) =>
          r.id === enrolFor.id ? { ...r, status: 'enrolled', student_id: studentId } : r,
        ),
      )
      setEnrolFor(null)
      setClassId('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Admissions</span>
        <h1 className="text-[26px] mt-1">Enquiries</h1>
        <p className="text-[13px] text-ink-faint mt-1">
          A parent fills the public form. You call, then enrol onto a class.
        </p>
      </div>

      {applyUrl && (
        <Panel title="Public form" className="mb-4">
          <p className="text-[13px] text-ink-soft break-all">{applyUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void copyLink()}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <a href={applyUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost">Open</Button>
            </a>
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-9 px-3 rounded-md text-[13px] font-semibold border transition-colors
              ${filter === f.key
                ? 'bg-ink text-ink-invert border-ink'
                : 'bg-surface text-ink-soft border-rule-strong hover:border-ink-faint'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <Panel>
          <Empty line="No enquiries in this list. Share the public form, or wait for the first parent to apply." />
        </Panel>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => {
            const wa = whatsappHref(
              r.guardian_phone,
              `Hello ${r.guardian_name}, this is ${school?.name ?? 'the school'} regarding ${r.child_first}'s application.`,
            )
            const sms = smsHref(
              r.guardian_phone,
              `Hello ${r.guardian_name}, this is ${school?.name ?? 'the school'} regarding ${r.child_first}'s application.`,
            )
            return (
              <Panel key={r.id}>
                <div className="flex items-baseline gap-3">
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold">
                      {r.child_last}, {r.child_first}
                    </div>
                    <div className="text-[12px] text-ink-faint">
                      {r.seeking_class ?? 'Class not given'}
                      {r.date_of_birth ? ` · ${r.date_of_birth}` : ''}
                    </div>
                  </div>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint shrink-0">
                    {statusLabel(r.status)}
                  </span>
                </div>
                <div className="mt-3 text-[14px]">
                  {r.guardian_name}
                  <span className="tnum text-[12px] text-ink-faint ml-2">{r.guardian_phone}</span>
                </div>
                {r.note && <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">{r.note}</p>}
                <div className="mt-3 pt-3 border-t border-rule flex flex-wrap gap-1.5">
                  {wa && (
                    <a href={wa} target="_blank" rel="noreferrer">
                      <Button variant="secondary">WhatsApp</Button>
                    </a>
                  )}
                  {sms && (
                    <a href={sms}>
                      <Button variant="ghost">SMS</Button>
                    </a>
                  )}
                  {r.status === 'new' && (
                    <Button variant="secondary" onClick={() => void mark(r, 'contacted')}>
                      Mark contacted
                    </Button>
                  )}
                  {(r.status === 'new' || r.status === 'contacted') && (
                    <Button variant="secondary" onClick={() => void mark(r, 'offered')}>
                      Offer place
                    </Button>
                  )}
                  {r.status !== 'enrolled' && r.status !== 'declined' && (
                    <>
                      <Button
                        onClick={() => {
                          setClassId(classes[0]?.id ?? '')
                          setEnrolFor(r)
                        }}
                      >
                        Enrol
                      </Button>
                      <Button variant="danger" onClick={() => void mark(r, 'declined')}>
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      <Modal
        open={enrolFor !== null}
        onClose={() => setEnrolFor(null)}
        title={enrolFor ? `Enrol ${enrolFor.child_first}` : 'Enrol'}
      >
        <p className="text-[13px] text-ink-soft leading-relaxed mb-3">
          Puts them on the class roster. Parents still need a claim code. Students still need their
          own login.
        </p>
        <label className="block">
          <span className="eyebrow block mb-1.5">Class</span>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px] text-ink focus:border-brass"
          >
            {classes.length === 0 && <option value="">No classes yet</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          <Button full loading={busy} disabled={!classId} onClick={() => void enrol()}>
            Enrol onto class
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
