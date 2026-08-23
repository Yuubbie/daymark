import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { inviteTeacher, listInvites, listTeachers } from '../../lib/queries'

export default function Teachers() {
  const { profile } = useAuth()
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([])
  const [invites, setInvites] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [t, i] = await Promise.all([listTeachers(), listInvites()])
      setTeachers(t)
      setInvites(i.filter((x) => !x.accepted_at))
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
          <span className="eyebrow">Staff</span>
          <h1 className="text-[26px] mt-1">Teachers</h1>
        </div>
        <Button onClick={() => setOpen(true)}>Invite</Button>
      </div>

      <div className="space-y-4">
        <Panel title="On Daymark">
          {loading ? (
            <Spinner />
          ) : teachers.length === 0 ? (
            <Empty line="No teachers have signed up yet. Invite them by email, then they create their own account." />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {teachers.map((t) => (
                <Row
                  key={t.id as string}
                  left={
                    <>
                      <div className="text-[15px]">{(t.full_name as string) ?? 'Teacher'}</div>
                      <div className="text-[12px] text-ink-faint">{t.email as string}</div>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Panel>

        {invites.length > 0 && (
          <Panel title="Invited, not signed up">
            <div className="divide-y divide-rule -my-3">
              {invites.map((i) => (
                <Row
                  key={i.id as string}
                  left={
                    <>
                      <div className="text-[15px]">{(i.full_name as string) ?? (i.email as string)}</div>
                      <div className="text-[12px] text-ink-faint">{i.email as string}</div>
                    </>
                  }
                  right={
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-late">
                      Pending
                    </span>
                  }
                />
              ))}
            </div>
            <p className="mt-4 pt-4 border-t border-rule text-[12px] text-ink-faint">
              Tell them to sign up at your Daymark link with this exact email. They join your
              school automatically.
            </p>
          </Panel>
        )}
      </div>

      <InviteModal
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

function InviteModal({
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
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    setBusy(true)
    const { error } = await inviteTeacher(schoolId, email, name)
    setBusy(false)
    if (error) {
      return setError(
        /duplicate key/i.test(error.message)
          ? 'That email is already invited.'
          : error.message,
      )
    }
    setEmail('')
    setName('')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite a teacher">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="They must sign up with this exact address."
        />
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" full loading={busy}>
          Add invite
        </Button>
      </form>
    </Modal>
  )
}
