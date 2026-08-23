import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { createClass, listClasses, type ClassRow } from '../../lib/queries'

export default function Classes() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setRows(await listClasses())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

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

      <Panel>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty
            line="No classes yet. Create one for each class in the school, for example JSS 1A."
            action={<Button onClick={() => setOpen(true)}>Create the first class</Button>}
          />
        ) : (
          <div className="divide-y divide-rule -my-3">
            {rows.map((c) => (
              <Row
                key={c.id}
                onClick={() => navigate(`/admin/classes/${c.id}`)}
                left={
                  <>
                    <div className="text-[15px] font-semibold">{c.name}</div>
                    {c.level && <div className="text-[12px] text-ink-faint">{c.level}</div>}
                  </>
                }
                right={
                  <span className="tnum text-[13px] text-ink-faint">
                    {c.student_count} {c.student_count === 1 ? 'student' : 'students'}
                  </span>
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
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    setBusy(true)
    const { error } = await createClass(schoolId, name, level)
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
          placeholder="JSS 1A"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Level"
          placeholder="JSS 1"
          hint="Optional. Used for grouping in reports."
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        />
        <Button type="submit" full loading={busy}>
          Create class
        </Button>
      </form>
    </Modal>
  )
}
