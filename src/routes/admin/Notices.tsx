import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import {
  Alert,
  Button,
  Empty,
  Field,
  Modal,
  Panel,
  Spinner,
  TextArea,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { listNotices, postNotice, type Notice } from '../../lib/parent'
import { listClasses, type ClassRow } from '../../lib/queries'

export default function AdminNotices() {
  const { profile, session } = useAuth()
  const [rows, setRows] = useState<Notice[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [n, c] = await Promise.all([listNotices(), listClasses()])
      setRows(n)
      setClasses(c)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Announcements</span>
          <h1 className="text-[26px] mt-1">Notices</h1>
        </div>
        <Button onClick={() => setOpen(true)}>Post</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Panel>
          <Empty
            line="Nothing posted yet. A notice reaches every parent in the school, or just one class."
            action={<Button onClick={() => setOpen(true)}>Post the first notice</Button>}
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <Panel key={n.id}>
              <div className="flex items-baseline gap-2">
                <span className="eyebrow">
                  {n.class_id
                    ? classes.find((c) => c.id === n.class_id)?.name ?? 'Class'
                    : 'Whole school'}
                </span>
                <span className="tnum text-[11px] text-ink-faint ml-auto">
                  {n.published_at.slice(0, 10)}
                </span>
              </div>
              <h2 className="text-[17px] mt-1.5">{n.title}</h2>
              <p className="text-[14px] text-ink-soft mt-1.5 leading-relaxed whitespace-pre-line">
                {n.body}
              </p>
            </Panel>
          ))}
        </div>
      )}

      <PostModal
        open={open}
        onClose={() => setOpen(false)}
        classes={classes}
        schoolId={profile?.school_id ?? ''}
        userId={session?.user.id ?? ''}
        onSaved={() => {
          setOpen(false)
          void load()
        }}
      />
    </AppShell>
  )
}

function PostModal({
  open,
  onClose,
  classes,
  schoolId,
  userId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  classes: ClassRow[]
  schoolId: string
  userId: string
  onSaved: () => void
}) {
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    if (!title.trim() || !body.trim()) return setError('A notice needs a title and a message.')
    setBusy(true)
    const { error } = await postNotice(schoolId, classId || null, title, body, userId)
    setBusy(false)
    if (error) return setError(error.message)
    setTitle('')
    setBody('')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="New notice">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}

        <label className="block">
          <span className="eyebrow block mb-1.5">Who sees this</span>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full h-11 px-3 bg-surface border border-rule-strong rounded-md
                       text-[15px] text-ink focus:border-brass"
          >
            <option value="">Every parent in the school</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} only
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Title"
          required
          placeholder="Mid-term break"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextArea
          label="Message"
          rows={5}
          required
          placeholder="School closes on Friday and resumes the following Monday."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" full loading={busy}>
          Post notice
        </Button>
      </form>
    </Modal>
  )
}
