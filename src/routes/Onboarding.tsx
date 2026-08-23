import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, Field } from '../components/ui'

/**
 * Reached when a signed in user has no school yet. Two doors: a parent
 * redeems a claim code, a proprietor creates the school. Teachers never
 * land here, the invite trigger attaches them at signup.
 */
export default function Onboarding() {
  const { refresh } = useAuth()
  const [tab, setTab] = useState<'parent' | 'school'>('parent')
  const [code, setCode] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function redeem() {
    setError(null)
    setBusy(true)
    const { error } = await supabase.rpc('redeem_claim_code', {
      p_code: code.trim().toUpperCase(),
    })
    setBusy(false)
    if (error) return setError(error.message)
    await refresh()
  }

  async function createSchool() {
    setError(null)
    setBusy(true)
    const { error } = await supabase.rpc('create_school_and_admin', {
      p_school_name: schoolName.trim(),
      p_full_name: fullName.trim(),
    })
    setBusy(false)
    if (error) return setError(error.message)
    await refresh()
  }

  return (
    <AuthLayout
      headline={
        <>
          One code.
          <br />
          Then you see it all.
        </>
      }
      sub="Your school gives you an eight character code for each child. Enter it once and their day opens up."
    >
      <div className="flex border border-rule-strong rounded-md overflow-hidden mb-6">
        {(['parent', 'school'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              setError(null)
            }}
            className={`flex-1 h-10 text-[11px] font-mono uppercase tracking-[0.12em] transition-colors
              ${tab === t ? 'bg-ink text-ink-invert' : 'bg-surface text-ink-faint hover:text-ink'}`}
          >
            {t === 'parent' ? "I'm a parent" : 'I run a school'}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      {tab === 'parent' ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void redeem()
          }}
        >
          <div>
            <span className="eyebrow">Link your child</span>
            <h2 className="text-[22px] mt-1.5">Enter the code your school gave you.</h2>
          </div>
          <Field
            label="Claim code"
            mono
            required
            placeholder="ABCD1234"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            hint="Eight characters, from your child's teacher or the school office."
          />
          <Button type="submit" full loading={busy}>
            Link my child
          </Button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void createSchool()
          }}
        >
          <div>
            <span className="eyebrow">Set up your school</span>
            <h2 className="text-[22px] mt-1.5">Name the school. You'll be its admin.</h2>
          </div>
          <Field
            label="School name"
            required
            placeholder="Bright Future Academy"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
          />
          <Field
            label="Your name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Button type="submit" full loading={busy}>
            Create school
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
