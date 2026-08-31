// src/routes/teacher/Assessments.tsx
//
// Route wrapper for TeacherAssessments.tsx. Pulls the real teacher_id from
// your auth context, lets the teacher pick which of their assigned
// class/subject combinations they're working on, then renders the
// question-bank/assessment builder for that selection.
//
// ASSUMPTIONS TO VERIFY:
// - useAuth() exposes `profile.id` as the teacher's id (matches your
//   Protected/Landing logic in App.tsx, which already reads profile.role
//   and profile.school_id the same way).
// - class_teachers has columns: teacher_id, class_id, subject (adjust the
//   select below if your actual column names differ).
// - classes has a `name` column for display (adjust if different).
// - No "current term" resolver exists yet in what I've seen, so this
//   starts with a plain text input defaulting to an empty string — swap
//   in your real term source if you have one (e.g. a terms table with
//   an is_current flag).

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import TeacherAssessments from '../../components/TeacherAssessments'

interface ClassSubjectOption {
  class_id: string
  class_name: string
  subject: string
}

export default function TeacherAssessmentsRoute() {
  const { profile } = useAuth()
  const [options, setOptions] = useState<ClassSubjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ClassSubjectOption | null>(null)
  const [term, setTerm] = useState('')

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('class_teachers')
      .select('class_id, subject, classes(name)')
      .eq('teacher_id', profile.id)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const mapped: ClassSubjectOption[] = (data ?? []).map((row: any) => ({
      class_id: row.class_id,
      class_name: row.classes?.name ?? 'Unnamed class',
      subject: row.subject,
    }))

    setOptions(mapped)
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-sm text-gray-400 p-4">Loading your classes...</p>

  if (error) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="rounded bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>
      </div>
    )
  }

  if (options.length === 0) {
    return (
      <div className="max-w-md mx-auto p-4">
        <p className="text-sm text-gray-400">
          You are not assigned to any class/subject yet — ask an admin to assign you first.
        </p>
      </div>
    )
  }

  if (!selected || !term) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <h1 className="text-lg font-semibold">Question bank</h1>

        <div>
          <label className="text-sm font-medium block mb-1">Class / subject</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={selected ? `${selected.class_id}::${selected.subject}` : ''}
            onChange={(e) => {
              const [class_id, subject] = e.target.value.split('::')
              const found = options.find((o) => o.class_id === class_id && o.subject === subject)
              setSelected(found ?? null)
            }}
          >
            <option value="" disabled>
              Select a class and subject
            </option>
            {options.map((o) => (
              <option key={`${o.class_id}::${o.subject}`} value={`${o.class_id}::${o.subject}`}>
                {o.class_name} — {o.subject}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Term</label>
          <input
            className="w-full border rounded p-2 text-sm"
            placeholder="e.g. term_2"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto pt-4 px-4">
        <button onClick={() => setSelected(null)} className="text-sm text-blue-600 mb-2">
          ← Change class/subject
        </button>
      </div>
      <TeacherAssessments
        teacherId={profile!.id}
        classId={selected.class_id}
        subject={selected.subject}
        term={term}
      />
    </div>
  )
}
