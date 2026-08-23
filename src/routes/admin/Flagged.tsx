import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { RegisterStrip } from '../../components/RegisterStrip'
import { Empty, Panel, Spinner } from '../../components/ui'
import {
  marksForStudents,
  parentsForStudents,
  termStats,
  toIntlDigits,
  type ParentContact,
  type TermStat,
} from '../../lib/queries'
import type { AttendanceMark, AttendanceStatus } from '../../lib/types'
import { useAuth } from '../../lib/auth'

/* ---------------------------------------------------------------------------
   Needs attention.

   The threshold is the school's call, not mine. Nigerian schools differ on
   what counts as poor attendance, so it sits in the UI where a proprietor can
   move it, and the reason for each flag is spelled out rather than implied.
--------------------------------------------------------------------------- */

const THRESHOLDS = [75, 80, 85, 90] as const
const RECENT_ABSENCE_LIMIT = 3

type Flag = { label: string; tone: 'absent' | 'late' }

function reasonsFor(s: TermStat, threshold: number): Flag[] {
  const out: Flag[] = []
  if (s.attendance_pct !== null && s.attendance_pct < threshold) {
    out.push({ label: `Below ${threshold}%`, tone: 'absent' })
  }
  if (s.absent_last_14 >= RECENT_ABSENCE_LIMIT) {
    out.push({
      label: `${s.absent_last_14} absences in 2 weeks`,
      tone: 'absent',
    })
  }
  if (s.late_last_14 >= 4) {
    out.push({ label: `Late ${s.late_last_14} times recently`, tone: 'late' })
  }
  return out
}

export default function Flagged() {
  const [rows, setRows] = useState<TermStat[]>([])
  const [marks, setMarks] = useState<Record<string, { date: string; status: string }[]>>({})
  const [contacts, setContacts] = useState<Record<string, ParentContact[]>>({})
  const [threshold, setThreshold] = useState<number>(80)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const stats = await termStats()
        setRows(stats)
        const ids = stats.map((s) => s.student_id)
        const [m, c] = await Promise.all([marksForStudents(ids), parentsForStudents(ids)])
        setMarks(m)
        setContacts(c)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const flagged = useMemo(
    () =>
      rows
        .filter((s) => s.days_recorded > 0 && reasonsFor(s, threshold).length > 0)
        .sort((a, b) => (a.attendance_pct ?? 0) - (b.attendance_pct ?? 0)),
    [rows, threshold],
  )

  const withData = rows.filter((s) => s.days_recorded > 0)

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Needs attention</span>
        <h1 className="text-[26px] mt-1">
          {flagged.length} of {withData.length} students
        </h1>
        <p className="text-[13px] text-ink-faint mt-1">
          Below the threshold this term, or {RECENT_ABSENCE_LIMIT} or more absences in the last
          fortnight.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="eyebrow">Threshold</span>
        <div className="flex border border-rule-strong rounded-md overflow-hidden">
          {THRESHOLDS.map((t) => (
            <button
              key={t}
              onClick={() => setThreshold(t)}
              className={`h-9 px-3.5 font-mono text-[12px] transition-colors
                ${threshold === t
                  ? 'bg-ink text-ink-invert'
                  : 'bg-surface text-ink-faint hover:text-ink'}`}
            >
              {t}%
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : flagged.length === 0 ? (
        <Panel>
          <Empty
            line={
              withData.length === 0
                ? 'No attendance recorded yet this term.'
                : `Nobody is below ${threshold}% and nobody has missed ${RECENT_ABSENCE_LIMIT} days in the last fortnight.`
            }
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {flagged.map((s) => {
            const reasons = reasonsFor(s, threshold)
            const strip: AttendanceMark[] = (marks[s.student_id] ?? []).map((m) => ({
              date: m.date,
              status: m.status as AttendanceStatus,
            }))
            return (
              <Panel key={s.student_id}>
                <div className="flex items-baseline gap-3">
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold">
                      {s.last_name}, {s.first_name}
                    </div>
                    <div className="text-[12px] text-ink-faint">{s.class_name}</div>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <div className="tnum text-[24px] leading-none font-semibold text-ink">
                      {s.attendance_pct?.toFixed(0) ?? '\u2014'}
                      <span className="text-[13px] text-ink-faint">%</span>
                    </div>
                    <div className="tnum text-[11px] text-ink-faint mt-1">
                      {s.days_absent} absent of {s.days_recorded}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <RegisterStrip marks={strip} height="sm" />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {reasons.map((r) => (
                    <span
                      key={r.label}
                      className={`inline-flex items-center h-6 px-2 rounded-sm border
                        font-mono text-[10px] uppercase tracking-[0.1em]
                        ${r.tone === 'absent'
                          ? 'text-absent border-absent/30 bg-absent/8'
                          : 'text-late border-late/35 bg-late/10'}`}
                    >
                      {r.label}
                    </span>
                  ))}
                  {s.last_absence && (
                    <span className="inline-flex items-center h-6 px-2 font-mono text-[10px]
                                     uppercase tracking-[0.1em] text-ink-faint">
                      Last absent {s.last_absence}
                    </span>
                  )}
                </div>

                <Contacts people={contacts[s.student_id] ?? []} student={s} />
              </Panel>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}

/** Turns the flag into something an admin can act on before they leave the page. */
function Contacts({ people, student }: { people: ParentContact[]; student: TermStat }) {
  const { school } = useAuth()

  if (people.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-rule">
        <p className="text-[13px] text-ink-faint">
          No parent account linked, so nobody at home is seeing this. Generate a claim code on
          the class page.
        </p>
      </div>
    )
  }

  const note =
    `Good day. This is ${school?.name ?? 'the school'} regarding ${student.first_name}'s ` +
    `attendance. ${student.first_name} has been absent ${student.days_absent} of ` +
    `${student.days_recorded} school days this term. Could we speak about it?`

  return (
    <div className="mt-3 pt-3 border-t border-rule space-y-2.5">
      {people.map((p) => {
        const intl = toIntlDigits(p.phone)
        return (
          <div key={p.parent_id} className="flex flex-wrap items-center gap-2">
            <div className="min-w-0">
              <div className="text-[14px]">{p.full_name ?? p.email}</div>
              <div className="tnum text-[12px] text-ink-faint">
                {p.phone ?? 'No phone on file'}
              </div>
            </div>

            <div className="ml-auto flex gap-1.5 shrink-0">
              {intl && (
                <>
                  <a
                    href={`tel:+${intl}`}
                    className="inline-flex items-center h-8 px-3 rounded-md border
                               border-rule-strong bg-surface text-[12px] font-semibold
                               hover:border-ink-faint transition-colors"
                  >
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${intl}?text=${encodeURIComponent(note)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center h-8 px-3 rounded-md bg-brass text-ink
                               text-[12px] font-semibold hover:bg-brass-dark
                               hover:text-ink-invert transition-colors"
                  >
                    WhatsApp
                  </a>
                </>
              )}
              {!intl && p.email && (
                <a
                  href={`mailto:${p.email}`}
                  className="inline-flex items-center h-8 px-3 rounded-md border
                             border-rule-strong bg-surface text-[12px] font-semibold
                             hover:border-ink-faint transition-colors"
                >
                  Email
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
