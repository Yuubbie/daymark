import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Alert, Button, Empty, Field, Modal, Panel, Spinner } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listClasses, listTeachers, type ClassRow } from '../../lib/queries'
import { supabase } from '../../lib/supabase'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

type Slot = {
  id: string
  class_id: string
  day_of_week: number
  period: number
  start_time: string
  end_time: string
  subject: string
  teacher_id: string | null
  room: string | null
}

export default function Timetable() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([])
  const [classId, setClassId] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
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
      const { data, error: err } = await supabase
        .from('timetable_slots')
        .select('id, class_id, day_of_week, period, start_time, end_time, subject, teacher_id, room')
        .eq('class_id', classId)
        .order('day_of_week')
        .order('period')
      if (err) setError(err.message)
      else setSlots((data ?? []) as Slot[])
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
      <SlotModal
        open={open}
        onClose={() => setOpen(false)}
        schoolId={profile?.school_id ?? ''}
        classId={classId}
        teachers={teachers}
        onSaved={async () => {
          setOpen(false)
          const { data } = await supabase
            .from('timetable_slots')
            .select('id, class_id, day_of_week, period, start_time, end_time, subject, teacher_id, room')
            .eq('class_id', classId)
            .order('day_of_week')
            .order('period')
          setSlots((data ?? []) as Slot[])
        }}
      />
    </AppShell>
  )
}

function SlotModal({
  open,
  onClose,
  schoolId,
  classId,
  teachers,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  classId: string
  teachers: Record<string, unknown>[]
  onSaved: () => void
}) {
  const [day, setDay] = useState('1')
  const [period, setPeriod] = useState('1')
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('08:40')
  const [subject, setSubject] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [room, setRoom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    if (!subject.trim()) return setError('Name the subject.')
    setBusy(true)
    const { error: err } = await supabase.from('timetable_slots').insert({
      school_id: schoolId,
      class_id: classId,
      day_of_week: Number(day),
      period: Number(period),
      start_time: start,
      end_time: end,
      subject: subject.trim(),
      teacher_id: teacherId || null,
      room: room || null,
    })
    setBusy(false)
    if (err) return setError(err.message)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a period">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <label className="block">
          <span className="eyebrow block mb-1.5">Day</span>
          <select
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <Field label="Period" type="number" min={1} value={period} onChange={(e) => setPeriod(e.target.value)} />
        <Field label="Starts" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <Field label="Ends" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Field label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <label className="block">
          <span className="eyebrow block mb-1.5">Teacher</span>
          <select
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t.id as string} value={t.id as string}>
                {(t.full_name as string) ?? (t.email as string)}
              </option>
            ))}
          </select>
        </label>
        <Field label="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
        <Button type="submit" full loading={busy}>
          Add period
        </Button>
      </form>
    </Modal>
  )
}
