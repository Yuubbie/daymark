import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import {
  Alert,
  Button,
  Empty,
  Field,
  Modal,
  Panel,
  Row,
  Spinner,
  TextArea,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import StudentPhotoUpload from '../../components/StudentPhotoUpload'
import {
  addStudents,
  assignTeacher,
  generateClaimCode,
  generateClaimCodesForClass,
  getClass,
  listClassTeachers,
  listOpenCodes,
  listStudents,
  listTeachers,
  type StudentRow,
} from '../../lib/queries'
import { parseStudentSheet, type ParsedStudent } from '../../lib/importStudents'

export default function ClassDetail() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const [cls, setCls] = useState<Record<string, unknown> | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [teachers, setTeachers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [allTeachers, setAllTeachers] = useState<Record<string, unknown>[]>([])
  const [codeError, setCodeError] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [photoStudent, setPhotoStudent] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, s, t, all] = await Promise.all([
        getClass(id),
        listStudents(id),
        listClassTeachers(id),
        listTeachers(),
      ])
      setCls(c)
      setStudents(s)
      setTeachers(t)
      setAllTeachers(all)
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

  const unlinkedStudents = students.filter((s) => s.linked_parents === 0 && !codes[s.id])
  const unlinked = students.filter((s) => s.linked_parents === 0).length

  async function makeCodesForClass() {
    setCodeError(null)
    setBulkBusy(true)
    const results = await generateClaimCodesForClass(unlinkedStudents.map((s) => s.id))
    setBulkBusy(false)

    const nextCodes = { ...codes }
    let failCount = 0
    for (const r of results) {
      if (r.code) nextCodes[r.studentId] = r.code
      else failCount++
    }
    setCodes(nextCodes)
    if (failCount > 0) {
      setCodeError(`${failCount} of ${results.length} codes could not be generated.`)
    }
    if (results.some((r) => r.code)) setSheetOpen(true)
  }

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

          {students.length > 0 && (unlinkedStudents.length > 0 || Object.keys(codes).length > 0) && (
            <div className="flex items-center gap-2.5 mb-3.5 pb-3.5 border-b border-rule">
              {unlinkedStudents.length > 0 && (
                <Button variant="secondary" loading={bulkBusy} onClick={() => void makeCodesForClass()}>
                  Generate {unlinkedStudents.length} code{unlinkedStudents.length === 1 ? '' : 's'}
                </Button>
              )}
              {Object.keys(codes).length > 0 && (
                <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                  View / print codes
                </Button>
              )}
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPhotoStudent({ id: s.id, name: `${s.first_name} ${s.last_name}` })
                        }
                        className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
                      >
                        Photo
                      </button>
                      {codes[s.id] ? (
                        <CodeChip code={codes[s.id]} />
                      ) : s.linked_parents > 0 ? (
                        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-present">
                          Linked
                        </span>
                      ) : (
                        <Button variant="secondary" onClick={() => void makeCode(s.id)}>
                          Get code
                        </Button>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Teachers"
          action={
            allTeachers.length > 0 && (
              <button
                onClick={() => setAssignOpen(true)}
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint hover:text-ink"
              >
                Assign
              </button>
            )
          }
        >
          {teachers.length === 0 ? (
            allTeachers.length === 0 ? (
              <Empty line="No teachers have signed up yet. Invite them from Staff, then assign them here." />
            ) : (
              <Empty
                line="No teacher assigned to this class yet."
                action={<Button onClick={() => setAssignOpen(true)}>Assign a teacher</Button>}
              />
            )
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
        existingStudents={students}
        onSaved={() => {
          setAddOpen(false)
          void load()
        }}
      />

      <CodesSheetModal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        className={(cls?.name as string) ?? ''}
        rows={students
          .filter((s) => codes[s.id])
          .map((s) => ({ name: `${s.first_name} ${s.last_name}`, code: codes[s.id] }))}
      />

      <AssignTeacherModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        schoolId={profile?.school_id ?? ''}
        classId={id}
        teachers={allTeachers}
        onSaved={() => {
          setAssignOpen(false)
          void load()
        }}
      />

      <PhotoModal
        student={photoStudent}
        onClose={() => setPhotoStudent(null)}
      />
    </AppShell>
  )
}

/**
 * Small modal wrapping StudentPhotoUpload. Fetches the student's current
 * photo_url fresh on open (rather than relying on StudentRow already
 * having it), uploads to the "student-photos" Storage bucket, and writes
 * the resulting public URL back to students.photo_url.
 */
function PhotoModal({
  student,
  onClose,
}: {
  student: { id: string; name: string } | null
  onClose: () => void
}) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!student) return
    setLoading(true)
    setCurrentUrl(null)
    supabase
      .from('students')
      .select('photo_url')
      .eq('id', student.id)
      .single()
      .then(({ data }) => {
        setCurrentUrl((data?.photo_url as string) ?? null)
        setLoading(false)
      })
  }, [student])

  if (!student) return null

  return (
    <Modal open={!!student} onClose={onClose} title={`Photo — ${student.name}`}>
      {loading ? (
        <Spinner />
      ) : (
        <StudentPhotoUpload
          studentId={student.id}
          currentPhotoUrl={currentUrl}
          onUploaded={(url) => setCurrentUrl(url)}
        />
      )}
    </Modal>
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

/**
 * Print-friendly sheet of every generated code in this class, plus a CSV
 * export. This is the thing an admin actually hands to staff: cut into
 * slips, one per child, sent home. Without this, a bulk-generated batch of
 * 40 codes is just 40 rows nobody can act on.
 */
function CodesSheetModal({
  open,
  onClose,
  className,
  rows,
}: {
  open: boolean
  onClose: () => void
  className: string
  rows: { name: string; code: string }[]
}) {
  function downloadCsv() {
    const header = 'Student,Claim Code\n'
    const body = rows.map((r) => `"${r.name.replace(/"/g, '""')}",${r.code}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${className || 'class'}-claim-codes.csv`.replace(/\s+/g, '-').toLowerCase()
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal open={open} onClose={onClose} title={`${className} â€” claim codes`}>
      <div className="flex items-center justify-between mb-3.5 print:hidden">
        <p className="text-[13px] text-ink-faint">
          {rows.length} code{rows.length === 1 ? '' : 's'}. Print this and cut into slips, or
          export as a spreadsheet.
        </p>
        <div className="flex gap-2 shrink-0 ml-3">
          <Button variant="secondary" onClick={downloadCsv}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>
      <div className="border border-rule rounded-md max-h-[50vh] overflow-y-auto print:max-h-none print:border-0">
        <table className="w-full text-[13px]">
          <thead className="print:table-header-group">
            <tr className="border-b border-rule text-left">
              <th className="py-2 px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                Student
              </th>
              <th className="py-2 px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                Code
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-b border-rule last:border-0 print:break-inside-avoid">
                <td className="py-2 px-3">{r.name}</td>
                <td className="py-2 px-3 font-mono tracking-[0.14em]">{r.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

/**
 * Wires the already-existing assignTeacher() function to an actual screen.
 * A teacher can be assigned more than once to the same class under a
 * different subject â€” the unique constraint is (class_id, teacher_id,
 * subject), so we don't filter the teacher list down, we just surface a
 * clear message if the exact same pairing already exists.
 */
function AssignTeacherModal({
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
  // teachers loads asynchronously after this component has already mounted,
  // so the default can't be captured once in useState â€” it's derived fresh
  // every render instead, falling back to the first teacher only until the
  // person actually picks one themselves.
  const [pickedTeacherId, setPickedTeacherId] = useState('')
  const teacherId = pickedTeacherId || (teachers[0]?.id as string) || ''
  const [subject, setSubject] = useState('')
  const [isForm, setIsForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setError(null)
    if (!teacherId) return setError('Pick a teacher.')
    if (!isForm && !subject.trim()) return setError('Which subject, or mark as form teacher.')
    setBusy(true)
    const { error } = await assignTeacher(schoolId, classId, teacherId, subject, isForm)
    setBusy(false)
    if (error) {
      return setError(
        /duplicate key/i.test(error.message)
          ? 'This teacher is already assigned to that subject in this class.'
          : error.message,
      )
    }
    setSubject('')
    setIsForm(false)
    setPickedTeacherId('')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign a teacher">
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}

        <div>
          <span className="eyebrow">Teacher</span>
          <select
            value={teacherId}
            onChange={(e) => setPickedTeacherId(e.target.value)}
            className="mt-1.5 w-full h-11 px-3 border border-rule-strong rounded-md bg-surface text-[14px]"
          >
            {teachers.map((t) => (
              <option key={t.id as string} value={t.id as string}>
                {(t.full_name as string) || (t.email as string)}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Subject"
          placeholder="Mathematics"
          hint={isForm ? 'Optional for a form teacher.' : 'Required.'}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <label className="flex items-center gap-2.5 text-[13px] text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={isForm}
            onChange={(e) => setIsForm(e.target.checked)}
          />
          Form / class teacher for this class
        </label>

        <Button type="submit" full loading={busy}>
          Assign
        </Button>
      </form>
    </Modal>
  )
}

function AddStudentsModal({
  open,
  onClose,
  schoolId,
  classId,
  existingStudents,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  schoolId: string
  classId: string
  existingStudents: StudentRow[]
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'paste' | 'file'>('paste')

  // --- paste mode ---
  const [raw, setRaw] = useState('')
  const pasted: ParsedStudent[] = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const clean = line.replace(/^\d+[.)]\s*/, '')
      const parts = clean.split(/\s+/)
      if (parts.length === 1) return { first: parts[0], last: '' }
      return { last: parts[0].replace(/,$/, ''), first: parts.slice(1).join(' ') }
    })

  // --- file mode ---
  const [fileName, setFileName] = useState('')
  const [fromFile, setFromFile] = useState<ParsedStudent[]>([])
  const [usedHeader, setUsedHeader] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [includeDuplicates, setIncludeDuplicates] = useState(false)

  const parsed = mode === 'paste' ? pasted : fromFile

  // Same student showing up twice does real harm here: two profiles for one
  // child means a parent's claim code can land on the wrong record, and the
  // admin has no easy way to notice until a parent complains. Caught before
  // save, once, is much cheaper than untangling it after.
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  const existingNames = new Set(
    existingStudents.map((s) => norm(`${s.last_name} ${s.first_name}`)),
  )
  const existingAdmissions = new Set(
    existingStudents.map((s) => s.admission_number).filter((a): a is string => !!a),
  )
  const seenInThisBatch = new Set<string>()

  const withDuplicateFlag = parsed.map((p) => {
    const nameKey = norm(`${p.last} ${p.first}`)
    const isDuplicate =
      existingNames.has(nameKey) ||
      (!!p.admission_number && existingAdmissions.has(p.admission_number)) ||
      seenInThisBatch.has(nameKey)
    seenInThisBatch.add(nameKey)
    return { ...p, isDuplicate }
  })

  const duplicateCount = withDuplicateFlag.filter((p) => p.isDuplicate).length
  const toSubmit = includeDuplicates
    ? parsed
    : withDuplicateFlag.filter((p) => !p.isDuplicate)

  async function handleFile(f: File) {
    setFileError(null)
    setFileName(f.name)
    try {
      const buf = await f.arrayBuffer()
      const { students, usedHeader } = await parseStudentSheet(buf)
      if (students.length === 0) {
        setFileError('No rows found in that file. Check it has at least one name in it.')
      }
      setFromFile(students)
      setUsedHeader(usedHeader)
    } catch {
      setFileError('Could not read that file. Make sure it is a real .xlsx, .xls, or .csv file.')
      setFromFile([])
    }
  }

  function downloadTemplate() {
    const csv = 'Surname,First Name,Admission Number\nOkafor,Ada,BFA-0001\nAdeyemi,Bola,BFA-0002\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function save() {
    setError(null)
    if (toSubmit.length === 0) {
      return setError(
        duplicateCount > 0
          ? 'Everything here already looks like it is in this class.'
          : 'Nothing to add.',
      )
    }
    setBusy(true)
    const { error } = await addStudents(schoolId, classId, toSubmit)
    setBusy(false)
    if (error) {
      return setError(
        /duplicate key/i.test(error.message)
          ? 'One of these admission numbers is already used in this school. Check for a repeated row.'
          : error.message,
      )
    }
    setRaw('')
    setFromFile([])
    setFileName('')
    setIncludeDuplicates(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add students">
      <div className="flex gap-1 mb-4 p-1 bg-surface-alt rounded-md w-fit">
        {(['paste', 'file'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 h-8 rounded text-[13px] font-medium transition-colors ${
              mode === m ? 'bg-surface shadow-sm text-ink' : 'text-ink-faint hover:text-ink-soft'
            }`}
          >
            {m === 'paste' ? 'Paste a list' : 'Upload a file'}
          </button>
        ))}
      </div>

      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        {error && <Alert>{error}</Alert>}

        {mode === 'paste' ? (
          <TextArea
            label="Class list"
            rows={8}
            placeholder={'Okafor Ada\nAdeyemi Bola\nEze Chidi'}
            hint="One student per line, surname first. Numbered lists are fine, the numbers are stripped."
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
        ) : (
          <div className="space-y-2.5">
            <div>
              <span className="eyebrow">Spreadsheet file</span>
              <label
                className="mt-1.5 flex items-center justify-center h-24 border-2 border-dashed
                           border-rule-strong rounded-md cursor-pointer hover:border-brass
                           transition-colors text-center px-4"
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleFile(f)
                  }}
                />
                <span className="text-[13px] text-ink-faint">
                  {fileName || 'Click to choose a .xlsx, .xls, or .csv file'}
                </span>
              </label>
            </div>
            {fileError && <Alert>{fileError}</Alert>}
            <button
              type="button"
              onClick={downloadTemplate}
              className="text-[12px] text-ink-faint hover:text-ink underline underline-offset-2"
            >
              Download a blank template
            </button>
            {fromFile.length > 0 && (
              <p className="text-[12px] text-ink-faint">
                {usedHeader
                  ? 'Matched columns from the header row.'
                  : 'No header row found â€” used the first column as the name and the second as an admission number.'}
              </p>
            )}
          </div>
        )}

        {parsed.length > 0 && (
          <div className="border border-rule rounded-md p-3 max-h-40 overflow-y-auto">
            <span className="eyebrow">Preview, {parsed.length}</span>
            <ul className="mt-2 space-y-1">
              {withDuplicateFlag.slice(0, 30).map((p, i) => (
                <li
                  key={i}
                  className={`text-[13px] ${p.isDuplicate ? 'text-ink-faint' : ''}`}
                >
                  {p.last}
                  {p.last && ', '}
                  {p.first}
                  {p.admission_number && (
                    <span className="text-ink-faint"> &middot; {p.admission_number}</span>
                  )}
                  {p.isDuplicate && (
                    <span className="text-absent"> &middot; already in this class</span>
                  )}
                </li>
              ))}
              {parsed.length > 30 && (
                <li className="text-[12px] text-ink-faint">and {parsed.length - 30} more</li>
              )}
            </ul>
          </div>
        )}

        {duplicateCount > 0 && (
          <div>
            <Alert>
              {duplicateCount} of {parsed.length} match a name or admission number already in
              this class. They will be skipped unless you choose to add them anyway.
            </Alert>
            <label className="flex items-center gap-2.5 mt-2.5 text-[13px] text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={includeDuplicates}
                onChange={(e) => setIncludeDuplicates(e.target.checked)}
              />
              Add them anyway (use this only if they are genuinely different students, e.g. two
              children who share a name)
            </label>
          </div>
        )}

        <Button type="submit" full loading={busy}>
          Add {toSubmit.length > 0 ? toSubmit.length : ''} students
        </Button>
      </form>
    </Modal>
  )
}
