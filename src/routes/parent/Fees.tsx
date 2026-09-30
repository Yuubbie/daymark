import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Button, Field, Panel } from '../../components/ui'
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
        <span className="eyebrow">Fees</span>
        <h1 className="text-[26px] mt-1">Which term?</h1>
        <p className="mt-2 text-[14px] text-ink-soft max-w-[42ch]">
          Statements are kept per term so last year’s balance does not mix with this one.
        </p>
        <form
          className="mt-6 max-w-md space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field
            label="Term"
            placeholder="e.g. First Term 2026/2027"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            required
          />
          <Button type="submit" disabled={!draft.trim()}>
            Continue
          </Button>
        </form>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Panel title={term} action={
        <button
          onClick={() => {
            setTerm('')
            setDraft('')
          }}
          className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint hover:text-ink"
        >
          Change term
        </button>
      }>
        <ParentChildPicker term={term} />
      </Panel>
    </AppShell>
  )
}
