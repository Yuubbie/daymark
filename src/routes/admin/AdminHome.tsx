import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Row, Spinner, Stat } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  adminSummary,
  classesMissingLessonToday,
  createTerm,
  getCurrentTerm,
  type TermRow,
} from '../../lib/queries'

export default function AdminHome() {
  const { school, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [sum, setSum] = useState<Awaited<ReturnType<typeof adminSummary>> | null>(null)
  const [term, setTerm] = useState<TermRow | null>(null)
  const [missing, setMissing] = useState<Record<string, unknown>[]>([])
  const [termOpen, setTermOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [s, t, m] = await Promise.all([
        adminSummary(),
        getCurrentTerm(),
        classesMissingLessonToday(),
      ])
      setSum(s)
      setTerm(t)
      setMissing(m.filter((r) => r.missing_today))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const setupDone = Boolean(term) && (sum?.classes ?? 0) > 0 && (sum?.students ?? 0) > 0

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">{today}</span>
        <h1 className="text-[26px] mt-1">{school?.name}</h1>
      </div>

      {loading && !sum ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {!setupDone && (
            <Panel title="Get set up">
              <ol className="space-y-3">
                <SetupStep
                  done={Boolean(term)}
                  n={1}
                  title="Set the current term"
                  body="Attendance and reports are measured against it."
                  action={
                    <Button variant="secondary" onClick={() => setTermOpen(true)}>
                      {term ? 'Change' : 'Set term'}
                    </Button>
                  }
                />
                <SetupStep
                  done={(sum?.classes ?? 0) > 0}
                  n={2}
                  title="Create your classes"
                  body="One per class, for example JSS 1A."
                  action={
                    <Link to="/admin/classes">
                      <Button variant="secondary">Classes</Button>
                    </Link>
                  }
                />
                <SetupStep
                  done={(sum?.students ?? 0) > 0}
                  n={3}
                  title="Add students"
                  body="Paste a whole class list at once, then hand parents their codes."
                  action={
                    <Link to="/admin/classes">
                      <Button variant="secondary">Add</Button>
                    </Link>
                  }
                />
              </ol>
            </Panel>
          )}

          <Panel title="Today">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <Stat value={sum?.students ?? 0} label="Students" />
              <Stat value={sum?.classes ?? 0} label="Classes" />
              <Stat value={sum?.attendanceToday ?? 0} label="Marked today" />
              <Stat value={sum?.lessonsToday ?? 0} label="Lessons posted" />
            </div>
            {term && (
              <p className="mt-5 pt-4 border-t border-rule text-[13px] text-ink-faint">
                Current term: <span className="text-ink">{term.name}</span>, {term.start_date} to{' '}
                {term.end_date}
              </p>
            )}
          </Panel>

          <Panel title="Not posted today">
            {missing.length === 0 ? (
              <Empty line="Every class has posted a lesson today, or you have no classes yet." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {missing.map((m) => (
                  <Row
                    key={m.class_id as string}
                    left={<span className="text-[14px] font-semibold">{m.class_name as string}</span>}
                    right={
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-absent">
                        Nothing yet
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </Panel>

          {(sum?.studentsWithoutParent ?? 0) > 0 && (
            <Panel title="Parents not linked">
              <p className="text-[14px] text-ink-soft">
                <span className="tnum font-semibold text-ink">{sum?.studentsWithoutParent}</span>{' '}
                students have no parent account attached. Generate claim codes on the class page
                and send them home.
              </p>
              <div className="mt-3">
                <Link to="/admin/classes">
                  <Button variant="secondary">Open classes</Button>
                </Link>
              </div>
            </Panel>
          )}
        </div>
      )}

      <TermModal
        open={termOpen}
        onClose={() => setTermOpen(false)}
        schoolId={profile?.school_id ?? ''}
        onSaved={() => {
          setTermOpen(false)
          void load()
        }}
      />
    </AppShell>
  )
}

function SetupStep({
  n,
  done,
  title,
  body,
  action,
}: {
  n: number
  done: boolean
  title: string
  body: string
  action: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 h-6 w-6 shrink-0 rounded-sm grid place-items-center font-mono text-[11px]
          ${done ? 'bg-present text-ink-invert' : 'bg-surface-alt text-ink-faint border border-rule'}`}
      >
        {done ? '\u2713' : n}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[13px] text-ink-faint">{body}</div>
      </div>
      <div className="ml-auto shrink-0">{action}</div>
    </li>
  )
}

function TermModal({
  open,
  onClose,
  schoolId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  onSaved: () => void
}) {
  const year = new Date().getFullYear()
  const [name, setName] = useState(`First Term ${year}/${year + 1}`)
  const [start, setStart] = useState(`${year}-09-15`)
  const [end, setEnd] = useState(`${year}-12-15`)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    setBusy(true)
    const { error } = await createTerm(schoolId, name, start, end)
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Current term">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field label="Term name" required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Starts"
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Field
            label="Ends"
            type="date"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <Button type="submit" full loading={busy}>
          Save term
        </Button>
      </form>
    </Modal>
  )
}
