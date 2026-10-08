import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, Field } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  function redirectTo() {
    return `${window.location.origin}/auth/callback`
  }

  async function submit() {
    setError(null)
    setResent(false)
    setNeedsConfirm(false)
    if (!isSupabaseConfigured) {
      return setError('This preview has no database connected. Use Try the live demo, or add Supabase keys.')
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      if (/confirm|not confirmed/i.test(error.message)) {
        setNeedsConfirm(true)
        return setError('This email is not confirmed yet. Open the link we sent, or resend it below.')
      }
      return setError(error.message)
    }
    navigate('/')
  }

  async function resend() {
    setError(null)
    setBusy(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo() },
    })
    setBusy(false)
    if (error) return setError(error.message)
    setResent(true)
  }

  return (
    <AuthLayout
      headline={
        <>
          What happened
          <br />
          at school today
        </>
      }
      sub="Attendance, lessons and homework. The day your child actually had, not a summary three months late."
    >
      <span className="eyebrow">Sign in</span>
      <h2 className="text-[24px] mt-1.5 mb-6">Welcome</h2>

      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {error && <Alert>{error}</Alert>}
        {resent && (
          <p className="text-[13px] text-present">Confirmation email sent to {email}. Open it on this device.</p>
        )}
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="pt-1 space-y-2">
          <Button type="submit" full loading={busy}>
            Sign in
          </Button>
          {needsConfirm && (
            <button
              type="button"
              className="w-full text-center text-[12px] underline text-ink"
              onClick={() => void resend()}
              disabled={busy || !email}
            >
              Resend confirmation email
            </button>
          )}
        </div>
      </form>

      <p className="mt-6 text-[13px] text-ink-faint">
        New here?{' '}
        <Link to="/signup" className="text-ink underline underline-offset-4 decoration-brass">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-[13px] text-ink-faint">
        Just looking?{' '}
        <Link to="/demo" className="text-ink underline underline-offset-4 decoration-brass">
          Try the live demo
        </Link>
        {' · '}
        <Link to="/" className="text-ink underline underline-offset-4 decoration-brass">
          Home
        </Link>
      </p>
    </AuthLayout>
  )
}