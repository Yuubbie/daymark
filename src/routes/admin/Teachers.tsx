import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Row, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { inviteStaff, listInvites, listStaff, reactivateTeacher, removeTeacher } from '../../lib/queries'

type InviteRole = 'teacher' | 'admin'

export default function Teachers() {
  const { profile } = useAuth()
  const [staff, setStaff] = useState<Record<string, unknown>[]>([])
  const [invites, setInvites] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [inviteRole, setInviteRole] = useState<InviteRole>('teacher')
  const canInviteAdmin = profile?.role === 'proprietor' || profile?.role === 'admin'

  async function load() {
    setLoading(true)
    try {
      const [s, i] = await Promise.all([listStaff(), listInvites()])
      setStaff(s)
      setInvites(i.filter((x) => !x.accepted_at))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function openInvite(role: InviteRole) {
    setInviteRole(role)
    setOpen(true)
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Staff</span>
          <h1 className="text-[26px] mt-1">People</h1>
        </div>
        <div className="flex gap-2">
          {canInviteAdmin && (
            <Button variant="secondary" onClick={() => openInvite('admin')}>
              Invite admin
            </Button>
          )}
          <Button onClick={() => openInvite('teacher')}>Invite teacher</Button>
        </div>
      </div>

      <div className="space-y-4">
        <Panel title="On Daymaark">
          {loading ? (
            <Spinner />
          ) : staff.length === 0 ? (
            <Empty line="Nobody has signed up yet. Invite an admin to run the day, then teachers." />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {staff.map((t) => (
                <Row
                  key={t.id as string}
                  left={
                    <>
                      <div className="text-[15px]">{(t.full_name as string) ?? 'Staff'}</div>
                      <div className="text-[12px] text-ink-faint">
                        {t.email as string}
                        {t.is_active === false ? ' · left the school' : ''}
                      </div>
                    </>
                  }
                  right={
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                        {t.role as string}
                      </span>
                      {t.role !== 'proprietor' && t.is_active === false && (
                        <button
                          className="text-[12px] underline"
                          onClick={() =>
                            void reactivateTeacher(t.id as string)
                              .then(() => load())
                              .catch((e) => alert((e as Error).message))
                          }
                        >
                          Restore
                        </button>
                      )}
                      {t.role !== 'proprietor' && t.is_active !== false && (
                        <button
                          className="text-[12px] underline text-absent"
                          onClick={() => {
                            if (!confirm('Remove this person from the school? They lose access immediately.')) return
                            void removeTeacher(t.id as string)
                              .then(() => load())
                              .catch((e) => alert((e as Error).message))
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
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
                      {(i.role as string) ?? 'pending'}
                    </span>
                  }
                />
              ))}
            </div>
            <p className="mt-4 pt-4 border-t border-rule text-[12px] text-ink-faint">
              They sign up at your Daymaark link with this exact email and join the school automatically.
            </p>
          </Panel>
        )}
      </div>

      <InviteModal
        open={open}
        role={inviteRole}
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
  role,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  onSaved: () => void
  role: InviteRole
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail('')
      setName('')
      setError(null)
    }
  }, [open, role])

  async function save() {
    setError(null)
    setBusy(true)
    const { error } = await inviteStaff(schoolId, email, name, role)
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
    <Modal open={open} onClose={onClose} title={role === 'admin' ? 'Invite an admin' : 'Invite a teacher'}>
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <p className="text-[13px] text-ink-soft">
          {role === 'admin'
            ? 'The day-to-day administrator. They run classes, fees and the register. You stay proprietor.'
            : 'They must sign up with this exact email.'}
        </p>
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
          Send invite
        </Button>
      </form>
    </Modal>
  )
}
