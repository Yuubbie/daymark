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
  deactivateStudent,
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
  const [removeStudent, setRemoveStudent] = useState<{ id: string; name: string } | null>(null)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

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

  async function confirmRemoveStudent() {
    if (!removeStudent) return
    setRemoveBusy(true)
    setRemoveError(null)
    try {
      const { error } = await deactivateStudent(removeStudent.id)
      if (error) throw error
      setRemoveStudent(null)
      void load()
    } catch (e) {
      const err = e as { message?: string }
      setRemoveError(err?.message ?? 'Could not remove this student.')
    } finally {
      setRemoveBusy(false)
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
                      <button
                        onClick={() =>
                          setRemoveStudent({ id: s.id, name: `${s.first_name} ${s.last_name}` })
                        }
                        className="font-mono text-[11px] uppercase tracking-[0.1em] text-absent hover:text-red-700"
                      >
                        Remove
                      </button>
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