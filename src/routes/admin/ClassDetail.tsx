import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import {
  Alert,
  Button,
  Empty,
  Modal,
  Panel,
  Row,
  Spinner,
  TextArea,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'
import {
  addStudents,
  generateClaimCode,
  getClass,
  listClassTeachers,
  listOpenCodes,
  listStudents,
  type StudentRow,
} from '../../lib/queries'

export default function ClassDetail() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const [cls, setCls] = useState<Record<string, unknown> | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, s, t] = await Promise.all([getClass(id), listStudents(id), listClassTeachers(id)])
      setCls(c)
      setStudents(s)
      setTeachers(t)
      setCodes(await listOpenCodes(s.map((x) => x.id)))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function makeCode(studentId: string) {
    setCodeError(null)
    try {
      const code = await generateClaimCode(studentId)
      setCodes((c) => ({ ...c, [studentId]: code }))
    } catch (e) {
      // Supabase errors are objects. String() on them gives [object Object],
      // which tells nobody anything.
      const err = e as { message?: string; hint?: string; details?: string }
      setCodeError(err?.message ?? err?.details ?? 'Could not generate a code.')
    }
  }

  const unlinked = students.filter((s) => s.linked_parents === 0).length

  return (
    <AppShell>
      <div className="mb-5">
        <Link to="/admin/classes" className="eyebrow hover:text-ink transition-colors">
          &larr; Classes
        </Link>
        <h1 className="text-[26px] mt-1.5">{(cls?.name as string) ?? ''}</h1>
        <p className="text-[13px] text-ink-faint mt-1">
          <span className="tnum">{students.length}</span> students
          {unlinked > 0 && (
            <>
              {', '}
              <span className="tnum text-absent">{unlinked}</span> without a parent linked
            </>
          )}
        </p>
      </div>

      <div className="space-y-4">
        <Panel
          title="Students"
          action={
            <button
              onClick={() => setAddOpen(true)}
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
            >
              Add
            </button>
          }
        >
          {codeError && (
            <div className="mb-3">
              <Alert>{codeError}</Alert>
            </div>
          )}
          {loading ? (
            <Spinner />
          ) : students.length === 0 ? (
            <Empty
              line="No students in this class yet. Paste the whole class list at once."
              action={<Button onClick={() => setAddOpen(true)}>Add students</Button>}
            />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {students.map((s) => (
                <Row
                  key={s.id}
                  left={
                    <>
                      <div className="text-[15px]">
                        {s.last_name}, {s.first_name}
                      </div>
                      <div className="text-[12px] text-ink-faint">
                        {s.linked_parents > 0
                          ? `${s.linked_parents} parent linked`
                          : 'No parent linked'}
                      </div>
                    </>
                  }
                  right={
                    codes[s.id] ? (
                      <CodeChip code={codes[s.id]} />
                    ) : s.linked_parents > 0 ? (
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-present">
                        Linked
                      </span>
                    ) : (
                      <Button variant="secondary" onClick={() => void makeCode(s.id)}>
                        Get code
                      </Button>
                    )
                  }
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Teachers">
          {teachers.length === 0 ? (
            <Empty line="No teacher assigned to this class yet. Invite teachers, then assign them here." />
          ) : (
            <div className="divide-y divide-rule -my-3">
              {teachers.map((t) => {
                const p = t.profiles as { full_name?: string; email?: string } | null
                return (
                  <Row
                    key={t.id as string}
                    left={
                      <>
                        <div className="text-[15px]">{p?.full_name ?? p?.email ?? 'Teacher'}</div>
                        <div className="text-[12px] text-ink-faint">
                          {(t.subject as string) ?? 'All subjects'}
                          {t.is_form_teacher ? ' \u00b7 Form teacher' : ''}
                        </div>
                      </>
                    }
                  />
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      <AddStudentsModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        schoolId={profile?.school_id ?? ''}
        classId={id}
        onSaved={() => {
          setAddOpen(false)
          void load()
        }}
      />
    </AppShell>
  )
}

function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
      className="font-mono text-[12px] tracking-[0.14em] px-2 h-7 rounded-sm border
                 border-brass/40 bg-brass-wash text-ink hover:border-brass transition-colors"
      title="Copy code"
    >
      {copied ? 'Copied' : code}
    </button>
  )
}

function AddStudentsModal({
  open,
  onClose,
  schoolId,
  classId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  classId: string
  onSaved: () => void
}) {
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const parsed = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const clean = line.replace(/^\d+[.)]\s*/, '')
      const parts = clean.split(/\s+/)
      if (parts.length === 1) return { first: parts[0], last: '' }
      return { last: parts[0].replace(/,$/, ''), first: parts.slice(1).join(' ') }
    })

  async function save() {
    setError(null)
    if (parsed.length === 0) return setError('Nothing to add.')
    setBusy(true)
    const { error } = await addStudents(schoolId, classId, parsed)
    setBusy(false)
    if (error) return setError(error.message)
    setRaw('')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add students">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <TextArea
          label="Class list"
          rows={8}
          placeholder={'Okafor Ada\nAdeyemi Bola\nEze Chidi'}
          hint="One student per line, surname first. Numbered lists are fine, the numbers are stripped."
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        {parsed.length > 0 && (
          <div className="border border-rule rounded-md p-3 max-h-40 overflow-y-auto">
            <span className="eyebrow">Preview, {parsed.length}</span>
            <ul className="mt-2 space-y-1">
              {parsed.slice(0, 30).map((p, i) => (
                <li key={i} className="text-[13px]">
                  {p.last}
                  {p.last && ', '}
                  {p.first}
                </li>
              ))}
              {parsed.length > 30 && (
                <li className="text-[12px] text-ink-faint">and {parsed.length - 30} more</li>
              )}
            </ul>
          </div>
        )}
        <Button type="submit" full loading={busy}>
          Add {parsed.length > 0 ? parsed.length : ''} students
        </Button>
      </form>
    </Modal>
  )
}
