import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { TimetableSlotModal } from '../../components/TimetableSlotModal'
import { Alert, Button, Empty, Panel, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listClasses, listTeachers, listTimetableForClass, type ClassRow, type TimetableSlot } from '../../lib/queries'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function Timetable() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([])
  const [classId, setClassId] = useState('')
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const [c, t] = await Promise.all([listClasses(), listTeachers()])
      setClasses(c)
      setTeachers(t)
      setClassId(c[0]?.id ?? '')
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!classId) return
    void (async () => {
      try {
        setSlots(await listTimetableForClass(classId))
        setError(null)
      } catch (e) {
        setError((e as Error).message)
      }
    })()
  }, [classId])

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Week</span>
          <h1 className="text-[26px] mt-1">Timetable</h1>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!classId}>
          Add period
        </Button>
      </div>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : classes.length === 0 ? (
        <Empty line="Create a class first, then build its week." />
      ) : (
        <>
          <select
            className="mb-4 h-11 px-3 bg-surface border border-rule-strong rounded-md"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Panel title={classes.find((c) => c.id === classId)?.name ?? 'Class'}>
            {slots.length === 0 ? (
              <Empty line="No periods yet. Add Monday first period, then the rest of the week." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      <th className="text-left py-2">Day</th>
                      <th className="text-left">Period</th>
                      <th className="text-left">Time</th>
                      <th className="text-left">Subject</th>
                      <th className="text-left">Room</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {slots.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2">{DAYS[s.day_of_week - 1] ?? s.day_of_week}</td>
                        <td className="tnum">{s.period}</td>
                        <td className="tnum">
                          {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </td>
                        <td>{s.subject}</td>
                        <td>{s.room ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
      <TimetableSlotModal
        open={open}
        onClose={() => setOpen(false)}
        schoolId={profile?.school_id ?? ''}
        classId={classId}
        teachers={teachers}
        onSaved={async () => {
          setOpen(false)
          setSlots(await listTimetableForClass(classId))
        }}
      />
    </AppShell>
  )
}
