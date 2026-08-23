import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { AttendanceSummary, RegisterLegend } from '../../components/RegisterStrip'
import { Empty, Panel, Spinner } from '../../components/ui'
import {
  attendancePct,
  childRegister,
  currentTerm,
  lessonsFor,
  listChildren,
  recentFeed,
  type Child,
  type LessonRow,
  type TermBounds,
} from '../../lib/parent'
import type { AttendanceMark } from '../../lib/types'

/* ---------------------------------------------------------------------------
   The parent's screen.

   The one that has to answer "how is my child doing" in three seconds, on a
   mid-range Android, on the way to work. Register strip first, then the day.
--------------------------------------------------------------------------- */

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function ChildSwitcher({
  children,
  active,
  onChange,
}: {
  children: Child[]
  active: string
  onChange: (id: string) => void
}) {
  if (children.length < 2) return null
  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
      {children.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={`h-9 px-3.5 rounded-md text-[13px] font-semibold shrink-0 border transition-colors
            ${c.id === active
              ? 'bg-ink text-ink-invert border-ink'
              : 'bg-surface text-ink-soft border-rule-strong hover:border-ink-faint'}`}
        >
          {c.first_name}
        </button>
      ))}
    </div>
  )
}

export default function ParentHome() {
  const [kids, setKids] = useState<Child[]>([])
  const [active, setActive] = useState('')
  const [term, setTerm] = useState<TermBounds>(null)
  const [marks, setMarks] = useState<AttendanceMark[]>([])
  const [today, setToday] = useState<LessonRow[]>([])
  const [feed, setFeed] = useState<LessonRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [cs, t] = await Promise.all([listChildren(), currentTerm()])
      setKids(cs)
      setTerm(t)
      setActive(cs[0]?.id ?? '')
      if (cs.length === 0) setLoading(false)
    })()
  }, [])

  const load = useCallback(async () => {
    const child = kids.find((k) => k.id === active)
    if (!child) return
    setLoading(true)
    try {
      const [m, l, f] = await Promise.all([
        childRegister(child.id, term),
        child.class_id ? lessonsFor(child.class_id, todayISO()) : Promise.resolve([]),
        child.class_id ? recentFeed(child.class_id) : Promise.resolve([]),
      ])
      setMarks(m)
      setToday(l)
      setFeed(f.filter((x) => x.date !== todayISO()).slice(0, 8))
    } finally {
      setLoading(false)
    }
  }, [active, kids, term])

  useEffect(() => {
    void load()
  }, [load])

  const child = kids.find((k) => k.id === active)
  const pct = attendancePct(marks)
  const todayLabel = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (kids.length === 0 && !loading) {
    return (
      <AppShell>
        <Panel>
          <Empty line="No child linked to this account yet. Ask the school for a claim code, then enter it to link your child." />
        </Panel>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">{todayLabel}</span>
        <h1 className="text-[26px] mt-1">
          {child ? `${child.first_name} ${child.last_name}` : 'Your children'}
        </h1>
        {child?.class_name && (
          <p className="text-[13px] text-ink-faint mt-0.5">{child.class_name}</p>
        )}
      </div>

      <ChildSwitcher children={kids} active={active} onChange={setActive} />

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <Panel title={term ? term.name : 'Attendance so far'}>
            {marks.length === 0 ? (
              <Empty line="No attendance recorded yet. Marks appear here the first day the register is taken." />
            ) : (
              <>
                <AttendanceSummary
                  pct={pct}
                  marks={marks}
                  caption={`${marks.length} school ${marks.length === 1 ? 'day' : 'days'}`}
                />
                <div className="mt-4 pt-4 border-t border-rule">
                  <RegisterLegend />
                </div>
              </>
            )}
          </Panel>

          <Panel title="Today at school">
            {today.length === 0 ? (
              <Empty line="Nothing posted yet today. Teachers usually post at the end of the lesson." />
            ) : (
              <div className="divide-y divide-rule -my-3">
                {today.map((l) => (
                  <LessonEntry key={l.id} lesson={l} />
                ))}
              </div>
            )}
          </Panel>

          {feed.length > 0 && (
            <Panel title="Earlier this fortnight">
              <div className="divide-y divide-rule -my-3">
                {feed.map((l) => (
                  <LessonEntry key={l.id} lesson={l} showDate />
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  )
}

export function LessonEntry({ lesson, showDate }: { lesson: LessonRow; showDate?: boolean }) {
  return (
    <div className="py-3.5">
      <div className="flex items-baseline gap-2">
        <span className="eyebrow">{lesson.subject}</span>
        {showDate && (
          <span className="tnum text-[11px] text-ink-faint ml-auto">{lesson.date}</span>
        )}
      </div>
      <div className="text-[15px] font-semibold mt-1">{lesson.topic}</div>
      {lesson.summary && (
        <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">{lesson.summary}</p>
      )}
      {lesson.homework && (
        <div className="mt-2.5 border-l-2 border-brass pl-3">
          <span className="eyebrow">Homework</span>
          <p className="text-[14px] mt-0.5">{lesson.homework}</p>
          {lesson.homework_due_date && (
            <p className="tnum text-[12px] text-ink-faint mt-0.5">
              Due {lesson.homework_due_date}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
