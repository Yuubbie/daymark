import { AppShell } from '../components/AppShell'
import { Empty, Panel } from '../components/ui'
import { RegisterLegend } from '../components/RegisterStrip'

export default function ParentHome() {
  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <AppShell>
      <div className="mb-5">
        <span className="eyebrow">{today}</span>
        <h1 className="text-[26px] mt-1">Your children</h1>
      </div>

      <Panel title="Attendance this term">
        <Empty line="Nothing recorded yet. Marks appear here the first day the register is taken." />
        <div className="mt-4 pt-4 border-t border-rule">
          <RegisterLegend />
        </div>
      </Panel>

      <div className="mt-4">
        <Panel title="Today's lessons">
          <Empty line="When teachers post the day's lesson and homework, it lands here." />
        </Panel>
      </div>
    </AppShell>
  )
}
