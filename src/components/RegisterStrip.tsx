import type { AttendanceMark } from '../lib/types'

/* ---------------------------------------------------------------------------
   THE SIGNATURE ELEMENT.

   A child's term rendered as a line in the attendance register: one mark per
   school day, grouped into weeks. Weeks wrap rather than scroll, so a whole
   term reads as a block of register lines on any screen width.

   Reused on: parent home, teacher class view, admin flagged list, PDF report.
--------------------------------------------------------------------------- */

const FILL: Record<string, string> = {
  present: 'bg-present',
  absent: 'bg-absent',
  late: 'bg-late',
  excused: 'bg-excused',
  unmarked: 'bg-unmarked',
}

export function RegisterStrip({
  marks,
  weekSize = 5,
  height = 'md',
}: {
  marks: AttendanceMark[]
  weekSize?: number
  height?: 'sm' | 'md'
}) {
  const h = height === 'sm' ? 'h-4' : 'h-6'
  const w = height === 'sm' ? 'w-[6px]' : 'w-[7px]'

  if (marks.length === 0) {
    return <div className={`${h} w-full rounded-sm border border-dashed border-rule-strong`} />
  }

  const weeks: AttendanceMark[][] = []
  for (let i = 0; i < marks.length; i += weekSize) {
    weeks.push(marks.slice(i, i + weekSize))
  }

  return (
    <div
      className="flex flex-wrap items-end gap-x-2 gap-y-1.5"
      role="img"
      aria-label={`Attendance register, ${marks.length} school days`}
    >
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-[3px] shrink-0">
          {week.map((m) => (
            <span
              key={m.date}
              title={`${m.date}: ${m.status ?? 'not marked'}`}
              className={`${h} ${w} rounded-[1.5px] ${FILL[m.status ?? 'unmarked']}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function RegisterLegend() {
  const items: [string, string][] = [
    ['present', 'Present'],
    ['late', 'Late'],
    ['absent', 'Absent'],
    ['excused', 'Excused'],
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map(([k, label]) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint">
          <span className={`h-2.5 w-2.5 rounded-[1.5px] ${FILL[k]}`} />
          {label}
        </span>
      ))}
    </div>
  )
}

/** Big tabular percentage above the strip. The parent's answer, in one block. */
export function AttendanceSummary({
  pct,
  marks,
  caption,
}: {
  pct: number | null
  marks: AttendanceMark[]
  caption?: string
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="tnum text-[40px] leading-none font-semibold text-ink">
          {pct === null ? '\u2014' : pct.toFixed(0)}
        </span>
        <span className="tnum text-[15px] text-ink-faint">%</span>
        {caption && <span className="ml-auto eyebrow">{caption}</span>}
      </div>
      <div className="mt-3">
        <RegisterStrip marks={marks} />
      </div>
    </div>
  )
}
