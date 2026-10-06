import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { TimetableSlotModal } from '../../components/TimetableSlotModal'
import { Button, Empty, Panel, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listTeachableClasses, type TeachableClass } from '../../lib/attendance'
import {
  listTeachers,
  listTimetableForClass,
  listTimetableForTeacher,
  type TimetableSlot,
} from '../../lib/queries'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function TeacherTimetable() {
  const { profile, session } = useAuth()
  const [mine, setMine] = useState<TimetableSlot[]>([])
  const [classes, setClasses] = useState<TeachableClass[]>([])
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([])
  const [classId, setClassId] = useState('')
  const [classSlots, setClassSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  async function reloadMine() {
    if (!session) return
    setMine(await listTimetableForTeacher(session.user.id).catch(() => [] as TimetableSlot[]))
  }

  async function reloadClass(id: string) {
    if (!id) {
      setClassSlots([])
      return
    }
    setClassSlots(await listTimetableForClass(id).catch(() => [] as TimetableSlot[]))
  }

  useEffect(() => {
    if (!profile || !session) return
    void (async () => {
      const [slots, cs, ts] = await Promise.all([
        listTimetableForTeacher(session.user.id).catch(() => [] as TimetableSlot[]),
        listTeachableClasses(profile.role, session.user.id).catch(() => [] as TeachableClass[]),
        listTeachers().catch(() => [] as Record<string, unknown>[]),
      ])
      setMine(slots)
      setClasses(cs)
      setTeachers(
        ts.length > 0
          ? ts
          : [{ id: session.user.id, full_name: profile.full_name, email: profile.email }],
      )
      setClassId(cs[0]?.id ?? '')
      setLoading(false)
    })()
  }, [profile, session])

  useEffect(() => {
    void reloadClass(classId)
  }, [classId])

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">This week</span>
          <h1 className="text-[26px] mt-1">Your timetable</h1>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!classId}>
          Add period
        </Button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <Panel title="Your periods">
            {mine.length === 0 ? (
              <Empty line="Nothing on your week yet. Add a period for a class you teach." />
            ) : (
              <SlotTable slots={mine} showClass />
            )}
          </Panel>

          {classes.length > 0 && (
            <Panel title="Class week">
              <select
                className="mb-3 h-11 px-3 bg-surface border border-rule-strong rounded-md w-full"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {classSlots.length === 0 ? (
                <Empty line="This class has no timetable yet." />
              ) : (
                <SlotTable slots={classSlots} />
              )}
            </Panel>
          )}
        </div>
      )}

      <TimetableSlotModal
        open={open}
        onClose={() => setOpen(false)}
        schoolId={profile?.school_id ?? ''}
        classId={classId}
        teachers={teachers}
        defaultTeacherId={session?.user.id}
        onSaved={async () => {
          setOpen(false)
          await Promise.all([reloadMine(), reloadClass(classId)])
        }}
      />
    </AppShell>
  )
}

function SlotTable({ slots, showClass }: { slots: TimetableSlot[]; showClass?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            <th className="text-left py-2">Day</th>
            <th className="text-left">Period</th>
            <th className="text-left">Time</th>
            <th className="text-left">Subject</th>
            {showClass && <th className="text-left">Class</th>}
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
              {showClass && <td>{s.class_name ?? '—'}</td>}
              <td>{s.room ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
