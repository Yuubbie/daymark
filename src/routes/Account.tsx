import { AppShell } from '../components/AppShell'
import { Button, Panel, Row } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function Account() {
  const { profile, school, session, signOut } = useAuth()

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Signed in</span>
        <h1 className="text-[26px] mt-1">{profile?.full_name || 'Your account'}</h1>
      </div>

      <div className="space-y-4">
        <Panel title="Account">
          <div className="divide-y divide-rule -my-3">
            <Row
              left={<span className="text-[13px] text-ink-faint">Name</span>}
              right={<span className="text-[14px]">{profile?.full_name || '—'}</span>}
            />
            <Row
              left={<span className="text-[13px] text-ink-faint">Email</span>}
              right={<span className="text-[14px]">{session?.user.email ?? profile?.email ?? '—'}</span>}
            />
            <Row
              left={<span className="text-[13px] text-ink-faint">Role</span>}
              right={
                <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                  {profile?.role}
                </span>
              }
            />
            <Row
              left={<span className="text-[13px] text-ink-faint">School</span>}
              right={<span className="text-[14px]">{school?.name ?? '—'}</span>}
            />
          </div>
        </Panel>

        <Button
          variant="secondary"
          full
          onClick={() => void signOut().then(() => {
            window.location.assign('/login')
          })}
        >
          Sign out
        </Button>
      </div>
    </AppShell>
  )
}
