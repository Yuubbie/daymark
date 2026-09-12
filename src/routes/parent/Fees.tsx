// src/routes/parent/Fees.tsx
//
// Dedicated top-level route for the parent Fees sidebar item, so Fees is
// reachable on its own instead of only via the Assessments picker screen.
// Mirrors routes/parent/Assessments.tsx — same term-entry step, same
// ParentChildPicker underneath, just its own nav destination.

import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import ParentChildPicker from '../../components/ParentChildPicker'

export default function ParentFeesRoute() {
  const [term, setTerm] = useState('')

  if (!term) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-lg font-semibold mb-3">Fees</h1>
          <label className="text-sm font-medium block mb-1">Term</label>
          <input
            className="w-full border rounded p-2 text-sm"
            placeholder="e.g. First Term 2026/2027"
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