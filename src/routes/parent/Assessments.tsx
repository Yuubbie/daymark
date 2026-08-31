// src/routes/parent/Assessments.tsx
//
// Route wrapper for ParentChildPicker.tsx.
//
// FIX (this version): wrapped in <AppShell>, same reason as the teacher
// route — every other page in the app renders inside AppShell for the
// sidebar/nav/Sign-out chrome, and this page was missing it entirely.

import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import ParentChildPicker from '../../components/ParentChildPicker'

export default function ParentAssessmentsRoute() {
  const [term, setTerm] = useState('')

  if (!term) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-lg font-semibold mb-3">Assessments</h1>
          <label className="text-sm font-medium block mb-1">Term</label>
          <input
            className="w-full border rounded p-2 text-sm"
            placeholder="e.g. term_2"
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <ParentChildPicker term={term} />
    </AppShell>
  )
}
