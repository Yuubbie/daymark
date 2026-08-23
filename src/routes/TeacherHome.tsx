import { AppShell } from '../components/AppShell'
import { Empty, Panel } from '../components/ui'

export default function TeacherHome() {
  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">Register</span>
        <h1 className="text-[26px] mt-1">{today}</h1>
      </div>

      <Panel title="Your classes">
        <Empty line="No classes assigned to you yet. Ask your school admin to add you to a class." />
      </Panel>
    </AppShell>
  )
}
