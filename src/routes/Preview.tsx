import { AttendanceSummary, RegisterLegend } from '../components/RegisterStrip'
import { Lockup, Mark, Wordmark } from '../components/Logo'
import { Alert, Button, Empty, Field, Panel, StatusPill } from '../components/ui'
import type { AttendanceMark, AttendanceStatus } from '../lib/types'

/**
 * /preview, the design system on one page. Not linked from the app.
 * Delete before the pilot, or keep it behind an admin flag.
 */

function fakeTerm(seed: number, days = 55): AttendanceMark[] {
  const out: AttendanceMark[] = []
  let n = seed
  for (let i = 0; i < days; i++) {
    n = (n * 1103515245 + 12345) % 2147483648
    const r = (n / 2147483648) * 100
    const status: AttendanceStatus | null =
      i > days - 4 ? null : r > 92 ? 'absent' : r > 84 ? 'late' : r > 81 ? 'excused' : 'present'
    const d = new Date(2026, 0, 12 + Math.floor(i / 5) * 7 + (i % 5))
    out.push({ date: d.toISOString().slice(0, 10), status })
  }
  return out
}

const SWATCHES: [string, string][] = [
  ['paper', '#F7F8F6'],
  ['ink', '#143A2B'],
  ['brass', '#C9922B'],
  ['rule', '#DDE2DB'],
  ['present', '#2F7D5C'],
  ['absent', '#C2413A'],
  ['late', '#D99114'],
]

export default function Preview() {
  const ada = fakeTerm(7)
  const bola = fakeTerm(23)

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-ink text-ink-invert">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Wordmark size="lg" className="text-ink-invert mb-5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-invert/55">
            Design system
          </span>
          <h1 className="text-[32px] mt-1">Daymaark</h1>
          <p className="mt-2 text-[14px] text-ink-invert/70 max-w-[42ch]">
            The app is the attendance register. Ruled surfaces, hairlines, tabular figures,
            marks in a row.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <Panel title="Signature, the register strip">
          <div className="space-y-6">
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[15px] font-semibold">Sample Student</span>
                <span className="eyebrow">JSS 1A</span>
              </div>
              <AttendanceSummary pct={91} marks={ada} caption="First term" />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[15px] font-semibold">Bola Adeyemi</span>
                <span className="eyebrow">JSS 1A</span>
              </div>
              <AttendanceSummary pct={68} marks={bola} caption="First term" />
            </div>
            <div className="pt-4 border-t border-rule">
              <RegisterLegend />
            </div>
          </div>
        </Panel>

        <Panel title="Mark">
          <div className="space-y-5">
            <div className="flex items-end gap-8 flex-wrap">
              <Mark className="h-12 w-[62px] text-ink" />
              <Wordmark size="lg" className="text-ink" />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-ink rounded-lg px-6 py-5">
                <Lockup className="text-ink-invert" />
              </div>
              <div className="bg-brass rounded-lg px-6 py-5 flex items-center">
                <Wordmark size="md" className="text-ink" accent="text-ink" />
              </div>
            </div>
            <div className="flex items-end gap-6">
              <Mark className="h-3.5 w-[18px] text-ink" />
              <Mark className="h-5 w-[26px] text-ink" />
              <Mark className="h-7 w-[37px] text-ink" />
              <Mark className="h-9 w-[47px] text-ink" accent="text-ink" />
            </div>
            <p className="text-[13px] text-ink-soft max-w-[52ch]">
              A tally of five: four uprights and a strike. One complete week in the register,
              and exactly how the strip above groups its marks. Equal heights, so it never
              reads as a falling chart. The last swatch shows the single colour version for
              stamps, embroidery and fax-grade photocopies.
            </p>
          </div>
        </Panel>

        <Panel title="Colour">
          <div className="grid grid-cols-4 gap-3">
            {SWATCHES.map(([name, hex]) => (
              <div key={name}>
                <div
                  className="h-12 rounded-md border border-rule"
                  style={{ backgroundColor: hex }}
                />
                <div className="mt-1.5 text-[11px] font-semibold">{name}</div>
                <div className="tnum text-[10px] text-ink-faint">{hex}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Type">
          <div className="space-y-3">
            <div>
              <span className="eyebrow">Display · Bricolage Grotesque</span>
              <h2 className="text-[28px] mt-1">Daymaark stands by your child</h2>
            </div>
            <div>
              <span className="eyebrow">Body · Public Sans</span>
              <p className="text-[15px] text-ink-soft mt-1">
                Parents pay fees and hear nothing until report card day. Daymaark closes that
                silence with the day your child actually had.
              </p>
            </div>
            <div>
              <span className="eyebrow">Figures · IBM Plex Mono</span>
              <p className="tnum text-[20px] mt-1">94.5% · 182 days · KJ7M2QP4</p>
            </div>
          </div>
        </Panel>

        <Panel title="Controls">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Mark present</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="ghost">Skip</Button>
              <Button variant="danger">Remove</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="present" />
              <StatusPill status="late" />
              <StatusPill status="absent" />
              <StatusPill status="excused" />
            </div>
            <Field label="Claim code" mono placeholder="ABCD1234" />
            <Alert>That code has already been used.</Alert>
            <div className="border border-rule rounded-md">
              <Empty
                line="No homework set today."
                action={<Button variant="secondary">View this week</Button>}
              />
            </div>
          </div>
        </Panel>

        <div className="py-6 text-center">
          <span className="eyebrow">Marks in a row · Daymaark</span>
        </div>
      </div>
    </div>
  )
}
