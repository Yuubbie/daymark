// src/routes/parent/Fees.tsx
//
// Dedicated top-level route for the parent Fees sidebar item, so Fees is
// reachable on its own instead of only via the Assessments picker screen.
// Mirrors routes/parent/Assessments.tsx — same term-entry step, same
// ParentChildPicker underneath, just its own nav destination.
//
// FIX: original version swapped to ParentChildPicker on every keystroke
// (any non-empty term made `!term` false), so it was impossible to finish
// typing the term before the screen changed. Added a draft value + a
// Continue button/Enter key so the switch only happens on submit.

import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import ParentChildPicker from '../../components/ParentChildPicker'

export default function ParentFeesRoute() {
  const [term, setTerm] = useState('')
  const [draft, setDraft] = useState('')

  function submit() {
    if (draft.trim()) setTerm(draft.trim())
  }

  if (!term) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-lg font-semibold mb-3">Fees</h1>
          <label className="text-sm font-medium block mb-1">Term</label>
          <input
            className="w-full border rounded p-2 text-sm mb-3"
            placeholder="e.g. First Term 2026/2027"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="text-sm border rounded px-3 py-1.5 disabled:opacity-40"
          >
            Continue
          </button>
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