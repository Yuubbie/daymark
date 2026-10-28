import { useEffect, useState } from 'react'
import { Alert, Button, Field, Modal } from './ui'
import {
  deleteTimetableSlot,
  insertTimetableSlot,
  updateTimetableSlot,
  type TimetableSlot,
} from '../lib/queries'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function TimetableSlotModal({
  open,
  onClose,
  schoolId,
  classId,
  teachers,
  defaultTeacherId,
  slot,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  classId: string
  teachers: Record<string, unknown>[]
  defaultTeacherId?: string
  slot?: TimetableSlot | null
  onSaved: () => void
}) {
  const [day, setDay] = useState('1')
  const [period, setPeriod] = useState('1')
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('08:40')
  const [subject, setSubject] = useState('')
  const [teacherId, setTeacherId] = useState(defaultTeacherId ?? '')
  const [room, setRoom] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (slot) {
      setDay(String(slot.day_of_week))
      setPeriod(String(slot.period))
      setStart(slot.start_time.slice(0, 5))
      setEnd(slot.end_time.slice(0, 5))
      setSubject(slot.subject)
      setTeacherId(slot.teacher_id ?? '')
      setRoom(slot.room ?? '')
    } else {
      setDay('1')
      setPeriod('1')
      setStart('08:00')
      setEnd('08:40')
      setSubject('')
      setTeacherId(defaultTeacherId ?? '')
      setRoom('')
    }
  }, [open, slot, defaultTeacherId])

  async function save() {
    setError(null)
    if (!subject.trim()) return setError('Name the subject.')
    setBusy(true)
    try {
      const body = {
        dayOfWeek: Number(day),
        period: Number(period),
        start,
        end,
        subject: subject.trim(),
        teacherId: teacherId || null,
        room: room || null,
      }
      if (slot) {
        await updateTimetableSlot(slot.id, body)
      } else {
        await insertTimetableSlot({ schoolId, classId, ...body })
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!slot) return
    if (!confirm('Remove this period from the week?')) return
    setRemoving(true)
    setError(null)
    try {
      await deleteTimetableSlot(slot.id)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={slot ? 'Edit period' : 'Add a period'}>
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
          {slot ? 'Save period' : 'Add period'}
        </Button>
        {slot && (
          <Button type="button" variant="danger" full loading={removing} onClick={() => void remove()}>
            Remove period
          </Button>
        )}
      </form>
    </Modal>
  )
}
