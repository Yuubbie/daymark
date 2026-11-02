import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  createClass,
  deactivateClass,
  listClasses,
  reorderClasses,
  type ClassRow,
} from '../../lib/queries'
import { looksLikeEarlyYears } from '../../lib/marks'

export default function Classes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setRows(await listClasses())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function move(id: string, dir: -1 | 1) {
    const i = rows.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= rows.length) return
    const next = [...rows]
    const [item] = next.splice(i, 1)
    next.splice(j, 0, item)
    setRows(next)
    setBusyId(id)
    try {
      await reorderClasses(next.map((c) => c.id))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function remove(c: ClassRow) {
    if (
      !confirm(
        c.student_count > 0
          ? `${c.name} still has ${c.student_count} student${c.student_count === 1 ? '' : 's'}. Move or remove them first.`
          : `Remove ${c.name}? It leaves the active list. Records stay.`,
      )
    ) {
      return
    }
    if (c.student_count > 0) return
    setBusyId(c.id)
    try {
      await deactivateClass(c.id)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Classes</span>
          <h1 className="text-[26px] mt-1">
            {rows.length} {rows.length === 1 ? 'class' : 'classes'}
          </h1>
        </div>
        <Button onClick={() => setOpen(true)}>New class</Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <Panel>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty
            line="No classes yet. Name them the way your school does: Year 1 Rugby, Year 1 Gold, JSS 1A."
            action={<Button onClick={() => setOpen(true)}>Create the first class</Button>}
          />
        ) : (
          <div className="divide-y divide-rule -my-3">
            {rows.map((c, i) => (
              <Row
                key={c.id}
                onClick={() => navigate(`/admin/classes/${c.id}`)}
                left={
                  <>
                    <div className="text-[15px] font-semibold">{c.name}</div>
                    {(c.level || c.report_kind === 'statement') && (
                      <div className="text-[12px] text-ink-faint">
                        {[c.level, c.report_kind === 'statement' ? 'Statement card' : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </>
                }
                right={
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="tnum text-[13px] text-ink-faint">
                      {c.student_count} {c.student_count === 1 ? 'student' : 'students'}
                    </span>
                    <button
                      className="font-mono text-[11px] uppercase tracking-[0.1em] underline disabled:opacity-40"
                      disabled={i === 0 || busyId === c.id}
                      onClick={() => void move(c.id, -1)}
                    >
                      Up
                    </button>
                    <button
                      className="font-mono text-[11px] uppercase tracking-[0.1em] underline disabled:opacity-40"
                      disabled={i === rows.length - 1 || busyId === c.id}
                      onClick={() => void move(c.id, 1)}
                    >
                      Down
                    </button>
                    <button
                      className="font-mono text-[11px] uppercase tracking-[0.1em] underline text-absent disabled:opacity-40"
                      disabled={busyId === c.id}
                      onClick={() => void remove(c)}
                    >
                      Remove
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Panel>

      <NewClassModal
        open={open}
        onClose={() => setOpen(false)}
        schoolId={profile?.school_id ?? ''}
        onSaved={() => {
          setOpen(false)
          void load()
        }}
      />
    </AppShell>
  )
}

function NewClassModal({
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
  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [reportKind, setReportKind] = useState<'numeric' | 'statement'>('numeric')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    setBusy(true)
    const kind = looksLikeEarlyYears(name, level) ? 'statement' : reportKind
    const { error } = await createClass(schoolId, name, level, kind)
    setBusy(false)
    if (error) {
      return setError(
        /duplicate key/i.test(error.message)
          ? 'A class with that name already exists.'
          : error.message,
      )
    }
    setName('')
    setLevel('')
    setReportKind('numeric')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="New class">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field
          label="Class name"
          required
          placeholder="Year 1 Rugby"
          hint="Use the name your school actually calls the class."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Level"
          placeholder="Year 1"
          hint="Optional grouping, for example Year 1 or JSS 1."
          value={level}
          onChange={(e) => {
            setLevel(e.target.value)
            if (looksLikeEarlyYears(name, e.target.value)) setReportKind('statement')
          }}
        />
        <label className="block">
          <span className="eyebrow block mb-1.5">Report card</span>
          <select
            value={reportKind}
            onChange={(e) => setReportKind(e.target.value as 'numeric' | 'statement')}
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]
                       text-ink focus:border-brass"
          >
            <option value="numeric">Scores — tests and exams</option>
            <option value="statement">Statements — Nursery / EYFS</option>
          </select>
          <span className="block mt-1.5 text-[12px] text-ink-faint">
            Statement cards use comments and Emerging / Expected / Exceeding. No averages.
          </span>
        </label>
        <Button type="submit" full loading={busy}>
          Create class
        </Button>
      </form>
    </Modal>
  )
}
