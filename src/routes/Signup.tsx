import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, Field } from '../components/ui'

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setError(null)
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setBusy(false)
    if (error) return setError(error.message)

    // Supabase confirms email by default, which returns a user but no session.
    // Without this branch the screen looks like it did nothing.
    if (!data.session) {
      setSent(true)
      return
    }
    navigate('/')
  }

  return (
    <AuthLayout
      headline={
        <>
          Never wonder
          <br />
          again.
        </>
      }
      sub="Parents link to a child with the code the school provides. Teachers are added by their school."
    >
      <span className="eyebrow">Create account</span>
      <h2 className="text-[24px] mt-1.5 mb-6">Start with your name.</h2>

      {sent && (
        <div className="mb-5 border border-rule-strong bg-brass-wash rounded-md p-4">
          <p className="text-[14px] text-ink font-semibold">Check your email.</p>
          <p className="mt-1.5 text-[13px] text-ink-soft leading-relaxed">
            Your account was created but needs confirming before you can sign in. Open the
            link we sent to {email}.
          </p>
          <p className="mt-2.5 text-[12px] text-ink-faint leading-relaxed">
            Building and want to skip this? In Supabase go to Authentication, Sign In /
            Providers, Email, and turn off Confirm email.
          </p>
        </div>
      )}

      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {error && <Alert>{error}</Alert>}
        <Field
          label="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="pt-1">
          <Button type="submit" full loading={busy}>
            Create account
          </Button>
        </div>
      </form>

      <p className="mt-6 text-[13px] text-ink-faint">
        Already have one?{' '}
        <Link to="/login" className="text-ink underline underline-offset-4 decoration-brass">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
