import { AppShell } from '../components/AppShell'
import { Empty, Panel } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function AdminHome() {
  const { school } = useAuth()

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Today</span>
        <h1 className="text-[26px] mt-1">{school?.name}</h1>
      </div>

      <div className="space-y-4">
        <Panel title="Attendance taken">
          <Empty line="No classes yet. Add your first class to start taking the register." />
        </Panel>

        <Panel title="Lessons posted today">
          <Empty line="Once teachers start posting, you'll see who has and who hasn't, at a glance." />
        </Panel>

        <Panel title="Needs attention">
          <Empty line="Students with low attendance or a run of absences will surface here." />
        </Panel>
      </div>
    </AppShell>
  )
}
