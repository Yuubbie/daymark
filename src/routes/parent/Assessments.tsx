// src/routes/parent/Assessments.tsx
//
// Route wrapper for ParentChildPicker.tsx. Thin — the picker component
// already resolves the logged-in parent via supabase.auth.getUser()
// internally, so this file's only job is supplying which term to view.

import { useState } from 'react'
import ParentChildPicker from '../../components/ParentChildPicker'

export default function ParentAssessmentsRoute() {
  const [term, setTerm] = useState('')

  if (!term) {
    return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-lg font-semibold mb-3">Assessments</h1>
        <label className="text-sm font-medium block mb-1">Term</label>
        <input
          className="w-full border rounded p-2 text-sm"
          placeholder="e.g. term_2"
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
    )
  }

  return <ParentChildPicker term={term} />
}
