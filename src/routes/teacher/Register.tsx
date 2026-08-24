import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button, Empty, Panel, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  defaultClass,
  flushWrites,
  listTeachableClasses,
  rememberClass,
  loadRegister,
  saveMarks,
  type RegisterStudent,
  type TeachableClass,
} from '../../lib/attendance'
import { queueSize, watchConnection } from '../../lib/offline'
import type { AttendanceStatus } from '../../lib/types'

/* ---------------------------------------------------------------------------
   The register.

   The whole class on one screen, four taps wide. "All present" first, then the
   teacher corrects the two or three exceptions. That is the twenty second flow
   the entire product depends on, every school morning.
--------------------------------------------------------------------------- */

const OPTIONS: { key: AttendanceStatus; label: string; cls: string }[] = [
  { key: 'present', label: 'P', cls: 'bg-present text-ink-invert border-present' },
  { key: 'late', label: 'L', cls: 'bg-late text-ink border-late' },
  { key: 'absent', label: 'A', cls: 'bg-absent text-ink-invert border-absent' },
  { key: 'excused', label: 'E', cls: 'bg-excused text-ink-invert border-excused' },
]

function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default function Register() {
  const { profile, session } = useAuth()
  const [classes, setClasses] = useState<TeachableClass[]>([])
  const [classId, setClassId] = useState<string>('')
  const [date, setDate] = useState(todayISO())
  const [students, setStudents] = useState<RegisterStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'queued'>('idle')
  const [pending, setPending] = useState(queueSize())
  const dirty = useRef<Map<string, AttendanceStatus>>(new Map())
  const timer = useRef<number | null>(null)

  // Classes this person can mark
  useEffect(() => {
    if (!profile || !session) return
    void (async () => {
      try {
        const cs = await listTeachableClasses(profile.role, session.user.id)
        setClasses(cs)
        setClassId((c) => c || defaultClass(session.user.id, cs))
        if (cs.length === 0) setLoading(false)
      } catch {
        setLoading(false)
        setLoadError('Could not load your classes. Check your connection.')
      }
    })()
  }, [profile, session])

  const load = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    setLoadError(null)
    try {
      const { students: rows, fromCache } = await loadRegister(classId, date)
      setStudents(rows)
      setStale(fromCache)
    } catch {
      // No network and no saved copy for this class and date.
      setStudents([])
      setStale(false)
      setLoadError(
        navigator.onLine
          ? 'Could not load the register. Try again in a moment.'
          : 'You are offline and this register has not been opened on this device before, so there is no saved copy to show.',
      )
    } finally {
      setLoading(false)
    }
  }, [classId, date])

  useEffect(() => {
    void load()
  }, [load])

  // Retry anything stuck in the local queue
  useEffect(() => {
    const flush = async () => {
      const n = await flushWrites()
      if (n > 0) void load()
      setPending(queueSize())
    }
    void flush()
    return watchConnection(() => void flush())
  }, [load])

  /** Debounced write. Taps feel instant, the network catches up. */
  const scheduleSave = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      if (dirty.current.size === 0) return
      const batch = Array.from(dirty.current, ([student_id, status]) => ({ student_id, status }))
      dirty.current.clear()
      setState('saving')
      const result = await saveMarks(
        profile?.school_id ?? '',
        classId,
        date,
        session?.user.id ?? '',
        batch,
      )
      setState(result)
      setPending(queueSize())
      window.setTimeout(() => setState('idle'), 2200)
    }, 700)
  }, [classId, date, profile, session])

  function mark(studentId: string, status: AttendanceStatus) {
    setStudents((rows) =>
      rows.map((r) => (r.id === studentId ? { ...r, status } : r)),
    )
    dirty.current.set(studentId, status)
    scheduleSave()
  }

  function markAllPresent() {
    setStudents((rows) =>
      rows.map((r) => {
        if (r.status === null) dirty.current.set(r.id, 'present')
        return r.status === null ? { ...r, status: 'present' as AttendanceStatus } : r
      }),
    )
    scheduleSave()
  }

  const marked = students.filter((s) => s.status !== null).length
  const cls = classes.find((c) => c.id === classId)

  return (
    <AppShell>
      <div className="mb-4">
        <span className="eyebrow">Register</span>
        <h1 className="text-[26px] mt-1">
          {new Date(date + 'T00:00:00').toLocaleDateString('en-NG', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h1>
      </div>

      {classes.length === 0 && !loading ? (
        <Panel>
          <Empty line="You are not assigned to any class yet. Ask your school admin to add you to one." />
        </Panel>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                if (session) rememberClass(session.user.id, e.target.value)
              }}
              className="h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]
                         text-ink focus:border-brass"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 px-3 bg-surface border border-rule-strong rounded-md text-[15px]
                         text-ink font-mono focus:border-brass"
            />
          </div>

          <Panel
            title={`${cls?.name ?? ''} \u00b7 ${marked} of ${students.length} marked`}
            action={
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                {state === 'saving' && <span className="text-ink-faint">Saving</span>}
                {state === 'saved' && <span className="text-present">Saved</span>}
                {state === 'queued' && <span className="text-late">Queued offline</span>}
              </span>
            }
          >
            {loading ? (
              <Spinner />
            ) : loadError ? (
              <div className="py-8 text-center">
                <p className="text-[14px] text-ink-soft max-w-[40ch] mx-auto">{loadError}</p>
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => void load()}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : students.length === 0 ? (
              <Empty line="No students in this class yet. An admin can add them on the class page." />
            ) : (
              <>
                {stale && (
                  <div className="mb-3 border border-late/40 bg-late/8 rounded-md px-3 py-2.5">
                    <p className="text-[13px] text-ink">
                      Showing the saved copy on this device. Your marks are safe and will send
                      when you are back online.
                    </p>
                  </div>
                )}
                {marked < students.length && (
                  <div className="mb-3">
                    <Button onClick={markAllPresent} full>
                      Mark the rest present
                    </Button>
                  </div>
                )}

                <div className="divide-y divide-rule -my-2">
                  {students.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-2.5">
                      <span className="text-[15px] min-w-0 truncate">
                        {s.last_name}, {s.first_name}
                      </span>
                      <div className="ml-auto flex gap-1.5 shrink-0">
                        {OPTIONS.map((o) => {
                          const on = s.status === o.key
                          return (
                            <button
                              key={o.key}
                              onClick={() => mark(s.id, o.key)}
                              aria-label={`${s.first_name} ${o.key}`}
                              aria-pressed={on}
                              className={`h-10 w-10 rounded-md border font-mono text-[13px] font-semibold
                                transition-colors
                                ${on
                                  ? o.cls
                                  : 'bg-surface border-rule-strong text-ink-faint hover:border-ink-faint'}`}
                            >
                              {o.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>

          {pending > 0 && (
            <p className="mt-3 text-[12px] text-late">
              {pending} {pending === 1 ? 'write' : 'writes'} waiting for a connection. They will
              send themselves when you are back online.
            </p>
          )}
        </>
      )}
    </AppShell>
  )
}
